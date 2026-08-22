import SiteSettings, { SITE_SETTINGS_DEFAULTS } from '../models/SiteSettings.js';

const KEY = 'default';

const str = (v) => (typeof v === 'string' ? v.trim() : '');

const pairList = (v, keys) =>
  Array.isArray(v)
    ? v
        .map((row) => Object.fromEntries(keys.map((k) => [k, str(row?.[k])])))
        .filter((row) => keys.some((k) => row[k]))
    : [];

/** Whitelists the payload — no unexpected key can reach the document. */
const sanitise = (b = {}) => ({
  studioName: str(b.studioName),
  tagline: str(b.tagline),
  email: str(b.email),
  phone: str(b.phone),
  whatsapp: str(b.whatsapp),
  addressLine1: str(b.addressLine1),
  addressLine2: str(b.addressLine2),
  city: str(b.city),
  state: str(b.state),
  postalCode: str(b.postalCode),
  country: str(b.country),
  mapUrl: str(b.mapUrl),
  visitNote: str(b.visitNote),
  hours: pairList(b.hours, ['label', 'value']),
  socials: pairList(b.socials, ['label', 'url']),
  responseTime: str(b.responseTime),
  classEnquiryUrl: str(b.classEnquiryUrl),
});

/** GET /api/site-settings — public. Seeds on first call. */
export const getSiteSettings = async (_req, res) => {
  try {
    let doc = await SiteSettings.findOne({ key: KEY });
    if (!doc) doc = await SiteSettings.create({ key: KEY, ...SITE_SETTINGS_DEFAULTS });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/** PUT /api/site-settings — admin only. */
export const updateSiteSettings = async (req, res) => {
  try {
    const update = sanitise(req.body);
    if (!update.studioName) return res.status(400).json({ message: 'Studio name is required' });

    const doc = await SiteSettings.findOneAndUpdate(
      { key: KEY },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
