import mongoose from 'mongoose';

// --- Category Logic ---
const ALL_PRODUCTS_SUBCATEGORIES = [
  'Paintings',
  'Holiday gifts',
  'Landscapes',
  'Modern art',
  'Name sign',
  'Limited editions',
  'Pencil sketches',
  'Digital prints'
];
const INDIAN_PRODUCTS_SUBCATEGORIES = [
  'Indian god paintings',
  'Musical Art paintings',
  'Return gifts'
];
const RETURN_GIFTS_SUBCATEGORIES = [
  'Kolam coasters',
  'Kolam peetham',
  'Traditional magnets',
  'Trays',
  'Diya holders'
];
const MAIN_CATEGORIES = ['All Products', 'Indian Products'];

export const PRODUCT_CONSTANTS = {
  MAIN_CATEGORIES,
  ALL_PRODUCTS_SUBCATEGORIES,
  INDIAN_PRODUCTS_SUBCATEGORIES,
  RETURN_GIFTS_SUBCATEGORIES
};

// --- Schema ---
const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, index: true },
    category: { type: String, enum: MAIN_CATEGORIES, required: true },
    subcategory: { type: String, trim: true, default: '' },
    subsubcategory: { type: String, trim: true, default: '' },
    price: { type: Number, min: 0, required: true },
    salePrice: { type: Number, min: 0, default: null },
    stock: { type: Number, min: 0, default: 0 },

    images: { type: [String], default: [] },
    description: { type: String, default: '' },
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

// --- Custom Validation ---
productSchema.path('subcategory').validate(function (value) {
  if (!this.category) return true;
  if (this.category === 'All Products')
    return value && ALL_PRODUCTS_SUBCATEGORIES.includes(value);
  if (this.category === 'Indian Products')
    return value && INDIAN_PRODUCTS_SUBCATEGORIES.includes(value);
  return true;
}, 'Invalid subcategory for selected category');

productSchema.path('subsubcategory').validate(function (value) {
  if (this.category === 'Indian Products' && this.subcategory === 'Return gifts') {
    return value && RETURN_GIFTS_SUBCATEGORIES.includes(value);
  }
  return true;
}, 'Invalid return gift selection');

export const Product = mongoose.model('Product', productSchema);
