import crypto from "crypto";

// You may want to put this in your .env and PayPal dashboard (Webhook > Show signing secret)
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

export async function paypalWebhookController(req, res, next) {
  const event = req.body;
  const headers = req.headers;

  // Verify request signature (PayPal recommends this)
  try {
    // Step 1: Validate signature using PayPal REST API (recommended)
    const isValid = await verifyWebhookSignature(headers, event);
    if (!isValid) {
      return res.status(400).send("Invalid webhook signature (possible fraud).");
    }
  } catch (e) {
    return res.status(400).send("Webhook signature verification failed.");
  }

  // Step 2: Handle event type
  try {
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        // Payment succeeded, update order in DB!
        // const paypalOrderId = event.resource.supplementary_data.related_ids.order_id;
        // const localOrder = await Order.findOneAndUpdate({ paypalOrderId }, { status: "paid", payStatus: "COMPLETED" });
        break;
      case "PAYMENT.CAPTURE.DENIED":
        // handle denied
        break;
      case "PAYMENT.CAPTURE.REFUNDED":
        // handle refund
        break;
      // ...add more handlers as needed...
      default:
        // Unhandled event type
        break;
    }
    res.status(200).send("Webhook processed");
  } catch (err) {
    next(err);
  }
}

import axios from "axios";
// Securely verify webhook signature with PayPal REST API
async function verifyWebhookSignature(headers, event) {
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
  const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
  const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

  const BASE_URL = PAYPAL_MODE === "live" 
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  // Step 1: Get access token
  const { data: tokenData } = await axios.post(
    `${BASE_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );
  const access_token = tokenData.access_token;

  // Step 2: Call PayPal to verify
  const res = await axios.post(
    `${BASE_URL}/v1/notifications/verify-webhook-signature`,
    {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: event
    },
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    }
  );
  return res.data.verification_status === "SUCCESS";
}
