import mongoose from 'mongoose';
import Review from '../models/Review.js';
import { Product } from '../models/Product.js';
import { deleteObject, objectPathFromUrl } from '../services/storage.js';
import { generateInitialsAvatar } from '../lib/avatar.js';

/** How many photos one review may carry. */
const MAX_PHOTOS = 4;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Strips the reviewer's email — it must never reach the storefront — but
 * still uses it to seed a deterministic avatar first. Reviewers never
 * upload a photo of themselves (see Review.js), so this always runs, not
 * just as a fallback for a missing upload.
 */
const publicShape = (doc) => ({
  _id: doc._id,
  product: doc.product,
  name: doc.name,
  rating: doc.rating,
  title: doc.title,
  body: doc.body,
  photos: Array.isArray(doc.photos) ? doc.photos : [],
  avatarUrl: generateInitialsAvatar(doc.email || doc.name),
  createdAt: doc.createdAt,
});

/**
 * GET /api/reviews/product/:productId — public.
 * Returns the reviews plus the aggregate the product page needs, so the
 * storefront does not have to compute an average from a paginated list.
 */
export const listProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const items = await Review.find({ product: productId }).sort({ createdAt: -1 }).limit(limit).lean();

    const [stats] = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } },
    ]);

    // Histogram of 5→1, so the page can draw the distribution bars.
    const buckets = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: '$rating', n: { $sum: 1 } } },
    ]);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    buckets.forEach((b) => { distribution[b._id] = b.n; });

    res.json({
      items: items.map(publicShape),
      count: stats?.count || 0,
      average: stats?.average ? Number(stats.average.toFixed(2)) : 0,
      distribution,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/reviews/summary?ids=a,b,c — public.
 * Ratings for a batch of products in one round trip, for listing pages.
 */
export const summariseReviews = async (req, res) => {
  try {
    const ids = str(req.query.ids)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => mongoose.isValidObjectId(s))
      .slice(0, 100)
      .map((s) => new mongoose.Types.ObjectId(s));

    if (!ids.length) return res.json({ items: {} });

    const rows = await Review.aggregate([
      { $match: { product: { $in: ids } } },
      { $group: { _id: '$product', count: { $sum: 1 }, average: { $avg: '$rating' } } },
    ]);

    const items = {};
    rows.forEach((r) => {
      items[String(r._id)] = { count: r.count, average: Number(r.average.toFixed(2)) };
    });
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/** POST /api/reviews — public (rate limited at the route). */
export const createReview = async (req, res) => {
  try {
    const productId = str(req.body.product);
    const name = str(req.body.name);
    const email = str(req.body.email).toLowerCase();
    const title = str(req.body.title);
    const body = str(req.body.body);
    const rating = Number(req.body.rating);
    // Only URLs the public upload route produced — a reviewer cannot point
    // the site at an arbitrary host.
    const photos = (Array.isArray(req.body.photos) ? req.body.photos : [])
      .map((u) => str(u))
      .filter((u) => u && objectPathFromUrl(u))
      .slice(0, MAX_PHOTOS);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product' });
    }
    if (!name) return res.status(400).json({ message: 'Please add your name' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please add a valid email address' });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please choose a rating between 1 and 5' });
    }
    if (body.length < 4) return res.status(400).json({ message: 'Please write a little more' });

    // Reviewing something that does not exist would leave an orphan row.
    const exists = await Product.exists({ _id: productId });
    if (!exists) return res.status(404).json({ message: 'Product not found' });

    const doc = await Review.create({
      product: productId,
      name: name.slice(0, 60),
      email: email.slice(0, 160),
      rating: Math.round(rating),
      title: title.slice(0, 120),
      body: body.slice(0, 2000),
      photos,
    });

    res.status(201).json(publicShape(doc));
  } catch (err) {
    // The compound unique index is what enforces one review per person.
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this piece.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/reviews — admin only.
 * The moderation queue: every review, newest first, with the product it
 * belongs to and the reviewer's email so fakes can be spotted.
 */
export const listAllReviews = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const filter = {};
    if (mongoose.isValidObjectId(str(req.query.product))) filter.product = str(req.query.product);
    const rating = Number(req.query.rating);
    if (Number.isFinite(rating) && rating >= 1 && rating <= 5) filter.rating = rating;

    const items = await Review.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('product', 'title images category subcategory')
      .lean();

    res.json({ items: items.map((d) => ({ ...d, avatarUrl: generateInitialsAvatar(d.email || d.name) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/** DELETE /api/reviews/:id — admin only. Removes a fake or abusive review. */
export const deleteReview = async (req, res) => {
  try {
    const doc = await Review.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Review not found' });

    // Take the photos with it, or deleting spam would leave its images behind.
    for (const url of doc.photos || []) {
      const objectPath = objectPathFromUrl(url);
      if (!objectPath) continue;
      try { await deleteObject(objectPath); }
      catch (e) { console.error('Bucket delete failed:', e?.message); }
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
