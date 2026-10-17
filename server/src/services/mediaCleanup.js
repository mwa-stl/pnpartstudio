import mongoose from 'mongoose';
import { deleteObject, objectPathFromUrl, listObjects, isStorageConfigured } from './storage.js';

/**
 * Keeps the storage bucket in step with the database.
 *
 * Every record that points at an uploaded file is listed in MEDIA_FIELDS. Two
 * things use that list:
 *
 *  1. mediaCleanupPlugin — attached to those schemas. When a record is
 *     updated or deleted, any file it used to reference and no longer does
 *     (an image removed, replaced by a new one, or the whole record gone) is
 *     deleted from the bucket, unless some other record still points at it.
 *
 *  2. scanOrphans / cleanOrphans — a sweep for files nothing references at
 *     all, e.g. an image uploaded into a form that was then abandoned.
 *
 * Bucket deletes are best-effort and never fail the request that triggered
 * them: the database is the source of truth, a leftover file is only untidy.
 */

/** Model name -> dotted field paths that hold bucket URLs (strings or arrays of strings). */
export const MEDIA_FIELDS = {
  Product: ['images'],
  GalleryItem: ['src', 'poster'],
  Class: ['cover', 'gallery'],
  HeroSlider: ['image'],
  Testimonial: ['imageUrl'],
  ArtistProfile: ['photo'],
  PageHero: ['image'],
  PromoPopup: ['image'],
  Review: ['photos'],
  Announcement: ['bannerImage'],
  // Sent emails keep linking to these images forever, so they are never "unused".
  NewsletterCampaign: ['imageUrl', 'headerHtml', 'bodyHtml', 'footerHtml'],
};

/** Folders the orphan sweep never touches (their files are referenced from email, not the database). */
const SWEEP_SKIP_PREFIXES = ['enquiries/'];
/** A file younger than this may belong to a form someone is still filling in. */
const SWEEP_GRACE_MS = 24 * 60 * 60 * 1000;

const URL_IN_TEXT = /https?:\/\/[^\s"'<>)]+/g;

const getAt = (obj, dotted) =>
  dotted.split('.').reduce((acc, key) => {
    if (acc == null) return undefined;
    return Array.isArray(acc) ? acc.map((x) => x?.[key]) : acc[key];
  }, obj);

const flatten = (value, out = []) => {
  if (Array.isArray(value)) value.forEach((v) => flatten(v, out));
  else if (value != null) out.push(value);
  return out;
};

/** Every bucket object path mentioned by the given fields of one document. */
export function pathsIn(doc, fields) {
  const found = new Set();
  if (!doc) return found;
  for (const field of fields) {
    for (const value of flatten(getAt(doc, field))) {
      if (typeof value !== 'string') continue;
      // A field is either a bare URL or HTML containing URLs.
      const candidates = value.includes('<') || /\s/.test(value) ? value.match(URL_IN_TEXT) || [] : [value];
      for (const c of candidates) {
        const p = objectPathFromUrl(c);
        if (p) found.add(p);
      }
    }
  }
  return found;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True if any record still points at this object. */
export async function isReferenced(objectPath) {
  const re = new RegExp(escapeRegex(objectPath));
  for (const [name, fields] of Object.entries(MEDIA_FIELDS)) {
    if (!mongoose.modelNames().includes(name)) continue;
    const hit = await mongoose.model(name).exists({ $or: fields.map((f) => ({ [f]: re })) });
    if (hit) return true;
  }
  return false;
}

/** Deletes each path that nothing references any more. Never throws. */
export async function releaseMedia(paths) {
  if (!isStorageConfigured()) return 0;
  let removed = 0;
  for (const p of paths) {
    try {
      if (await isReferenced(p)) continue;
      if (await deleteObject(p)) removed += 1;
    } catch (err) {
      console.error(`[media] could not delete ${p}:`, err?.message);
    }
  }
  return removed;
}

/**
 * Schema plugin: after an update or delete, release files the record no
 * longer references. Works for save-less query helpers (findByIdAndUpdate,
 * findOneAndUpdate, updateOne, findByIdAndDelete, deleteOne ...).
 */
export function mediaCleanupPlugin(schema, { fields }) {
  const ops = ['findOneAndUpdate', 'updateOne', 'findOneAndReplace', 'findOneAndDelete', 'deleteOne'];

  schema.pre(ops, { document: false, query: true }, async function snapshotMedia() {
    try {
      this._mediaBefore = await this.model.findOne(this.getFilter()).select(fields.join(' ')).lean();
    } catch {
      this._mediaBefore = null;
    }
  });

  schema.post(ops, { document: false, query: true }, async function releaseRemovedMedia() {
    const before = this._mediaBefore;
    if (!before) return;
    try {
      const after = await this.model.findById(before._id).select(fields.join(' ')).lean();
      const keep = pathsIn(after, fields);
      const gone = [...pathsIn(before, fields)].filter((p) => !keep.has(p));
      if (gone.length) await releaseMedia(gone);
    } catch (err) {
      console.error('[media] cleanup after update failed:', err?.message);
    }
  });
}

/** Every object path any record currently references. */
async function referencedPaths() {
  const all = new Set();
  for (const [name, fields] of Object.entries(MEDIA_FIELDS)) {
    if (!mongoose.modelNames().includes(name)) continue;
    const docs = await mongoose.model(name).find({}).select(fields.join(' ')).lean();
    for (const d of docs) for (const p of pathsIn(d, fields)) all.add(p);
  }
  return all;
}

/** Bucket usage plus the files nothing references (older than the grace period). */
export async function scanStorage() {
  const [objects, referenced] = await Promise.all([listObjects(), referencedPaths()]);
  const now = Date.now();
  const orphans = objects.filter(
    (o) =>
      !referenced.has(o.path) &&
      !SWEEP_SKIP_PREFIXES.some((pre) => o.path.startsWith(pre)) &&
      now - new Date(o.created).getTime() > SWEEP_GRACE_MS,
  );
  const sum = (list) => list.reduce((n, o) => n + o.bytes, 0);
  return {
    totalFiles: objects.length,
    totalBytes: sum(objects),
    orphanFiles: orphans.length,
    orphanBytes: sum(orphans),
    orphans: orphans
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 200)
      .map((o) => ({ path: o.path, bytes: o.bytes, created: o.created })),
    orphanPaths: orphans.map((o) => o.path),
  };
}

/** Deletes every orphan found by scanStorage. Returns how many files and bytes went. */
export async function cleanOrphans() {
  const scan = await scanStorage();
  let removed = 0;
  for (const p of scan.orphanPaths) {
    try {
      if (await deleteObject(p)) removed += 1;
    } catch (err) {
      console.error(`[media] could not delete ${p}:`, err?.message);
    }
  }
  return { removed, freedBytes: scan.orphanBytes };
}
