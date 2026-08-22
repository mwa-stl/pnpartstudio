import Coupon from "../models/Coupon.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listCoupons = asyncHandler(async (_req, res) => {
  const items = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.json({ items });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const { code, percent, maxUses = 0, expiresAt = null } = req.body || {};
  if (!code || !percent) return res.status(400).json({ message: "code and percent are required" });

  const payload = {
    code: String(code).toUpperCase().trim(),
    percent: Number(percent),
    maxUses: Number(maxUses) || 0,
    expiresAt: expiresAt ? new Date(expiresAt) : null
  };
  const doc = await Coupon.create(payload);
  res.status(201).json(doc);
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const update = {};
  const b = req.body || {};
  if (b.code != null) update.code = String(b.code).toUpperCase().trim();
  if (b.percent != null) update.percent = Number(b.percent);
  if (b.maxUses != null) update.maxUses = Number(b.maxUses) || 0;
  if (b.expiresAt !== undefined) update.expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
  if (b.active != null) update.active = !!b.active;

  const doc = await Coupon.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean(); // runValidators ensures min/max checked [17][8]
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

export const updateCouponStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const next = !!req.body.active;
  const doc = await Coupon.findByIdAndUpdate(id, { $set: { active: next } }, { new: true }).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ _id: doc._id, active: doc.active });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const r = await Coupon.findByIdAndDelete(id).lean();
  if (!r) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const raw = String(req.params.code || req.query.code || "").toUpperCase().trim();
  if (!raw) return res.status(400).json({ valid: false, message: "code is required" });

  const now = new Date();
  const doc = await Coupon.findOne({ code: raw, active: true }).lean();
  if (!doc) return res.json({ valid: false, message: "Invalid code" });
  if (doc.expiresAt && new Date(doc.expiresAt) < now) return res.json({ valid: false, message: "Code expired" });
  if (doc.maxUses > 0 && (doc.uses || 0) >= doc.maxUses) return res.json({ valid: false, message: "Usage limit reached" });
  return res.json({ valid: true, percent: doc.percent, code: doc.code });
});
