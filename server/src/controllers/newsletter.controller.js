import { asyncHandler } from "../utils/asyncHandler.js";
import Subscriber from "../models/Subscriber.js";
import NewsletterCampaign from "../models/NewsletterCampaign.js";
import Coupon from "../models/Coupon.js";
import { createTransport, renderNewsletter, sendCouponCodeMail } from "../lib/mailer.js";
import cron from "node-cron";

// CRON scheduler (for scheduled campaigns)
const scheduledTasks = new Map();

export async function scheduleCampaign(c) {
  const t = scheduledTasks.get(String(c._id));
  if (t) { t.stop(); scheduledTasks.delete(String(c._id)); }
  if (c.schedule.type === "now") return;
  if (c.status !== "scheduled") return;
  let expr;
  if (c.schedule.type === "once" && c.schedule.when) {
    const dt = new Date(c.schedule.when);
    expr = `${dt.getMinutes()} ${dt.getHours()} ${dt.getDate()} ${dt.getMonth() + 1} *`;
  } else if (c.schedule.type === "weekly" && c.schedule.weekly) {
    const [h, m] = (c.schedule.weekly.time || "09:00").split(":").map(Number);
    expr = `${m} ${h} * * ${c.schedule.weekly.dow}`;
  } else if (c.schedule.type === "monthly" && c.schedule.monthly) {
    const [h, m] = (c.schedule.monthly.time || "09:00").split(":").map(Number);
    expr = `${m} ${h} ${c.schedule.monthly.dom} * *`;
  } else if (c.schedule.type === "cron" && c.schedule.cron) {
    expr = c.schedule.cron;
  } else {
    return;
  }
  const task = cron.schedule(expr, async () => {
    await sendCampaignNow(c._id);
    if (c.schedule.type === "once") {
      await NewsletterCampaign.findByIdAndUpdate(c._id, { $set: { status: "sent", lastSentAt: new Date() } });
      task.stop();
      scheduledTasks.delete(String(c._id));
    }
  });
  scheduledTasks.set(String(c._id), task);
}

// Robust, logged delivery to all subscribers
async function deliver(subject, html) {
  const trans = createTransport();
  const batchSize = 250;
  let skip = 0, sent = 0, fail = 0;
  const from = `"PnP Art Studio" <${process.env.EMAIL_USER}>`;
  for (;;) {
    const batch = await Subscriber.find().sort({ _id: 1 }).skip(skip).limit(batchSize).lean();
    if (!batch.length) break;
    const jobs = batch.map((s) =>
      trans.sendMail({
        from,
        to: s.email,
        subject,
        html
      })
      .then(info => {
        sent++;
        console.log(`[MAILER] SENT: to ${s.email} (${info.messageId})`);
      })
      .catch(err => {
        fail++;
        console.error(`[MAILER] FAILED: to ${s.email} | error: ${err.message}`);
      })
    );
    await Promise.allSettled(jobs);
    skip += batch.length;
  }
  console.log(`[MAILER] Batch delivery report: SENT: ${sent}, FAILED: ${fail}`);
  return { sent, fail };
}

export const checkSubscriber = async (req, res) => {
  let email = (req.query.email || "").toLowerCase().trim();
  if (!email) return res.status(400).json({ exists: false, error: "No email provided" });
  const exists = await Subscriber.findOne({ email });
  res.json({ exists: !!exists });
};

export const subscribe = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  if (!/.+@.+\..+/.test(email)) return res.status(400).json({ message: "Invalid email" });
  await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
  res.status(201).json({ ok: true });
});

export const listSubscribers = asyncHandler(async (_req, res) => {
  const items = await Subscriber.find().sort({ createdAt: -1 }).lean();
  res.json({ items });
});

export const exportSubscribers = asyncHandler(async (_req, res) => {
  const items = await Subscriber.find().sort({ createdAt: -1 }).lean();
  const rows = ["email,createdAt", ...items.map(i => `${i.email},${i.createdAt ? new Date(i.createdAt).toISOString() : ""}`)];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="subscribers.csv"');
  res.send(rows.join("\n"));
});

async function sendCampaignNow(id) {
  const c = await NewsletterCampaign.findById(id).lean();
  if (!c) return;
  const html = renderNewsletter(c);
  const { sent, fail } = await deliver(c.subject, html);
  await NewsletterCampaign.findByIdAndUpdate(id, {
    $inc: { sentCount: sent, failCount: fail },
    $set: { lastSentAt: new Date(), status: "sent" }
  });
  return { sent, fail };
}

export const createCampaign = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const schedule = payload.schedule || { type: "now" };
  const doc = await NewsletterCampaign.create({
    subject: payload.subject,
    headerHtml: payload.headerHtml || "",
    bodyHtml: payload.bodyHtml || "",
    footerHtml: payload.footerHtml || "",
    imageUrl: payload.imageUrl || null,
    schedule,
    status: schedule.type === "now" ? "sent" : "scheduled"
  });
  if (schedule.type === "now") {
    const result = await sendCampaignNow(doc._id);
    return res.json({ ...result, id: doc._id });
  } else {
    await scheduleCampaign(doc);
    return res.status(201).json({ id: doc._id, status: "scheduled" });
  }
});

export const listCampaigns = asyncHandler(async (_req, res) => {
  const items = await NewsletterCampaign.find().sort({ createdAt: -1 }).lean();
  res.json({ items });
});

export const sendNowById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const result = await sendCampaignNow(id);
  res.json(result || { sent: 0, fail: 0 });
});

export const scheduleById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const schedule = req.body?.schedule;
  const updated = await NewsletterCampaign.findByIdAndUpdate(id, { $set: { schedule, status: "scheduled" } }, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: "Not found" });
  await scheduleCampaign(updated);
  res.json({ id, status: "scheduled" });
});

// Coupon generation helper
async function createUniqueCoupon(percent = 35) {
  let code, tries = 0;
  while (tries < 10) {
    code = "PNPNEW" + (Math.floor(10000 + Math.random() * 90000));
    if (!(await Coupon.exists({ code }))) {
      const doc = await Coupon.create({ code, percent, maxUses: 1, uses: 0, active: true });
      return doc;
    }
    tries++;
  }
  throw new Error("Could not generate unique code");
}

// Coupon claim API
export const claimCoupon = async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    if (!/^([a-z0-9._%+-]+)@(gmail\.com|yahoo\.com|hotmail\.com)$/i.test(email)) {
      return res.status(400).json({ message: "Enter a valid gmail, yahoo or hotmail address." });
    }
    const exists = await Subscriber.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "You have already claimed new customer discount coupon!" });
    }
    await Subscriber.create({ email });
    let couponDoc;
    try {
      couponDoc = await createUniqueCoupon(35);
    } catch (err) {
      return res.status(500).json({ message: "Could not generate coupon code. Please try again." });
    }
    await sendCouponCodeMail({
      to: email,
      subject: "Your 35% OFF Coupon from PNP Art Studio",
      html: `<h2>Welcome to PNP Art Studio!</h2>
             <p>Thank you for signing up. Here is your exclusive new customer coupon code:</p>
             <div style="padding: 14px; background: #eee; border-radius: 6px; margin: 18px 0; font-size: 1.5em; text-align: center; font-weight: bold;">${couponDoc.code}</div>
             <p>Use this code during checkout to claim your 35% discount.</p>
             <hr />
             <small>If you have questions or need help, reply to this email!</small>`
    });
    res.status(201).json({ ok: true, code: couponDoc.code });
  } catch (err) {
    console.error("claimCoupon error:", err);
    res.status(500).json({ message: err.message || "Server Error" });
  }
};
