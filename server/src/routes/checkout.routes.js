// src/routes/checkout.routes.js
import express from 'express';

const router = express.Router();

router.post('/cod-order', async (req, res, next) => {
  try {
    // TODO: persist req.body.cart, customer, summary, etc.
    const orderId = `COD-${Date.now()}`;
    return res.status(201).json({ ok: true, orderId });
  } catch (err) {
    next(err);
  }
});

export default router;
