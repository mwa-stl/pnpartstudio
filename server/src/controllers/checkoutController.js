// server/src/controllers/checkoutController.js
import Order from '../models/Order.js';
import { sendMail } from '../utils/mailer.js';

function genOrderId() {
  const ts = Date.now().toString().slice(-8);
  const rnd = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ODR-${ts}${rnd}`;
}

export const placeCodOrder = async (req, res) => {
  try {
    const { cart, customer, summary } = req.body || {};
    const orderId = genOrderId();
    const order = await Order.create({
      orderId,
      method: 'cod',
      status: 'PLACED',
      customer, items: cart, summary,
    });

    const rows = (cart || [])
      .map(i => `<tr><td>${i.title}</td><td>${i.qty}</td><td>${(i.unitPrice).toFixed(2)}</td><td>${(i.lineTotal).toFixed(2)}</td></tr>`)
      .join('');
    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;color:#000">
        <h1 style="margin:0 0 8px">PnP Art Studio</h1>
        <h2 style="margin:0 0 12px">Order Placed (COD): ${order.orderId}</h2>
        <p>Thanks, ${customer?.name || ''}. We'll confirm shipment soon.</p>
        <p><strong>Total:</strong> ${summary?.currency || 'USD'} ${Number(summary?.total || 0).toFixed(2)}</p>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    if (customer?.email) {
      await sendMail(customer.email, `PnP Art Studio: COD order ${order.orderId} placed`, html);
    }

    return res.json({ ok: true, orderId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to place COD order' });
  }
};
