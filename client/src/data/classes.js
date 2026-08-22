/**
 * Shared shape for a class, used by the classes page, the home page strip,
 * and the class detail page — so all three read a record the same way.
 */

export const CLASS_COVER_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#E7E6DE"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8C8C86" font-family="monospace" font-size="22" letter-spacing="3">CLASS</text></svg>`
  );

export const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** "2026-06-03" → "3 June 2026". Anything unparseable is passed through. */
export const formatClassDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
};

/** True once the start date is in the past — the card then reads "Session ended". */
export const hasEnded = (c) => {
  const ref = c.endDate || c.startDate;
  if (!ref) return false;
  const d = new Date(ref);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

export const normaliseClass = (c = {}) => {
  const highlights = list(c.highlights).length
    ? list(c.highlights)
    // Older records packed the card tags into a comma-separated description.
    : String(c.description || '').split(',').map((s) => s.trim()).filter(Boolean);

  return {
    id: c._id || c.id || '',
    title: c.title || 'Untitled class',
    summary: c.summary || '',
    mode: c.mode || 'Online',
    level: c.level || '',
    cover: c.cover || '',
    published: !!c.published,

    startDate: c.startDate || '',
    endDate: c.endDate || '',
    time: c.time || '',
    schedule: c.schedule || '',
    durationWeeks: typeof c.durationWeeks === 'number' ? c.durationWeeks : 0,
    sessionCount: typeof c.sessionCount === 'number' ? c.sessionCount : 0,
    sessionLength: c.sessionLength || '',

    seats: typeof c.seats === 'number' ? c.seats : 0,
    price: typeof c.price === 'number' ? c.price : 0,
    location: c.location || (c.mode === 'Online' ? 'Online (live)' : 'Studio, Ballwin MO'),
    ageGroup: c.ageGroup || '',
    language: c.language || '',
    instructor: c.instructor || '',
    bookingUrl: c.bookingUrl || '',

    overview: list(c.overview),
    highlights,
    learn: list(c.learn),
    materials: list(c.materials),
    requirements: list(c.requirements),
    syllabus: list(c.syllabus),
    faqs: list(c.faqs),
    gallery: list(c.gallery),
  };
};

/** The rows shown in the card's detail table — blanks are dropped, not left as gaps. */
export const classFacts = (c) =>
  [
    c.startDate && ['Date', formatClassDate(c.startDate)],
    c.time && ['Time', c.time],
    c.schedule && ['Repeats', c.schedule],
    c.seats > 0 && ['Seats', `${c.seats} available`],
    ['Where', c.location],
  ].filter(Boolean);
