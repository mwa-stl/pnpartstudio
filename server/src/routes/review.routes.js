import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  listProductReviews,
  summariseReviews,
  createReview,
  listAllReviews,
  deleteReview,
} from '../controllers/review.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

/* Posting is open to anyone, so it gets a much tighter budget than the global
   /api limit — enough for a genuine reviewer, not enough to spam a product. */
const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reviews submitted. Please try again later.' },
});

// Admin — declared before `/product/:productId` cannot shadow it, but keep
// the bare path first for clarity.
router.get('/', authenticateJWT, listAllReviews);
router.delete('/:id', authenticateJWT, deleteReview);

// Public.
router.get('/summary', summariseReviews);
router.get('/product/:productId', listProductReviews);
router.post('/', writeLimiter, createReview);

export default router;
