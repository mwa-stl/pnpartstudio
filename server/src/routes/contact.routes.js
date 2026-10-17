// src/routes/contact.routes.js
import { Router } from 'express';
import { submitContact } from '../controllers/contactController.js';
import { publicWriteLimiter } from '../middleware/security.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.post('/submit', publicWriteLimiter, submitContact);

export default router;
