// src/routes/classes.routes.js
import { Router } from 'express';
import {
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass
} from '../controllers/classes.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public the storefront lists upcoming classes.
router.get('/', listClasses);
router.get('/:id', getClass);

// Admin only.
router.post('/', authenticateJWT, createClass);
router.put('/:id', authenticateJWT, updateClass);
router.delete('/:id', authenticateJWT, deleteClass);

export default router;
