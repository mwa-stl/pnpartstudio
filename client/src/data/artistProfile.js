import priyankaBioImg from '../assets/priyanka bio img.jpeg';

/**
 * Fallback artist copy. The live values come from `GET /api/artist-profile`
 * (edited in the admin console under Site content → Artist profile), but the
 * Home and About pages must still render something readable if the API is
 * unreachable or a field was left blank so every field falls back here.
 */
export const DEFAULT_ARTIST_PROFILE = {
  name: 'Priyanka Vasista',
  role: 'Founder',
  location: 'Ballwin, Missouri',
  photo: priyankaBioImg,
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

/** The bundled photo, used whenever the admin has not uploaded one. */
export const FALLBACK_ARTIST_PHOTO = priyankaBioImg;

const pickStr = (value, fallback) => {
  const v = typeof value === 'string' ? value.trim() : '';
  return v || fallback;
};

const pickList = (value, fallback) =>
  Array.isArray(value) && value.length ? value : fallback;

/**
 * Merges an API document over the defaults field by field, so a profile that
 * was only partially filled in never leaves a heading or paragraph empty.
 */
export const mergeArtistProfile = (doc) => {
  if (!doc || typeof doc !== 'object') return DEFAULT_ARTIST_PROFILE;
  const d = DEFAULT_ARTIST_PROFILE;
  const home = doc.home || {};
  const about = doc.about || {};

  return {
    name: pickStr(doc.name, d.name),
    role: pickStr(doc.role, d.role),
    location: pickStr(doc.location, d.location),
    photo: pickStr(doc.photo, d.photo),
    photoAlt: pickStr(doc.photoAlt, d.photoAlt),

    home: {
      sectionLabel: pickStr(home.sectionLabel, d.home.sectionLabel),
      headingLines: pickList(home.headingLines, d.home.headingLines),
      paragraphs: pickList(home.paragraphs, d.home.paragraphs),
      ctaLabel: pickStr(home.ctaLabel, d.home.ctaLabel),
      ctaHref: pickStr(home.ctaHref, d.home.ctaHref),
    },

    about: {
      sectionLabel: pickStr(about.sectionLabel, d.about.sectionLabel),
      headingLines: pickList(about.headingLines, d.about.headingLines),
      intro: pickStr(about.intro, d.about.intro),
      details: pickList(about.details, d.about.details),
      tags: pickList(about.tags, d.about.tags),
      lead: pickStr(about.lead, d.about.lead),
      paragraphs: pickList(about.paragraphs, d.about.paragraphs),
      ratingScore: pickStr(about.ratingScore, d.about.ratingScore),
      ratingOutOf: pickStr(about.ratingOutOf, d.about.ratingOutOf),
      ratingLabel: pickStr(about.ratingLabel, d.about.ratingLabel),
      customersCount: pickStr(about.customersCount, d.about.customersCount),
      customersLabel: pickStr(about.customersLabel, d.about.customersLabel),
    },
  };
};
