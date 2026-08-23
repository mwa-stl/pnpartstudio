import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/category.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public the storefront mega menu and admin product form both read this.
router.get('/', listCategories);

// Admin only categories are curated by the studio.
router.post('/', authenticateJWT, createCategory);
router.put('/:id', authenticateJWT, updateCategory);
router.delete('/:id', authenticateJWT, deleteCategory);

export default router;
