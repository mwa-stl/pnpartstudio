import { Router } from 'express';
import {
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide
} from '../controllers/heroSlider.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public the storefront hero carousel.
router.get('/', listHeroSlides);

// Admin only.
router.post('/', authenticateJWT, createHeroSlide);
router.patch('/:id', authenticateJWT, updateHeroSlide);
router.delete('/:id', authenticateJWT, deleteHeroSlide);

export default router;
