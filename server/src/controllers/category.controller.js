import { Category, DEFAULT_CATEGORY_TREE } from '../models/Category.js';

const clean = (s = '') => String(s).trim();

/**
 * Trims, drops blanks, and de-dupes case-insensitively at one level, then
 * recurses into each node's own children so the whole tree is sanitized
 * regardless of how deep it goes.
 */
function sanitizeNodes(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const name = clean(raw?.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, disabled: !!raw.disabled, children: sanitizeNodes(raw.children) });
  }
  return out;
}

async function nameClashes(name, excludeId) {
  const query = { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  if (excludeId) query._id = { $ne: excludeId };
  return Category.exists(query);
}

export async function listCategories(req, res, next) {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      try {
        await Category.insertMany(DEFAULT_CATEGORY_TREE, { ordered: false });
      } catch (e) {
        // Duplicate-key race from a concurrent first-read seeding at the same
        // time is expected here fall through and just serve what's there.
        if (e?.code !== 11000) throw e;
      }
    }
    const items = await Category.find().sort({ createdAt: 1 });
    return res.json({ items });
  } catch (e) { return next(e); }
}

export async function createCategory(req, res, next) {
  try {
    const name = clean(req.body?.name);
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    if (await nameClashes(name)) return res.status(409).json({ message: 'A category with this name already exists' });

    const doc = await Category.create({
      name,
      children: sanitizeNodes(req.body?.children),
    });
    return res.status(201).json(doc);
  } catch (e) { return next(e); }
}

export async function updateCategory(req, res, next) {
  try {
    const name = clean(req.body?.name);
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    if (await nameClashes(name, req.params.id)) return res.status(409).json({ message: 'A category with this name already exists' });

    const doc = await Category.findByIdAndUpdate(
      req.params.id,
      { name, children: sanitizeNodes(req.body?.children) },
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    return res.json(doc);
  } catch (e) { return next(e); }
}

export async function deleteCategory(req, res, next) {
  try {
    // Deleting a category never touches existing Product docs they keep
    // their stored category/subcategory strings as-is (see Category.js plan
    // notes); this is intentional, not a gap to "fix" later.
    const doc = await Category.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Deleted' });
  } catch (e) { return next(e); }
}
