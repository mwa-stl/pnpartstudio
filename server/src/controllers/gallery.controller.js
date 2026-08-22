
import GalleryItem from '../models/GalleryItem.js';
import { deleteObject, objectPathFromUrl } from '../services/storage.js';

/** Media fields carried on both create paths — images and videos alike. */
const mediaFields = (src) => ({
  type: src.type === 'video' ? 'video' : 'image',
  src: src.src || src.url,
  storagePath: src.storagePath || src.path || '',
  poster: src.poster || '',
  posterPath: src.posterPath || '',
  duration: Number(src.duration) || 0,
  width: Number(src.width) || 0,
  height: Number(src.height) || 0,
});

// GET /api/gallery
export async function listGallery(req, res, next) {
  try {
    if (req.query.distinct === 'category') {
      const values = await GalleryItem.distinct('category');
      return res.json({ values });
    }
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '24', 10)));
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();

    const match = {};
    if (category && category !== 'All') match.category = category;

    let query = GalleryItem.find(match);
    if (q) {
      query = GalleryItem.find({
        ...match,
        $or: [
          { $text: { $search: q } },
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { medium: { $regex: q, $options: 'i' } }
        ]
      });
    }

    const total = await query.clone().countDocuments();
    const items = await query.sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean();
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { next(err); }
}

// POST /api/gallery
// Accepts either { items: [...] } or { images: [...], meta: {...} }
export async function createGalleryItems(req, res, next) {
  try {
    const body = req.body || {};
    let docs = [];

    if (Array.isArray(body.items) && body.items.length) {
      docs = body.items.map((it) => ({
        title: it.title || 'Untitled',
        category: it.category || 'Paintings',
        year: Number(it.year) || new Date().getFullYear(),
        medium: it.medium || '',
        description: it.description || '',
        ...mediaFields(it),
        cloudinaryPublicId: it.cloudinaryPublicId || '',
        tags: Array.isArray(it.tags) ? it.tags : []
      }));
    } else if (Array.isArray(body.images) && body.images.length) {
      const meta = body.meta || {};
      docs = body.images.map((im) => ({
        title: meta.title || 'Untitled',
        category: meta.category || 'Paintings',
        year: Number(meta.year) || new Date().getFullYear(),
        medium: meta.medium || '',
        description: meta.description || '',
        ...mediaFields(im),
        cloudinaryPublicId: im.publicId || '',
        tags: Array.isArray(meta.tags) ? meta.tags : []
      }));
    } else {
      return res.status(400).json({ message: 'No items or images provided' });
    }

    if (!docs.every(d => d?.src)) return res.status(400).json({ message: 'Each item requires src' });

    const created = await GalleryItem.insertMany(docs);
    res.status(201).json({ items: created });
  } catch (err) {
    console.error('POST /api/gallery error:', err?.message);
    next(err);
  }
}

// PATCH /api/gallery/:id
export async function updateGalleryItem(req, res, next) {
  try {
    const id = req.params.id;
    const payload = {};
    [
      'title', 'category', 'year', 'medium', 'description', 'tags',
      'type', 'src', 'storagePath', 'poster', 'posterPath', 'duration', 'width', 'height',
      'cloudinaryPublicId',
    ].forEach((k) => {
      if (k in req.body) payload[k] = req.body[k];
    });

    // Replacing the file leaves the old object orphaned in the bucket.
    if (req.body.oldStoragePath && req.body.oldStoragePath !== payload.storagePath) {
      try { await deleteObject(req.body.oldStoragePath); }
      catch (e) { console.error('Bucket delete failed:', e?.message); }
    }

    await GalleryItem.updateOne({ _id: id }, { $set: payload });
    const updated = await GalleryItem.findById(id).lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) { next(err); }
}

// DELETE /api/gallery/:id
export async function deleteGalleryItem(req, res, next) {
  try {
    const id = req.params.id;
    const doc = await GalleryItem.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });

    // Take the media with the record so the bucket does not fill with orphans.
    // Failures are logged rather than thrown: the record still has to go.
    for (const target of [
      doc.storagePath || objectPathFromUrl(doc.src),
      doc.posterPath || objectPathFromUrl(doc.poster),
    ]) {
      if (!target) continue;
      try { await deleteObject(target); }
      catch (e) { console.error('Bucket delete failed:', e?.message); }
    }

    await GalleryItem.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
