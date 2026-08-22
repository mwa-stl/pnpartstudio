import { Router } from 'express';
import { getPromoPopup, updatePromoPopup } from '../controllers/promoPopup.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public — the storefront reads this to build the welcome popup.
router.get('/', getPromoPopup);

// Admin only.
router.put('/', authenticateJWT, updatePromoPopup);

export default router;
