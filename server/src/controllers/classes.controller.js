// controllers/classes.controller.js
import { ClassModel, CLASS_CONSTANTS } from '../models/Class.js';

const str = (v, fallback = '') => (typeof v === 'string' ? v.trim() : fallback);

/** Trimmed, non-empty strings only — blank rows in the admin form are dropped. */
const strList = (v) => (Array.isArray(v) ? v.map((s) => str(s)).filter(Boolean) : []);

const objList = (v, keys) =>
  Array.isArray(v)
    ? v
        .map((row) => Object.fromEntries(keys.map((k) => [k, str(row?.[k])])))
        .filter((row) => keys.some((k) => row[k]))
    : [];

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Basic payload validation aligned with UI rules
function validate(b = {}) {
  const errors = {};
  if (!b.title || !String(b.title).trim()) errors.title = 'Title is required';
  if (!b.mode || !CLASS_CONSTANTS.MODES.includes(b.mode)) errors.mode = 'Invalid mode';
  if (!b.startDate) errors.startDate = 'Start date is required';
  const dw = Number(b.durationWeeks);
  if (!Number.isFinite(dw) || dw < 1) errors.durationWeeks = 'Duration must be >= 1 week';
  const seats = Number(b.seats);
  if (!Number.isFinite(seats) || seats < 1) errors.seats = 'Seats must be >= 1';
  const price = b.price !== undefined && b.price !== '' ? Number(b.price) : 0;
  if (!Number.isFinite(price) || price < 0) errors.price = 'Price must be a non-negative number';
  if (!b.level || !CLASS_CONSTANTS.LEVELS.includes(b.level)) errors.level = 'Invalid level';
  return errors;
}

/**
 * Whitelists the payload. Every field the storefront renders is named here,
 * so an unexpected key in the request body can never reach the document.
 */
function buildPayload(b = {}) {
  return {
    title: str(b.title),
    summary: str(b.summary),
    mode: b.mode || 'Online',
    level: b.level || 'Beginner',
    cover: str(b.cover),
    published: b.published === true || b.published === 'true',

    startDate: str(b.startDate),
    endDate: str(b.endDate),
    time: str(b.time),
    schedule: str(b.schedule),
    durationWeeks: Math.max(1, num(b.durationWeeks, 4)),
    sessionCount: Math.max(0, num(b.sessionCount, 0)),
    sessionLength: str(b.sessionLength),

    seats: Math.max(1, num(b.seats, 10)),
    price: Math.max(0, num(b.price, 0)),
    location: str(b.location),
    ageGroup: str(b.ageGroup),
    language: str(b.language),
    instructor: str(b.instructor),
    bookingUrl: str(b.bookingUrl),

    description: str(b.description),
    overview: strList(b.overview),
    highlights: strList(b.highlights),
    learn: strList(b.learn),
    materials: strList(b.materials),
    requirements: strList(b.requirements),
    syllabus: objList(b.syllabus, ['label', 'title', 'body']),
    faqs: objList(b.faqs, ['q', 'a']),
    gallery: strList(b.gallery),
  };
}

// GET /api/classes?published=true|false
export async function listClasses(req, res, next) {
  try {
    const { published } = req.query;
    const q = {};
    if (published === 'true') q.published = true;
    if (published === 'false') q.published = false;
    const items = await ClassModel.find(q).sort({ createdAt: -1 });
    return res.json({ items });
  } catch (error) {
    return next(error); // Pass errors to Express error handler
  }
}

export async function getClass(req, res, next) {
  try {
    const doc = await ClassModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Class not found' });
    return res.json(doc);
  } catch (error) {
    // A malformed id is a bad request, not a server fault.
    if (error?.name === 'CastError') return res.status(404).json({ message: 'Class not found' });
    return next(error);
  }
}

export async function createClass(req, res, next) {
  try {
    const b = req.body || {};
    const errs = validate(b);

    // Return 400 for validation errors (client error)
    if (Object.keys(errs).length) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errs
      });
    }

    const doc = await ClassModel.create(buildPayload(b));
    return res.status(201).json(doc);
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    return next(error);
  }
}

export async function updateClass(req, res, next) {
  try {
    const b = req.body || {};
    const errs = validate(b);

    // Only complain about fields the caller actually sent.
    const relevantErrors = Object.fromEntries(
      Object.entries(errs).filter(([key]) => b[key] !== undefined)
    );

    if (Object.keys(relevantErrors).length) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: relevantErrors
      });
    }

    // Only overwrite the keys that were sent, so a partial update from an
    // older client cannot wipe the richer detail fields.
    const full = buildPayload(b);
    const update = Object.fromEntries(
      Object.entries(full).filter(([key]) => b[key] !== undefined)
    );

    const doc = await ClassModel.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: 'after', runValidators: true }
    );

    if (!doc) return res.status(404).json({ message: 'Class not found' });
    return res.json(doc);
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    return next(error);
  }
}

export async function deleteClass(req, res, next) {
  try {
    const doc = await ClassModel.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Class not found' });
    return res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    return next(error);
  }
}
