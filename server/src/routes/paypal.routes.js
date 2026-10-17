// routes/paypal.routes.js
import { Router } from "express";
import {
  paypalCreateOrderController,
  paypalCaptureOrderController
} from "../controllers/paypal.controller.js";

import { checkoutLimiter } from "../middleware/security.js";

const router = Router();
router.post("/create-order", checkoutLimiter, paypalCreateOrderController);
router.post("/capture-order", checkoutLimiter, paypalCaptureOrderController);

export default router;
