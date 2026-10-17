import PromoPopup, { PROMO_POPUP_DEFAULTS } from '../models/PromoPopup.js';

const KEY = 'default';
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Whitelists the payload — no unexpected key can reach the document. */
const sanitise = (b = {}) => ({
  enabled: b.enabled === true || b.enabled === 'true',
  delaySeconds: Math.min(120, Math.max(0, Number(b.delaySeconds) || 0)),

  image: str(b.image),
  imageBadge: str(b.imageBadge),

  sectionLabel: str(b.sectionLabel),
  heading: str(b.heading),
  body: str(b.body),

  emailLabel: str(b.emailLabel),
  emailPlaceholder: str(b.emailPlaceholder),
  submitLabel: str(b.submitLabel),
  dismissLabel: str(b.dismissLabel),
  footnote: str(b.footnote),

  successBody: str(b.successBody),
  successButtonLabel: str(b.successButtonLabel),
  alreadyBody: str(b.alreadyBody),
});

/** GET /api/promo-popup — public. Seeds on first call. */
export const getPromoPopup = async (_req, res) => {
  try {
    let doc = await PromoPopup.findOne({ key: KEY });
    if (!doc) doc = await PromoPopup.create({ key: KEY, ...PROMO_POPUP_DEFAULTS });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/** PUT /api/promo-popup — admin only. */
export const updatePromoPopup = async (req, res) => {
  try {
    const update = sanitise(req.body);
    if (update.enabled && !update.heading) {
      return res.status(400).json({ message: 'A heading is required while the popup is switched on' });
    }

    const doc = await PromoPopup.findOneAndUpdate(
      { key: KEY },
      { $set: update },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
