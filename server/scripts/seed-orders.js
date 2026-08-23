/**
 * One-off script: seeds 5 sample orders so the admin Orders list/detail view
 * has real-looking data to check the design against. Safe to run more than
 * once — it always adds 5 new orders (each with a fresh referenceId), it
 * never touches existing ones.
 *
 * Usage: npm run seed:orders   (from server/)
 */
import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import { Product } from '../src/models/Product.js';
import Order from '../src/models/Order.js';

const DAYS_AGO = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const CUSTOMERS = [
  {
    firstName: 'Meera', lastName: 'Nair', email: 'meera.nair@example.com',
    address: { fullName: 'Meera Nair', line1: '214 Willow Creek Dr', city: 'Ballwin', state: 'MO', postalCode: '63021', countryCode: 'US', phone: '+1 636 555 0142' },
    paymentMethod: 'paypal', status: 'delivered', daysAgo: 21,
  },
  {
    firstName: 'Arjun', lastName: 'Rao', email: 'arjun.rao@example.com',
    address: { fullName: 'Arjun Rao', line1: '58 Maple Grove Ave', line2: 'Apt 3B', city: 'St. Louis', state: 'MO', postalCode: '63105', countryCode: 'US', phone: '+1 314 555 0198' },
    paymentMethod: 'paypal', status: 'shipped', daysAgo: 6,
  },
  {
    firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@example.com',
    address: { fullName: 'Priya Sharma', line1: '900 Chesterfield Pkwy', city: 'Chesterfield', state: 'MO', postalCode: '63017', countryCode: 'US', phone: '+1 636 555 0121' },
    paymentMethod: 'cod', status: 'confirmed', daysAgo: 2,
  },
  {
    firstName: 'David', lastName: 'Klein', email: 'david.klein@example.com',
    address: { fullName: 'David Klein', line1: '77 Oakmont Ter', city: 'Kirkwood', state: 'MO', postalCode: '63122', countryCode: 'US', phone: '+1 314 555 0176' },
    paymentMethod: 'paypal', status: 'cancelled', daysAgo: 12,
  },
  {
    firstName: 'Sophia', lastName: 'Turner', email: 'sophia.turner@example.com',
    address: { fullName: 'Sophia Turner', line1: '12 Riverbend Ct', city: 'Wildwood', state: 'MO', postalCode: '63038', countryCode: 'US', phone: '+1 636 555 0155' },
    paymentMethod: 'cod', status: 'pending', daysAgo: 0,
  },
];

/** Falls back to a couple of placeholder line items if the catalogue is empty. */
const PLACEHOLDER_ITEMS = [
  { name: 'Sunset Over the Ghats — Original Painting', price: 185, category: 'All Products', sku: 'placeholder-1' },
  { name: 'Kolam Coaster Set (4)', price: 32, category: 'Indian Products', sku: 'placeholder-2' },
];

async function buildLineItems(products, count) {
  if (products.length === 0) {
    return PLACEHOLDER_ITEMS.slice(0, count).map((p) => ({
      productId: p.sku, name: p.name, qty: 1, price: p.price, total: p.price,
      category: p.category, sku: p.sku, image: '',
    }));
  }
  const picks = [];
  for (let i = 0; i < count; i += 1) {
    picks.push(products[(i * 7 + count) % products.length]);
  }
  return picks.map((p) => {
    const qty = 1 + ((p.title?.length || 3) % 2);
    const price = typeof p.price === 'number' ? p.price : 50;
    return {
      productId: String(p._id), name: p.title, qty, price, total: qty * price,
      category: p.category || '', sku: p.slug || '', image: p.images?.[0] || '',
    };
  });
}

async function run() {
  await connectDB();

  // Excludes donated/contact-for-price items — those carry price 0, which
  // would make a seeded order look like a near-empty $0 purchase.
  const products = await Product.find({ published: true, donated: false, contactForPrice: false, price: { $gt: 0 } }).limit(20).lean();
  console.log(`Found ${products.length} published product(s) to build line items from.`);

  const docs = [];
  for (let i = 0; i < CUSTOMERS.length; i += 1) {
    const c = CUSTOMERS[i];
    const items = await buildLineItems(products, 1 + (i % 3)); // 1-3 items per order
    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const shipping = subtotal > 100 ? 0 : 8.5;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const discount = i === 2 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const grandTotal = Math.round((subtotal + shipping + tax - discount) * 100) / 100;

    const shippingAddress = { ...c.address, email: c.email };

    docs.push({
      customer: { firstName: c.firstName, lastName: c.lastName, email: c.email },
      items,
      shippingAddress,
      billingAddress: shippingAddress,
      totals: { subtotal, tax, shipping, discount, grandTotal, currency: 'USD' },
      paymentMethod: c.paymentMethod,
      status: c.status,
      referenceId: `ORD-${Date.now().toString().slice(-6)}${i}`,
      source: 'seed',
      _createdAt: DAYS_AGO(c.daysAgo),
    });
  }

  const created = [];
  for (const doc of docs) {
    const { _createdAt, ...rest } = doc;
    const order = await Order.create(rest);
    // Order.create() stamps createdAt/updatedAt to "now" the raw driver call
    // bypasses that so the 5 orders actually land on different dates, like a
    // real order history would.
    await Order.collection.updateOne({ _id: order._id }, { $set: { createdAt: _createdAt, updatedAt: _createdAt } });
    created.push({ ref: order.referenceId, status: order.status, total: order.totals.grandTotal, customer: `${order.customer.firstName} ${order.customer.lastName}` });
  }

  console.log(`Seeded ${created.length} orders:`);
  created.forEach((o) => console.log(`  ${o.ref}  ${o.status.padEnd(10)}  $${o.total.toFixed(2).padStart(8)}  ${o.customer}`));

  await import('mongoose').then((m) => m.default.disconnect());
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
