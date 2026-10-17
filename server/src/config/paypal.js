// config/paypal.js
import axios from "axios";

// PAYPAL_API_OVERRIDE exists only so tests can point at a fake PayPal; it is
// ignored in production so a stray value can never redirect real payments.
const BASE_URL =
  (process.env.NODE_ENV !== "production" && process.env.PAYPAL_API_OVERRIDE) ||
  (process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

const http = axios.create({ baseURL: BASE_URL, timeout: 20000 });

let cached = { token: null, expiresAt: 0 };
let inflight = null;

/**
 * OAuth token, cached until a minute before it expires. Fetching a fresh one
 * for every checkout and every webhook is slow and burns PayPal's rate limit.
 */
export async function getPayPalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not set in environment!");
  }
  if (cached.token && Date.now() < cached.expiresAt) return cached.token;
  if (inflight) return inflight;

  inflight = (async () => {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    const { data } = await http.post("/v1/oauth2/token", "grant_type=client_credentials", {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    });
    cached = { token: data.access_token, expiresAt: Date.now() + Math.max(0, (data.expires_in - 60)) * 1000 };
    return cached.token;
  })().finally(() => { inflight = null; });

  return inflight;
}

const money = (n) => Number(n).toFixed(2);

/**
 * Creates the PayPal order from amounts the SERVER computed. `items` and
 * `totals` come out of services/pricing.js, never from the browser.
 */
export async function createPayPalOrder({ items, totals, customer, shippingAddress, returnUrl, cancelUrl, referenceId }) {
  const accessToken = await getPayPalAccessToken();
  const currency = totals.currency;

  const purchase_unit = {
    reference_id: referenceId,
    custom_id: referenceId,
    amount: {
      currency_code: currency,
      value: money(totals.grandTotal),
      breakdown: {
        item_total: { currency_code: currency, value: money(totals.subtotal) },
        shipping: { currency_code: currency, value: money(totals.shipping) },
        tax_total: { currency_code: currency, value: money(totals.tax) },
        discount: { currency_code: currency, value: money(totals.discount) },
      },
    },
    items: items.map((item) => ({
      name: String(item.name).slice(0, 127),
      unit_amount: { value: money(item.price), currency_code: currency },
      quantity: String(item.qty),
      description: String(item.description || "").slice(0, 127),
      category: "PHYSICAL_GOODS",
    })),
  };

  if (shippingAddress) {
    purchase_unit.shipping = {
      name: { full_name: shippingAddress.fullName },
      address: {
        address_line_1: shippingAddress.line1,
        address_line_2: shippingAddress.line2 || undefined,
        admin_area_2: shippingAddress.city,
        admin_area_1: shippingAddress.state,
        postal_code: shippingAddress.postalCode,
        country_code: shippingAddress.countryCode,
      },
    };
  }

  const orderData = {
    intent: "CAPTURE",
    purchase_units: [purchase_unit],
    ...(customer && {
      payer: {
        email_address: customer.email,
        name: { given_name: customer.firstName, surname: customer.lastName },
      },
    }),
    application_context: {
      brand_name: "PnP Art Studio",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  const { data } = await http.post("/v2/checkout/orders", orderData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `create-${referenceId}`,
    },
  });
  return data;
}

export async function capturePayPalOrder(orderId) {
  const accessToken = await getPayPalAccessToken();
  const { data } = await http.post(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture-${orderId}`,
      },
    }
  );
  return data;
}

/** Asks PayPal to verify a webhook delivery's signature. */
export async function verifyWebhookSignature(headers, event) {
  const accessToken = await getPayPalAccessToken();
  const { data } = await http.post(
    "/v1/notifications/verify-webhook-signature",
    {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    },
    { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
  );
  return data.verification_status === "SUCCESS";
}
