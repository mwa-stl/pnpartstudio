/**
 * Fallback masthead copy, one entry per storefront page.
 *
 * Live values come from `GET /api/page-heroes/:key` (edited in the admin
 * console under Site content → Page mastheads). These keep each page's
 * headline on screen while the request is in flight, and fill any field the
 * admin left blank.
 */
export const DEFAULT_PAGE_HEROES = {
  shop: {
    sectionLabel: 'The Shop',
    headingLines: ['Original work,', 'ready to hang.'],
    intro: 'Hand-painted originals and handcrafted pieces. Every listing is the actual piece you receive — no reproductions.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
  gallery: {
    sectionLabel: 'The Collection',
    headingLines: ['Gallery'],
    intro: 'The complete archive — original artworks, exhibitions, and moments from the studio.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
  'art-classes': {
    sectionLabel: 'Art Classes',
    headingLines: ['Learn,', 'create,', 'thrive.'],
    intro: 'Join live online sessions or come into the studio for immersive workshops. Drawing, watercolour, and acrylics taught with over a decade of practice behind every demo.',
    tags: ['Beginner friendly', 'All ages', 'Materials list included'],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
  'custom-order': {
    sectionLabel: 'Commissions',
    headingLines: ['Your story,', 'painted by hand.'],
    intro: 'Portraits, name signs, and gifts painted to your brief — from the first sketch through to framed delivery.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
  blog: {
    sectionLabel: 'Studio Journal',
    headingLines: ['Notes from', 'the easel.'],
    intro: 'Process, materials, and practical advice for living with art — written between commissions.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
  contact: {
    sectionLabel: 'Contact',
    headingLines: ['Let’s talk', 'about art.'],
    intro: 'Commissions, classes, or a question about a piece — every message reaches the studio directly.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
  'track-order': {
    sectionLabel: 'Order Tracking',
    headingLines: ['Where is', 'my order?'],
    intro: 'Enter the order number from your confirmation email to see its current status.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
  wishlist: {
    sectionLabel: 'Saved',
    headingLines: ['Your wishlist'],
    intro: 'Pieces you have set aside. Nothing is reserved until it is in an order.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
  cart: {
    sectionLabel: 'Your Cart',
    headingLines: ['Ready when', 'you are.'],
    intro: '',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
    image: '',
  },
};

const pick = (v, fallback) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || fallback;
};

export const mergePageHero = (key, doc) => {
  const d = DEFAULT_PAGE_HEROES[key] || DEFAULT_PAGE_HEROES.shop;
  if (!doc || typeof doc !== 'object') return d;
  return {
    sectionLabel: pick(doc.sectionLabel, d.sectionLabel),
    headingLines: Array.isArray(doc.headingLines) && doc.headingLines.length ? doc.headingLines : d.headingLines,
    intro: pick(doc.intro, d.intro),
    // Tags are genuinely optional: an admin clearing them should clear them,
    // so an empty array is honoured rather than replaced with the default.
    tags: Array.isArray(doc.tags) ? doc.tags : d.tags,
    ctaLabel: pick(doc.ctaLabel, ''),
    ctaHref: pick(doc.ctaHref, ''),
    image: pick(doc.image, ''),
  };
};
