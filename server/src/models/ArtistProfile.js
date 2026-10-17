import mongoose from 'mongoose';
import { mediaCleanupPlugin } from '../services/mediaCleanup.js';

/**
 * A single document that drives the artist copy on the storefront:
 *  - the "The Artist" band on the home page
 *  - the masthead + bio block on the About page
 *
 * It is a singleton `key` is fixed so a racing write can never create a
 * second profile, and every read/write goes through the same upsert.
 */

const detailSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    value: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const artistProfileSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true, immutable: true },

    // Identity shared by both pages.
    name: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    photo: { type: String, trim: true, default: '' },
    photoAlt: { type: String, trim: true, default: '' },

    // Home page "The Artist" band.
    home: {
      sectionLabel: { type: String, trim: true, default: '' },
      headingLines: { type: [String], default: [] },
      paragraphs: { type: [String], default: [] },
      ctaLabel: { type: String, trim: true, default: '' },
      ctaHref: { type: String, trim: true, default: '' },
    },

    // About page masthead + bio.
    about: {
      sectionLabel: { type: String, trim: true, default: '' },
      headingLines: { type: [String], default: [] },
      intro: { type: String, trim: true, default: '' },
      details: { type: [detailSchema], default: [] },
      tags: { type: [String], default: [] },
      lead: { type: String, trim: true, default: '' },
      paragraphs: { type: [String], default: [] },
      ratingScore: { type: String, trim: true, default: '' },
      ratingOutOf: { type: String, trim: true, default: '' },
      ratingLabel: { type: String, trim: true, default: '' },
      customersCount: { type: String, trim: true, default: '' },
      customersLabel: { type: String, trim: true, default: '' },
    },
  },
  { timestamps: true }
);

/**
 * Seeded on first read so the admin form opens pre-filled with the copy that
 * is currently on the site, rather than an empty shell.
 */
export const ARTIST_PROFILE_DEFAULTS = {
  name: 'Priyanka Vasista',
  role: 'Founder',
  location: 'Ballwin, Missouri',
  photo: '',
  photoAlt: 'Priyanka Vasista in her studio',

  home: {
    sectionLabel: '07 The Artist',
    headingLines: ['A brush, a childhood', 'memory, and ten years', 'of chasing light.'],
    paragraphs: [
      "Hi, I'm Priyanka Vasista. Art has been part of my life since childhood, sparked by my father who painted as a hobby. Over 10+ years of teaching and creating, my work spans handcrafted originals, custom commissions, and guided art classes.",
      "Art, for me, is a way to bring joy and meaning into people's lives whether through a painting that decorates a home or a class that inspires a child.",
    ],
    ctaLabel: 'Read the full story',
    ctaHref: '/about',
  },

  about: {
    sectionLabel: 'About The Studio',
    headingLines: ['Meet the artist', 'behind every', 'brushstroke.'],
    intro:
      'Ten years of teaching, hundreds of commissions, and a practice that still starts the same way it did in childhood watching what colour does to light.',
    details: [
      { label: 'Based', value: 'Ballwin, Missouri' },
      { label: 'Practice', value: 'Since 2014' },
      { label: 'Works in', value: 'Acrylic, watercolour, charcoal' },
    ],
    tags: ['Traditional techniques', 'Modern innovation', 'Custom creations'],
    lead: "I'm Priyanka Vasista, and art has been part of my life since childhood.",
    paragraphs: [
      'I was first inspired by my father, who painted as a hobby. Watching him work with colour sparked my imagination and lit a lifelong passion.',
      "Over the years that passion has grown into both a creative journey and a career. I've been teaching art for more than ten years, guiding students of all ages to explore their creativity. Alongside teaching, I actively create and share my own work.",
      "Art, for me, is not just expression it's a way to bring joy and meaning into people's lives. Through a painting that decorates a home, a custom piece carrying special memories, or a class that inspires a child.",
    ],
    ratingScore: '4.9',
    ratingOutOf: '/5.0',
    ratingLabel: 'Customer rating',
    customersCount: '1000+',
    customersLabel: 'Happy customers',
  },
};

// Files this record stops referencing (replaced, removed, or the record deleted) are removed from the bucket.
artistProfileSchema.plugin(mediaCleanupPlugin, { fields: ['photo'] });

const ArtistProfile = mongoose.model('ArtistProfile', artistProfileSchema);
export default ArtistProfile;
