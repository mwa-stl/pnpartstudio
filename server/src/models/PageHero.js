import mongoose from 'mongoose';

/**
 * Masthead ("hero") content for the storefront's content pages, one document
 * per page keyed by slug. The home page keeps its own carousel (HeroSlider);
 * the About page masthead lives on ArtistProfile because it is artist copy.
 */

const PAGE_KEYS = [
  'shop',
  'gallery',
  'art-classes',
  'custom-order',
  'blog',
  'contact',
  'track-order',
  'wishlist',
  'cart',
];

const pageHeroSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, enum: PAGE_KEYS, immutable: true },
    sectionLabel: { type: String, trim: true, default: '' },
    headingLines: { type: [String], default: [] },
    intro: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },
    ctaLabel: { type: String, trim: true, default: '' },
    ctaHref: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

/** The copy currently hardcoded in each page, used to seed on first read. */
export const PAGE_HERO_DEFAULTS = {
  shop: {
    sectionLabel: 'The Shop',
    headingLines: ['Original work,', 'ready to hang.'],
    intro: 'Hand-painted originals and handcrafted pieces. Every listing is the actual piece you receive — no reproductions.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
  },
  gallery: {
    sectionLabel: 'The Collection',
    headingLines: ['Gallery'],
    intro: 'The complete archive — original artworks, exhibitions, and moments from the studio.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
  },
  'art-classes': {
    sectionLabel: 'Art Classes',
    headingLines: ['Learn,', 'create,', 'thrive.'],
    intro: 'Join live online sessions or come into the studio for immersive workshops. Drawing, watercolour, and acrylics taught with over a decade of practice behind every demo.',
    tags: ['Beginner friendly', 'All ages', 'Materials list included'],
    ctaLabel: '',
    ctaHref: '',
  },
  'custom-order': {
    sectionLabel: 'Commissions',
    headingLines: ['Your story,', 'painted by hand.'],
    intro: 'Portraits, name signs, and gifts painted to your brief — from the first sketch through to framed delivery.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
  },
  blog: {
    sectionLabel: 'Studio Journal',
    headingLines: ['Notes from', 'the easel.'],
    intro: 'Process, materials, and practical advice for living with art — written between commissions.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
  },
  contact: {
    sectionLabel: 'Contact',
    headingLines: ['Let’s talk', 'about art.'],
    intro: 'Commissions, classes, or a question about a piece — every message reaches the studio directly.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
  },
  'track-order': {
    sectionLabel: 'Order Tracking',
    headingLines: ['Where is', 'my order?'],
    intro: 'Enter the order number from your confirmation email to see its current status.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
  },
  wishlist: {
    sectionLabel: 'Saved',
    headingLines: ['Your wishlist'],
    intro: 'Pieces you have set aside. Nothing is reserved until it is in an order.',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
  },
  cart: {
    sectionLabel: 'Your Cart',
    headingLines: ['Ready when', 'you are.'],
    intro: '',
    tags: [],
    ctaLabel: '',
    ctaHref: '',
  },
};

export const PAGE_HERO_KEYS = PAGE_KEYS;

const PageHero = mongoose.model('PageHero', pageHeroSchema);
export default PageHero;
