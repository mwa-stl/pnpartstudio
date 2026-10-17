import mongoose from 'mongoose';
import { mediaCleanupPlugin } from '../services/mediaCleanup.js';

export const ANNOUNCEMENT_KINDS = ['festival', 'clearance', 'seasonal', 'flash', 'custom'];

/**
 * A time-boxed announcement / sale: a festival offer, a clearance, a flash
 * sale. It carries the copy for the storefront banner and top bar, a window
 * in which it is live, and the products on offer with the special price for
 * each. While live, those prices apply everywhere — product pages, the cart
 * and checkout — and they revert on their own when the window closes.
 */
const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    salePrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    kind: { type: String, enum: ANNOUNCEMENT_KINDS, default: 'festival' },

    /** One line for the strip above the header. */
    message: { type: String, trim: true, maxlength: 200, default: '' },
    /** Short punch for banners and cards: "Up to 40% off". */
    badgeText: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 1500, default: '' },
    bannerImage: { type: String, trim: true, default: '' },
    accent: { type: String, trim: true, default: '#E8340C' },
    ctaLabel: { type: String, trim: true, maxlength: 40, default: 'Shop the sale' },
    /** Text of the animated link in the main navigation. */
    navLabel: { type: String, trim: true, maxlength: 20, default: 'Sale' },

    showInNav: { type: Boolean, default: true },
    showBar: { type: Boolean, default: true },
    showBanner: { type: Boolean, default: true },

    published: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    items: { type: [itemSchema], default: [] },
  },
  { timestamps: true }
);

announcementSchema.plugin(mediaCleanupPlugin, { fields: ['bannerImage'] });

export default mongoose.model('Announcement', announcementSchema);
