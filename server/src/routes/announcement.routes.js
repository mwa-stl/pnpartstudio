import { Router } from 'express';
import * as a from '../controllers/announcement.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public: what is running right now (banner, nav link, sale pages).
router.get('/active', a.listActive);
router.get('/active/:slug', a.getActiveBySlug);

// Admin only: manage announcements and their special prices.
router.get('/', authenticateJWT, a.listAll);
router.post('/', authenticateJWT, a.create);
router.put('/:id', authenticateJWT, a.update);
router.delete('/:id', authenticateJWT, a.remove);

export default router;
