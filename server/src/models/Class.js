// models/Class.js
import mongoose from 'mongoose';
import { mediaCleanupPlugin } from '../services/mediaCleanup.js';

const MODES = ['Online', 'Studio'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

/** Week-by-week (or session-by-session) breakdown of a course. */
const syllabusSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },   // "Week 1", "Session 3"
    title: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const faqSchema = new mongoose.Schema(
  {
    q: { type: String, trim: true, default: '' },
    a: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const classSchema = new mongoose.Schema(
  {
    /* ── Basics ─────────────────────────────────────────────────────── */
    title: { type: String, required: true, trim: true },
    summary: { type: String, trim: true, default: '' },   // one line, shown on the card
    mode: { type: String, enum: MODES, default: 'Online' },
    level: { type: String, enum: LEVELS, default: 'Beginner' },
    cover: { type: String, default: '' },
    published: { type: Boolean, default: true },

    /* ── Schedule ───────────────────────────────────────────────────── */
    startDate: { type: String, default: '' },   // UI sends a string (input type="date")
    endDate: { type: String, default: '' },
    time: { type: String, trim: true, default: '' },       // "5:30 PM – 7:00 PM"
    schedule: { type: String, trim: true, default: '' },   // "Every Wednesday"
    durationWeeks: { type: Number, min: 1, default: 4 },
    sessionCount: { type: Number, min: 0, default: 0 },
    sessionLength: { type: String, trim: true, default: '' }, // "90 minutes"

    /* ── Logistics ──────────────────────────────────────────────────── */
    seats: { type: Number, min: 1, default: 10 },
    price: { type: Number, min: 0, default: 0 },
    location: { type: String, trim: true, default: '' },   // overrides the mode default
    ageGroup: { type: String, trim: true, default: '' },
    language: { type: String, trim: true, default: '' },
    instructor: { type: String, trim: true, default: '' },
    bookingUrl: { type: String, trim: true, default: '' }, // per-class booking link

    /* ── Detail content ─────────────────────────────────────────────── */
    description: { type: String, default: '' },            // kept for older records
    overview: { type: [String], default: [] },             // long-form paragraphs
    highlights: { type: [String], default: [] },           // tags on the card
    learn: { type: [String], default: [] },                // "What you'll learn"
    materials: { type: [String], default: [] },            // provided / to bring
    requirements: { type: [String], default: [] },         // prerequisites
    syllabus: { type: [syllabusSchema], default: [] },
    faqs: { type: [faqSchema], default: [] },
    gallery: { type: [String], default: [] },              // extra images
  },
  { timestamps: true }
);

// Files this record stops referencing (replaced, removed, or the record deleted) are removed from the bucket.
classSchema.plugin(mediaCleanupPlugin, { fields: ['cover', 'gallery'] });

export const ClassModel = mongoose.model('Class', classSchema);
export const CLASS_CONSTANTS = { MODES, LEVELS };
