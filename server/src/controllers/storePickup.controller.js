import StorePickupOrder from '../models/StorePickupOrder.js';

export async function createStorePickupOrder(req, res) {
  try {
    const { fullName, phone, email, items, total } = req.body;
    if (!fullName || !phone || !email || !Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }
    for (const item of items) {
      if (!item.name || typeof item.qty !== 'number' || typeof item.price !== 'number') {
        return res.status(400).json({ success: false, error: "Each product must have at least name, qty, price" });
      }
    }
    const order = await StorePickupOrder.create({ fullName, phone, email, items, total });
    res.status(201).json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to create store pickup order", message: e.message });
  }
}

export async function getStorePickupOrders(req, res) {
  try {
    const orders = await StorePickupOrder.find().sort({ createdAt: -1 });
    res.json({ success: true, items: orders });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
}

export async function getStorePickupOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await StorePickupOrder.findById(id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch order" });
  }
}

export async function updateStorePickupOrder(req, res) {
  try {
    const { id } = req.params;
    const update = req.body;
    const order = await StorePickupOrder.findByIdAndUpdate(id, update, { new: true });
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update order" });
  }
}

export async function deleteStorePickupOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await StorePickupOrder.findByIdAndDelete(id);
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, message: "Order deleted" });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete order" });
  }
}
