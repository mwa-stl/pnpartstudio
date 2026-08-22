import { Router } from "express";
import { paypalWebhookController } from "../controllers/paypal.webhook.controller.js";

const router = Router();
router.post("/", paypalWebhookController);

export default router;
