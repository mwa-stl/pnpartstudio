import PageHero, { PAGE_HERO_DEFAULTS, PAGE_HERO_KEYS } from '../models/PageHero.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

const sanitise = (b = {}) => ({
  sectionLabel: str(b.sectionLabel),
  headingLines: strList(b.headingLines),
  intro: str(b.intro),
  tags: strList(b.tags),
  ctaLabel: str(b.ctaLabel),
  ctaHref: str(b.ctaHref),
  image: str(b.image),
});

/**
 * GET /api/page-heroes — public, returns every page keyed by slug.
 * Missing pages are seeded from the copy currently on the site, so the admin
 * list is complete from the first load.
 */
export const listPageHeroes = async (_req, res) => {
  try {
    const existing = await PageHero.find({});
    const have = new Set(existing.map((d) => d.key));
    const missing = PAGE_HERO_KEYS.filter((k) => !have.has(k));

    if (missing.length) {
      await PageHero.insertMany(
        missing.map((key) => ({ key, ...PAGE_HERO_DEFAULTS[key] })),
        { ordered: false }
      );
    }

    const all = missing.length ? await PageHero.find({}) : existing;
    res.json({ items: all });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/** GET /api/page-heroes/:key — public. */
export const getPageHero = async (req, res) => {
  try {
    const { key } = req.params;
    if (!PAGE_HERO_KEYS.includes(key)) return res.status(404).json({ message: 'Unknown page' });

    let doc = await PageHero.findOne({ key });
    if (!doc) doc = await PageHero.create({ key, ...PAGE_HERO_DEFAULTS[key] });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/** PUT /api/page-heroes/:key — admin only. */
export const updatePageHero = async (req, res) => {
  try {
    const { key } = req.params;
    if (!PAGE_HERO_KEYS.includes(key)) return res.status(404).json({ message: 'Unknown page' });

    const update = sanitise(req.body);
    if (!update.headingLines.length)
      return res.status(400).json({ message: 'At least one heading line is required' });

    const doc = await PageHero.findOneAndUpdate(
      { key },
      { $set: update, $setOnInsert: { key } },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
