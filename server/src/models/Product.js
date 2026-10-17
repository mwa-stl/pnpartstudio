import mongoose from 'mongoose';
import { mediaCleanupPlugin } from '../services/mediaCleanup.js';

// --- Schema ---
const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, index: true },
    category: { type: String, required: true, trim: true },
    subcategory: { type: String, trim: true, default: '' },
    subsubcategory: { type: String, trim: true, default: '' },
    // Full root-to-leaf category selection; category/subcategory/subsubcategory
    // above mirror its first 3 segments so every existing storefront/checkout
    // read of those fields keeps working unchanged even past 3 levels deep.
    categoryPath: { type: [String], default: [] },
    price: { type: Number, min: 0, required: true },
    salePrice: { type: Number, min: 0, default: null },
    stock: { type: Number, min: 0, default: 0 },

    images: { type: [String], default: [] },
    description: { type: String, default: '' },
    storyBehindArt: { type: String, default: '' },
    published: { type: Boolean, default: true },

    dimensions: { type: String, default: '' },
    color: { type: String, default: '' },

    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    donated: { type: Boolean, default: false },
    contactForPrice: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Files this record stops referencing (replaced, removed, or the record deleted) are removed from the bucket.
productSchema.plugin(mediaCleanupPlugin, { fields: ['images'] });

export const Product = mongoose.model('Product', productSchema);
