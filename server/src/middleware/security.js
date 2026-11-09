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
