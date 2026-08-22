import mongoose from 'mongoose';

/**
 * A public product review.
 *
 * Anyone can post one — there are no customer accounts on this site — so the
 * defence against abuse is rate limiting at the route, a per-product/email
 * uniqueness rule, and admin deletion. Nothing here is trusted: the display
 * name and body are stored as plain text and escaped at render time.
 */
const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Never sent to the storefront — it exists so one person cannot flood a
    // product with reviews, and so the studio can reply.
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, default: '', maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },

    /** Photos of the piece in the buyer's own space. Capped in the controller. */
    photos: { type: [String], default: [] },
  },
  { timestamps: true }
);

// One review per person per product.
reviewSchema.index({ product: 1, email: 1 }, { unique: true });

// Newest first, scoped to a product — the storefront's only read pattern.
reviewSchema.index({ product: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
