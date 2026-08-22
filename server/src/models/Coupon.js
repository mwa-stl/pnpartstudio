import mongoose, { Schema } from "mongoose";

const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    percent: { type: Number, required: true, min: 1, max: 100 },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    uses: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export function normalizeCouponCode(input = "") {
  return String(input).trim().toUpperCase();
}

const Coupon = mongoose.model("Coupon", CouponSchema);
export default Coupon;
