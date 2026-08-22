// middleware/auth.js
import jwt from 'jsonwebtoken';

function readToken(req) {
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return req.cookies?.token || bearer;
}

/** Rejects the request unless a valid token is present. */
export function authenticateJWT(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * Populates req.user when a valid token is present, but never rejects.
 * Used where a route is conditionally public (e.g. bootstrapping the first
 * admin account) and the controller decides based on who is calling.
 */
export function attachUserIfPresent(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // An invalid token is treated as "anonymous" here, not an error.
    }
  }
  return next();
}

/** Requires an authenticated user with the admin role. */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}
