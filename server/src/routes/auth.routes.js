// routes/auth.routes.js
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { registerAdmin, login, logout, me } from '../controllers/auth.controller.js';
import { authenticateJWT, attachUserIfPresent } from '../middleware/auth.js';

const router = Router();

// Credential endpoints get a much tighter budget than the global /api limit,
// so an attacker cannot grind passwords at 100 requests per 15 minutes.
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many attempts. Please try again later.' },
});

// `attachUserIfPresent` lets the controller distinguish "first admin ever"
// (allowed) from "someone creating an extra admin" (must already be signed in).
router.post('/admin/register', credentialsLimiter, attachUserIfPresent, registerAdmin);
router.post('/login', credentialsLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticateJWT, me);

export default router;
