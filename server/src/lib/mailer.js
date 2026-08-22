import nodemailer from "nodemailer";

export function createTransport() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const secure = port === 465;

  console.log("[MAILER] Creating transport:");
  console.log(`  Host: ${host}`);
  console.log(`  Port: ${port}`);
  console.log(`  User: ${user}`);
  console.log(`  Secure: ${secure ? "yes" : "no"}`);

  return nodemailer.createTransport({
    pool: true,
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined
  });
}

// Send single coupon code mail
export async function sendCouponCodeMail({ to, subject, html }) {
  try {
    const trans = createTransport();
    const info = await trans.sendMail({
      from: `"PnP Art Studio" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[MAILER] SENT: to ${to} | subject "${subject}" | messageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[MAILER] FAILED for ${to} | subject "${subject}" | error:`, err);
    return false;
  }
}

export function renderNewsletter({ headerHtml = "", bodyHtml = "", footerHtml = "", imageUrl = null }) {
  const hero = imageUrl ? `<img src="${imageUrl}" alt="" style="max-width:100%;display:block;margin:16px auto;border-radius:8px" />` : "";
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
    <div>${headerHtml}</div>
    ${hero}
    <div>${bodyHtml}</div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <div style="font-size:12px;color:#6b7280">${footerHtml}</div>
  </div>`;
}
