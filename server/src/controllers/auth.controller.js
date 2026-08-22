// controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const isProd = process.env.NODE_ENV === 'production';

function signToken(user) {
  const payload = { id: user._id, role: user.role, email: user.email, name: user.name };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function setSessionCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,                 // required if SameSite=None (cross-site)
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

const MIN_PASSWORD_LENGTH = 12;

export async function registerAdmin(req, res, next) {
  try {
    const { name, email, phone = '', password } = req.body || {};
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

    if (String(password).length < MIN_PASSWORD_LENGTH) {
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

    const accessToken = signToken(user);
    setSessionCookie(res, accessToken);

    return res.status(201).json({
      message: 'Admin account created',
      accessToken,
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
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user /* || user.role !== 'admin' */) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = signToken(user);
    setSessionCookie(res, accessToken);

    return res.status(200).json({
      message: 'Signed in',
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
}

export function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
  return res.status(200).json({ message: 'Signed out' });
}

export function me(req, res) {
  return res.json({ user: req.user });
}
