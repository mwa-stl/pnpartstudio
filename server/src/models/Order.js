// models/Order.js
import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema(
  {
    productId: { type: String },
    name: { type: String },
    qty: { type: Number },
    price: { type: Number },
    total: { type: Number },
    variant: { type: String },
    description: { type: String },
    image: { type: String },
    category: { type: String },
    sku: { type: String },
    brand: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema(
  {
    fullName: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    countryCode: String,
    phone: String,
    email: String,
  },
  { _id: false }
);

const TotalsSchema = new mongoose.Schema(
  {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: Number,
    grandTotal: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    customer: {
      firstName: String,
      lastName: String,
      email: String,
    },
    items: [ItemSchema],
    shippingAddress: AddressSchema,
    billingAddress: AddressSchema,
    totals: TotalsSchema,
    paymentMethod: { type: String, default: 'cod' },
    paypalOrderId: { type: String },
    status: { type: String, default: 'pending' },
    paypalCaptureResponse: { type: mongoose.Schema.Types.Mixed },
    captures: { type: [mongoose.Schema.Types.Mixed], default: [] },
    referenceId: { type: String },
    source: { type: String, default: 'website' },
    webhooks: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Order', OrderSchema);
