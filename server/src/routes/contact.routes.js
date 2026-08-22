// src/routes/contact.routes.js
import { Router } from 'express';
import { submitContact } from '../controllers/contactController.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.post('/submit', submitContact);

export default router;
