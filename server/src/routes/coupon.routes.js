import { Router } from "express";
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  updateCouponStatus,
  deleteCoupon,
  validateCoupon
} from "../controllers/coupon.controller.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = Router();

// Public checkout validates a code the customer typed.
router.get("/validate/:code", validateCoupon);

// Admin only. Without this, anyone could mint themselves a 100%-off coupon
// or read every existing code.
router.get("/", authenticateJWT, listCoupons);
router.post("/", authenticateJWT, createCoupon);
router.patch("/:id", authenticateJWT, updateCoupon);
router.patch("/:id/status", authenticateJWT, updateCouponStatus);
router.delete("/:id", authenticateJWT, deleteCoupon);

export default router;
