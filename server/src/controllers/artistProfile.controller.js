import ArtistProfile, { ARTIST_PROFILE_DEFAULTS } from '../models/ArtistProfile.js';

const KEY = 'default';

const str = (v, fallback = '') => (typeof v === 'string' ? v.trim() : fallback);

/** Trimmed, non-empty strings only blank rows in the admin form are dropped. */
const strList = (v) =>
  Array.isArray(v) ? v.map((s) => str(s)).filter(Boolean) : [];

const detailList = (v) =>
  Array.isArray(v)
    ? v
        .map((d) => ({ label: str(d?.label), value: str(d?.value) }))
        .filter((d) => d.label || d.value)
    : [];

/**
 * Whitelists the incoming payload. Everything the storefront renders is
 * addressed explicitly, so an unexpected key in the request body can never
 * reach the document.
 */
const sanitise = (body = {}) => ({
  name: str(body.name),
  role: str(body.role),
  location: str(body.location),
  photo: str(body.photo),
  photoAlt: str(body.photoAlt),

  home: {
    sectionLabel: str(body.home?.sectionLabel),
    headingLines: strList(body.home?.headingLines),
    paragraphs: strList(body.home?.paragraphs),
    ctaLabel: str(body.home?.ctaLabel),
    ctaHref: str(body.home?.ctaHref),
  },

  about: {
    sectionLabel: str(body.about?.sectionLabel),
    headingLines: strList(body.about?.headingLines),
    intro: str(body.about?.intro),
    details: detailList(body.about?.details),
    tags: strList(body.about?.tags),
    lead: str(body.about?.lead),
    paragraphs: strList(body.about?.paragraphs),
    ratingScore: str(body.about?.ratingScore),
    ratingOutOf: str(body.about?.ratingOutOf),
    ratingLabel: str(body.about?.ratingLabel),
    customersCount: str(body.about?.customersCount),
    customersLabel: str(body.about?.customersLabel),
  },
});

/**
 * GET /api/artist-profile public.
 * Seeds the document with the current site copy on first call so the admin
 * form never opens empty.
 */
export const getArtistProfile = async (_req, res) => {
  try {
    let profile = await ArtistProfile.findOne({ key: KEY });
    if (!profile) {
      profile = await ArtistProfile.create({ key: KEY, ...ARTIST_PROFILE_DEFAULTS });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/** PUT /api/artist-profile admin only. */
export const updateArtistProfile = async (req, res) => {
  try {
    const update = sanitise(req.body);
    if (!update.name) return res.status(400).json({ message: 'Artist name is required' });
    if (!update.home.headingLines.length)
      return res.status(400).json({ message: 'The home section needs at least one heading line' });

    const profile = await ArtistProfile.findOneAndUpdate(
      { key: KEY },
      { $set: update },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
