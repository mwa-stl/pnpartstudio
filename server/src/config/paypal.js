// config/paypal.js
import axios from "axios";

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_MODE,
} = process.env;

const BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not set in environment!");
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const { data } = await axios.post(
    `${BASE_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );
  return data.access_token;
}

export async function createPayPalOrder({ items, customer, shippingAddress, totals, returnUrl, cancelUrl }) {
  const accessToken = await getPayPalAccessToken();

  // Accept precision: support 'qty' fallback for all items
  const safeItems = (items || []).map(item => ({
    ...item,
    quantity: item.qty || item.quantity || 1,
    name: item.name || item.title || 'Product',
    description: item.description || "",
    price: Number(item.price),
  }));

  // Support cart/total fallback (grandTotal or on-the-fly computation)
  const totalAmount = totals?.grandTotal
    ? (Number(totals.grandTotal).toFixed(2))
    : safeItems.reduce((sum, item) => sum + (item.price * Number(item.quantity)), 0).toFixed(2);

  const breakdown = totals
    ? {
      item_total: {
        currency_code: totals.currency || "USD",
        value: safeItems
          .reduce((sum, i) => sum + (i.price * Number(i.quantity)), 0)
          .toFixed(2)
      },
      shipping: {
        currency_code: totals.currency || "USD",
        value: totals.shipping ? Number(totals.shipping).toFixed(2) : "0.00"
      },
      tax_total: {
        currency_code: totals.currency || "USD",
        value: totals.tax ? Number(totals.tax).toFixed(2) : "0.00"
      },
      discount: {
        currency_code: totals.currency || "USD",
        value: totals.discount ? Number(totals.discount).toFixed(2) : "0.00"
      }
    }
    : undefined;

  const purchase_units = [
    {
      amount: {
        currency_code: totals?.currency || "USD",
        value: totalAmount,
        ...(breakdown && { breakdown })
      },
      items: safeItems.map(item => ({
        name: item.name,
        unit_amount: { value: Number(item.price).toFixed(2), currency_code: totals?.currency || "USD" },
        quantity: String(item.quantity),
        description: item.description,
        category: "PHYSICAL_GOODS"
      })),
      ...(shippingAddress && {
        shipping: {
          name: { full_name: shippingAddress.fullName || `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}` },
          address: {
            address_line_1: shippingAddress.line1 || shippingAddress.address1,
            address_line_2: shippingAddress.line2 || shippingAddress.address2 || "",
            admin_area_2: shippingAddress.city,
            admin_area_1: shippingAddress.state,
            postal_code: shippingAddress.postalCode || shippingAddress.zip,
            country_code: shippingAddress.countryCode || shippingAddress.country || "US"
          }
        }
      })
    }
  ];

  const orderData = {
    intent: "CAPTURE",
    purchase_units,
    ...(customer && {
      payer: {
        email_address: customer.email,
        name: {
          given_name: customer.firstName,
          surname: customer.lastName
        }
      }
    }),
    application_context: {
      brand_name: "PnP Art Studio",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl
    }
  };

  const { data } = await axios.post(
    `${BASE_URL}/v2/checkout/orders`, orderData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );
  return data;
}

export async function capturePayPalOrder(orderId) {
  const accessToken = await getPayPalAccessToken();
  const { data } = await axios.post(
    `${BASE_URL}/v2/checkout/orders/${orderId}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );
  return data;
}
