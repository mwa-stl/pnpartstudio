import { Router } from 'express';
import { getSiteSettings, updateSiteSettings } from '../controllers/siteSettings.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public — the footer, contact page and checkout all read these details.
router.get('/', getSiteSettings);

// Admin only.
router.put('/', authenticateJWT, updateSiteSettings);

export default router;
