import { Router } from 'express';
import { getArtistProfile, updateArtistProfile } from '../controllers/artistProfile.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public read the storefront home and about pages both render this.
router.get('/', getArtistProfile);

// Admin only.
router.put('/', authenticateJWT, updateArtistProfile);

export default router;
