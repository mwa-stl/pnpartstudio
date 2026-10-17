import mongoose from 'mongoose';

const StorePickupOrderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  qty: Number,
  price: Number,
  total: Number,
  variant: String,
  description: String,
  image: String,
  category: String,
  sku: String,
  brand: String,
  meta: mongoose.Schema.Types.Mixed
}, { _id: false });


// What this order took off stock, and whether it has been given back — see services/inventory.js.
const StockTakenSchema = new mongoose.Schema({ productId: String, qty: Number, name: String }, { _id: false });

const StorePickupOrderSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone:    { type: String, required: true, trim: true },
  email:    { type: String, required: true, trim: true },
  items: { type: [StorePickupOrderItemSchema], required: true },
  total: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  // Pickup orders reserve stock when placed; a cancellation gives it back.
  stockTaken: { type: [StockTakenSchema], default: [] },
  stockRestored: { type: Boolean, default: false },
  stockIssue: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('StorePickupOrder', StorePickupOrderSchema);
