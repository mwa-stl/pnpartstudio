import { rateLimit } from 'express-rate-limit';

/**
 * Drops any key that Mongo would read as an operator ("$ne", "$where") or a
 * path ("a.b") from the request body, however deeply nested. Without it a
 * JSON body such as {"email": {"$ne": null}} reaches a query unchanged.
 */
const clean = (value, depth = 0) => {
  if (depth > 12) return undefined;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(v, depth + 1);
    }
    return out;
  }
  return value;
};

export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF guard for cookie sessions. The session cookie is SameSite=None in
 * production (the console lives on another origin), so the browser will send
 * it on a cross-site request. A state-changing request that authenticates by
 * cookie alone must therefore come from an allowed origin. Requests carrying
 * an Authorization header are immune — a foreign page cannot set one — so
 * they pass untouched.
 */
export function csrfOriginGuard(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (!req.cookies?.token || req.headers.authorization) return next();
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer, 'http://x').origin : '');
    if (origin && allowed.has(origin)) return next();
    return res.status(403).json({ message: 'Cross-site request blocked' });
  };
}

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

/** Placing or paying for an order. */
export const checkoutLimiter = limiter(15 * 60 * 1000, 30, 'Too many checkout attempts. Please try again shortly.');
/** Contact form, custom-order enquiries, newsletter signups, coupon claims. */
export const publicWriteLimiter = limiter(60 * 60 * 1000, 20, 'Too many submissions. Please try again later.');
/** Order tracking and coupon/subscriber lookups — stops reference-id guessing. */
export const lookupLimiter = limiter(15 * 60 * 1000, 40, 'Too many lookups. Please try again shortly.');
