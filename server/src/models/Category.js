import mongoose from 'mongoose';

/**
 * A category node, recursively self-referencing so the tree can nest to any
 * depth — a subcategory can itself have subcategories, and so on. This is
 * Mongoose's documented pattern for a recursive embedded tree: define the
 * schema, then add a `children` field typed as an array of itself.
 */
const nodeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    disabled: { type: Boolean, default: false },
  },
  { _id: true }
);
nodeSchema.add({ children: { type: [nodeSchema], default: [] } });

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    children: { type: [nodeSchema], default: [] },
  },
  { timestamps: true }
);

/**
 * The catalogue tree as it existed hardcoded in code before categories became
 * admin-managed. Seeded into an empty collection on first read so existing
 * products (already carrying these exact strings) keep resolving correctly.
 */
export const DEFAULT_CATEGORY_TREE = [
  {
    name: 'All Products',
    children: [
      { name: 'Paintings', children: [] },
      { name: 'Holiday gifts', children: [] },
      { name: 'Landscapes', children: [] },
      { name: 'Modern art', children: [] },
      { name: 'Name sign', children: [] },
      { name: 'Limited editions', children: [] },
      { name: 'Pencil sketches', children: [] },
      { name: 'Digital prints', disabled: true, children: [] },
    ],
  },
  {
    name: 'Indian Products',
    children: [
      { name: 'Indian god paintings', children: [] },
      { name: 'Musical Art paintings', children: [] },
      {
        name: 'Return gifts',
        children: [
          { name: 'Kolam coasters', children: [] },
          { name: 'Kolam peetham', children: [] },
          { name: 'Traditional magnets', children: [] },
          { name: 'Trays', children: [] },
          { name: 'Diya holders', children: [] },
        ],
      },
    ],
  },
];

export const Category = mongoose.model('Category', categorySchema);
