import mongoose from 'mongoose';

/**
 * The welcome popup that appears a few seconds after a visitor lands.
 * Singleton, same pattern as ArtistProfile and SiteSettings.
 */
const promoPopupSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true, immutable: true },

    enabled: { type: Boolean, default: true },
    delaySeconds: { type: Number, min: 0, max: 120, default: 5 },

    image: { type: String, trim: true, default: '' },
    imageBadge: { type: String, trim: true, default: '' },

    sectionLabel: { type: String, trim: true, default: '' },
    heading: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, default: '' },

    emailLabel: { type: String, trim: true, default: '' },
    emailPlaceholder: { type: String, trim: true, default: '' },
    submitLabel: { type: String, trim: true, default: '' },
    dismissLabel: { type: String, trim: true, default: '' },
    footnote: { type: String, trim: true, default: '' },

    successBody: { type: String, trim: true, default: '' },
    successButtonLabel: { type: String, trim: true, default: '' },
    alreadyBody: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

/** Seeded on first read, from the copy currently hardcoded in the popup. */
export const PROMO_POPUP_DEFAULTS = {
  enabled: true,
  delaySeconds: 5,

  image: '',
  imageBadge: 'PnP Artstudio',

  sectionLabel: 'Welcome offer',
  heading: 'Take 10% off your first piece.',
  body: 'Join the studio letter for new work, class dates, and an instant discount.',

  emailLabel: 'Email address',
  emailPlaceholder: 'you@example.com',
  submitLabel: 'Claim discount',
  dismissLabel: 'No thanks',
  footnote: 'You can unsubscribe at any time.',

  successBody: 'Here is your code — it’s also on its way to your inbox.',
  successButtonLabel: 'Start shopping',
  alreadyBody: 'You’ve already claimed a welcome coupon — check your mailbox.',
};

const PromoPopup = mongoose.model('PromoPopup', promoPopupSchema);
export default PromoPopup;
