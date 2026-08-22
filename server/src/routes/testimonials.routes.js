import { Router } from 'express';
import { createTestimonial, getTestimonials, updateTestimonial, deleteTestimonial } from '../controllers/testimonials.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public the storefront testimonials carousel.
router.get('/', getTestimonials);

// Admin only. Testimonials are curated by the studio, not submitted by the
// public, so creation is protected too.
router.post('/', authenticateJWT, createTestimonial);
router.put('/:id', authenticateJWT, updateTestimonial);
router.delete('/:id', authenticateJWT, deleteTestimonial);

export default router;
