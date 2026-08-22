import { processImage, processVideo, IMAGE_MIME, VIDEO_MIME } from '../services/media.js';
import {
  deleteObject, isStorageConfigured, objectPathFromUrl,
  describeStorageError, hasExplicitCredentials,
} from '../services/storage.js';

/** Only these folders may be written to — the client cannot invent a path. */
const FOLDERS = new Set([
  'products', 'gallery', 'classes', 'hero', 'testimonials', 'artist', 'pages', 'popup',
  'newsletters', 'misc',
]);

/**
 * Folders an unauthenticated visitor may write to. Deliberately tiny: these
 * are the only two places the public can put a file, and both are attached to
 * something a human reviews afterwards.
 */
const PUBLIC_FOLDERS = new Set(['reviews', 'enquiries']);

const folderFor = (value) => (FOLDERS.has(String(value)) ? String(value) : 'misc');
const publicFolderFor = (value) => (PUBLIC_FOLDERS.has(String(value)) ? String(value) : 'reviews');

const notConfigured = (res) =>
  res.status(503).json({
    message: 'Media storage is not configured. Set GCP_BUCKET_NAME and credentials in the server environment.',
  });

/**
 * POST /api/media/image — admin only.
 * Any image in, one WebP out. Returns the public URL plus the object path,
 * which callers store so the file can be deleted later.
 */
export const uploadImage = async (req, res) => {
  try {
    if (!isStorageConfigured()) return notConfigured(res);
    if (!req.file) return res.status(400).json({ message: 'No file received' });
    if (!IMAGE_MIME.test(req.file.mimetype)) {
      return res.status(415).json({ message: `Unsupported image type: ${req.file.mimetype}` });
    }

    const result = await processImage(req.file.buffer, {
      folder: folderFor(req.body?.folder),
      originalName: req.file.originalname,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: describeStorageError(err) });
  }
};

/**
 * POST /api/media/video — admin only.
 * Re-encodes to a web-friendly MP4 and returns a poster frame alongside it.
 */
export const uploadVideo = async (req, res) => {
  try {
    if (!isStorageConfigured()) return notConfigured(res);
    if (!req.file) return res.status(400).json({ message: 'No file received' });
    if (!VIDEO_MIME.test(req.file.mimetype)) {
      return res.status(415).json({ message: `Unsupported video type: ${req.file.mimetype}` });
    }

    const result = await processVideo(req.file.buffer, {
      folder: folderFor(req.body?.folder),
      originalName: req.file.originalname,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: describeStorageError(err) });
  }
};

/**
 * POST /api/media/public/image — no auth.
 *
 * Lets a visitor attach a photo to a review or a commission enquiry. Being
 * open, it is the one upload route an abuser can reach, so it is fenced in on
 * every side: a hard rate limit at the route, a smaller size cap, a folder
 * whitelist, and sharp itself — which throws on anything that is not really
 * an image, whatever the declared mime type says.
 */
export const uploadPublicImage = async (req, res) => {
  try {
    if (!isStorageConfigured()) return notConfigured(res);
    if (!req.file) return res.status(400).json({ message: 'No file received' });
    if (!IMAGE_MIME.test(req.file.mimetype)) {
      return res.status(415).json({ message: 'Please upload a JPEG, PNG or WebP image.' });
    }

    const result = await processImage(req.file.buffer, {
      folder: publicFolderFor(req.body?.folder),
      originalName: req.file.originalname,
    });

    // Visitors get the URL only. The object path is an internal detail and
    // handing it out would let anyone name a file for the delete endpoint.
    res.status(201).json({ url: result.url, width: result.width, height: result.height, bytes: result.bytes });
  } catch (err) {
    res.status(500).json({ message: describeStorageError(err) });
  }
};

/**
 * DELETE /api/media — admin only.
 * Accepts either the object path or the public URL it was served from.
 */
export const removeMedia = async (req, res) => {
  try {
    if (!isStorageConfigured()) return notConfigured(res);
    const target = String(req.body?.path || '').trim() || objectPathFromUrl(req.body?.url);
    if (!target) return res.status(400).json({ message: 'Provide the object path or URL to delete' });

    const removed = await deleteObject(target);
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ message: describeStorageError(err) });
  }
};

/** GET /api/media/status — admin only. Lets the console explain misconfiguration. */
export const storageStatus = (_req, res) => {
  res.json({
    configured: isStorageConfigured(),
    hasCredentials: hasExplicitCredentials(),
    bucket: process.env.GCP_BUCKET_NAME || '',
    publicBaseUrl: process.env.GCS_PUBLIC_BASE_URL || '',
  });
};
