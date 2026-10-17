// controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const isProd = process.env.NODE_ENV === 'production';

function signToken(user) {
  const payload = { id: user._id, role: user.role, email: user.email, name: user.name };
  return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1d' });
}

/**
 * The session lives ONLY in this httpOnly cookie. The token is never put in a
 * response body, so page scripts (and therefore any injected script) cannot
 * read it, and the console keeps nothing in sessionStorage or localStorage.
 *
 * SameSite: 'none' (production default) lets the console on one origin send
 * the cookie to an API on another; set COOKIE_SAMESITE=lax or strict when both
 * share a site (admin.example.com + api.example.com), which is safer still.
 * Browsers only accept SameSite=None together with Secure.
 */
const SAME_SITE = ['lax', 'strict', 'none'].includes(String(process.env.COOKIE_SAMESITE).toLowerCase())
  ? String(process.env.COOKIE_SAMESITE).toLowerCase()
  : (isProd ? 'none' : 'lax');

const cookieOptions = () => ({
  httpOnly: true,
  secure: isProd || SAME_SITE === 'none',
  sameSite: SAME_SITE,
  path: '/',
});

function setSessionCookie(res, token) {
  res.cookie('token', token, { ...cookieOptions(), maxAge: 24 * 60 * 60 * 1000 });
}

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 200; // bcrypt only reads 72 bytes; this just bounds the work

// Compared against when the email is unknown, so "no such user" takes as long
// as "wrong password" and the response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const asText = (v) => (typeof v === 'string' ? v : '');

export async function registerAdmin(req, res, next) {
  try {
    const body = req.body || {};
    const name = asText(body.name);
    const email = asText(body.email);
    const phone = asText(body.phone);
    const password = asText(body.password);
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Bootstrap rule: the very first admin can self-register so the system
    // can be set up. After that, only an authenticated admin may create
    // another one otherwise this endpoint hands anyone full control.
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0 && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only an existing admin can create new admin accounts' });
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Password is too long' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const saltRounds = isProd ? 12 : 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone || '').trim(),
      password: hash,
      role: 'admin',
    });

    setSessionCookie(res, signToken(user));

    return res.status(201).json({
      message: 'Admin account created',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email = asText(req.body?.email);
    const password = asText(req.body?.password);
    if (!email || !password || password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    setSessionCookie(res, signToken(user));

    return res.status(200).json({
      message: 'Signed in',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
}

export function logout(req, res) {
  res.clearCookie('token', cookieOptions());
  return res.status(200).json({ message: 'Signed out' });
}

export function me(req, res) {
  return res.json({ user: req.user });
}
