import Order from "../models/Order.js";
import { verifyWebhookSignature } from "../config/paypal.js";
import { onOrderPaid, restockOrder } from "../services/inventory.js";

export async function paypalWebhookController(req, res, next) {
  const event = req.body;

  // Fail closed: without a webhook id nothing can be verified.
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    console.error("[PayPal webhook] PAYPAL_WEBHOOK_ID is not set; rejecting delivery");
    return res.status(503).send("Webhook not configured.");
  }

  try {
    const isValid = await verifyWebhookSignature(req.headers, event);
    if (!isValid) return res.status(400).send("Invalid webhook signature.");
  } catch (e) {
    console.error("[PayPal webhook] verification error:", e?.response?.data || e.message);
    return res.status(400).send("Webhook signature verification failed.");
  }

  try {
    const resource = event?.resource || {};
    const paypalOrderId = resource.supplementary_data?.related_ids?.order_id;
    const order = paypalOrderId ? await Order.findOne({ paypalOrderId }) : null;

    if (order) {
      const record = { event_type: event.event_type, id: event.id, receivedAt: new Date() };
      switch (event.event_type) {
        case "PAYMENT.CAPTURE.COMPLETED": {
          // Safety net for a customer who closed the tab before the browser
          // called capture-order. Same amount check as the capture route.
          const matches =
            Number(resource.amount?.value).toFixed(2) === Number(order.totals.grandTotal).toFixed(2) &&
            resource.amount?.currency_code === order.totals.currency;
          if (matches && order.status === "awaiting_payment") {
            const flipped = await Order.updateOne({ _id: order._id, status: "awaiting_payment" }, { $set: { status: "paid" } });
            if (flipped.modifiedCount) await onOrderPaid(order);
          }
          break;
        }
        case "PAYMENT.CAPTURE.DENIED":
          if (order.status === "awaiting_payment") await Order.updateOne({ _id: order._id }, { $set: { status: "failed" } });
          break;
        case "PAYMENT.CAPTURE.REFUNDED":
        case "PAYMENT.CAPTURE.REVERSED":
          await Order.updateOne({ _id: order._id }, { $set: { status: "refunded" } });
          await restockOrder(Order, order._id);
          break;
        default:
          break;
      }
      await Order.updateOne({ _id: order._id }, { $push: { webhooks: record } });
    }
    res.status(200).send("Webhook processed");
  } catch (err) {
    next(err);
  }
}
