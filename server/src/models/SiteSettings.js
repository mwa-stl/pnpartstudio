import mongoose from 'mongoose';

/**
 * Studio contact details, in one place.
 *
 * These strings were previously hardcoded in ten different components
 * (footer, checkout, pickup modal, contact page, shipping page…), so a phone
 * number change meant ten edits. Singleton, same pattern as ArtistProfile.
 */

const pairSchema = new mongoose.Schema(
  { label: { type: String, trim: true, default: '' }, value: { type: String, trim: true, default: '' } },
  { _id: false }
);

const linkSchema = new mongoose.Schema(
  { label: { type: String, trim: true, default: '' }, url: { type: String, trim: true, default: '' } },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true, immutable: true },

    studioName: { type: String, trim: true, default: '' },
    tagline: { type: String, trim: true, default: '' },

    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },

    addressLine1: { type: String, trim: true, default: '' },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },

    mapUrl: { type: String, trim: true, default: '' },      // "Get directions" link
    visitNote: { type: String, trim: true, default: '' },   // parking, buzzer, by-appointment…

    hours: { type: [pairSchema], default: [] },             // Mon–Fri / 10–6
    socials: { type: [linkSchema], default: [] },

    responseTime: { type: String, trim: true, default: '' },
    classEnquiryUrl: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

/** Seeded on first read so the admin form opens with the copy already on the site. */
export const SITE_SETTINGS_DEFAULTS = {
  studioName: 'PnP Artstudio',
  tagline: 'Original art, commissions, and classes from Ballwin, Missouri.',

  email: 'pnp.artstudio7@gmail.com',
  phone: '+1 (713) 576-9741',
  whatsapp: '',

  addressLine1: '579 Brook Meadow Dr',
  addressLine2: '',
  city: 'Ballwin',
  state: 'MO',
  postalCode: '63021',
  country: 'United States',

  mapUrl: 'https://maps.google.com/?q=579+Brook+Meadow+Dr+Ballwin+MO+63021',
  visitNote: 'Studio visits are by appointment — message ahead and we will find a time.',

  hours: [
    { label: 'Monday – Friday', value: '9:00 – 18:00' },
    { label: 'Saturday', value: '10:00 – 16:00' },
    { label: 'Sunday', value: 'Closed' },
  ],
  socials: [
    { label: 'Instagram', url: 'https://www.instagram.com/pnp.artstudio/' },
    { label: 'Facebook', url: 'https://www.facebook.com/people/PnP-art-studio/100064142585253/' },
    { label: 'YouTube', url: 'https://www.youtube.com/@pnpartstudio' },
  ],

  responseTime: 'We reply within 24 hours.',
  classEnquiryUrl: '',
};

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
export default SiteSettings;
