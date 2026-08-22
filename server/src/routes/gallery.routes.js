import { Router } from 'express';
import { listGallery, createGalleryItems, updateGalleryItem, deleteGalleryItem } from '../controllers/gallery.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public the storefront gallery page.
router.get('/', listGallery);

// Admin only.
router.post('/', authenticateJWT, createGalleryItems);
router.patch('/:id', authenticateJWT, updateGalleryItem);
router.delete('/:id', authenticateJWT, deleteGalleryItem);

export default router;
