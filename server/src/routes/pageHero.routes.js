import { Router } from 'express';
import { listPageHeroes, getPageHero, updatePageHero } from '../controllers/pageHero.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public — each storefront page reads its own masthead.
router.get('/', listPageHeroes);
router.get('/:key', getPageHero);

// Admin only.
router.put('/:key', authenticateJWT, updatePageHero);

export default router;
