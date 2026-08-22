import { Router } from "express";
import { capturePayPalOrder } from "../config/paypal.js";

const router = Router();

router.get('/complete-order', async (req, res, next) => {
  try {
    const orderId = req.query?.token;
    if (!orderId) return res.status(400).send('Missing token');
    await capturePayPalOrder(orderId);
    return res.status(200).send('Order captured successfully');
  } catch (err) {
    next(err);
  }
});

router.get('/cancel-order', (req, res) => {
  return res.status(200).send('Order canceled');
});

export default router;
