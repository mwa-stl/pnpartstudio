import { Router } from "express";
import {
  subscribe, listSubscribers, exportSubscribers,
  createCampaign, listCampaigns, sendNowById, scheduleById, checkSubscriber, claimCoupon
} from "../controllers/newsletter.controller.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = Router();

// Public storefront signup flows.
router.post("/subscribe", subscribe);
router.get("/subscriber-exists", checkSubscriber);
router.post("/claim-coupon", claimCoupon);

// Admin only the subscriber list and CSV export are personal data, and
// campaign endpoints send real email to real people.
router.get("/subscribers", authenticateJWT, listSubscribers);
router.get("/subscribers/export", authenticateJWT, exportSubscribers);
router.get("/campaigns", authenticateJWT, listCampaigns);
router.post("/campaigns", authenticateJWT, createCampaign);
router.post("/campaigns/:id/send-now", authenticateJWT, sendNowById);
router.patch("/campaigns/:id/schedule", authenticateJWT, scheduleById);

export default router;
