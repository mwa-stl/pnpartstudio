// routes/paypal.routes.js
import { Router } from "express";
import {
  paypalCreateOrderController,
  paypalCaptureOrderController
} from "../controllers/paypal.controller.js";

const router = Router();
router.post("/create-order", paypalCreateOrderController);
router.post("/capture-order", paypalCaptureOrderController);

export default router;
