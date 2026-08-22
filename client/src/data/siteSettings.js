/**
 * Fallback studio contact details.
 *
 * Live values come from `GET /api/site-settings` (edited in the admin console
 * under Site content → Contact details). These defaults keep the footer and
 * contact page readable if the API is unreachable, and fill any field the
 * admin left blank.
 */
export const DEFAULT_SITE_SETTINGS = {
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

const pick = (v, fallback) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || fallback;
};

const pickList = (v, fallback) => (Array.isArray(v) && v.length ? v : fallback);

export const mergeSiteSettings = (doc) => {
  if (!doc || typeof doc !== 'object') return DEFAULT_SITE_SETTINGS;
  const d = DEFAULT_SITE_SETTINGS;
  return {
    studioName: pick(doc.studioName, d.studioName),
    tagline: pick(doc.tagline, d.tagline),
    email: pick(doc.email, d.email),
    // Phone and WhatsApp have no sensible placeholder — an invented number
    // would be worse than showing nothing, so they stay empty.
    phone: pick(doc.phone, ''),
    whatsapp: pick(doc.whatsapp, ''),
    addressLine1: pick(doc.addressLine1, ''),
    addressLine2: pick(doc.addressLine2, ''),
    city: pick(doc.city, d.city),
    state: pick(doc.state, d.state),
    postalCode: pick(doc.postalCode, ''),
    country: pick(doc.country, d.country),
    mapUrl: pick(doc.mapUrl, ''),
    visitNote: pick(doc.visitNote, d.visitNote),
    hours: pickList(doc.hours, d.hours),
    socials: pickList(doc.socials, d.socials),
    responseTime: pick(doc.responseTime, d.responseTime),
    classEnquiryUrl: pick(doc.classEnquiryUrl, ''),
  };
};

/** "12 Main St, Ballwin, Missouri 63011" — blanks are skipped, not shown as gaps. */
export const formatAddress = (s, { multiline = false } = {}) => {
  const street = [s.addressLine1, s.addressLine2].filter(Boolean).join(', ');
  const region = [s.city, s.state].filter(Boolean).join(', ');
  const tail = [region, s.postalCode].filter(Boolean).join(' ');
  const parts = [street, tail, s.country].filter(Boolean);
  return multiline ? parts : parts.join(', ');
};
