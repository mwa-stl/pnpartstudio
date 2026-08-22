import crypto from 'node:crypto';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';

/**
 * Google Cloud Storage, the single home for uploaded media.
 *
 * Credentials come from the environment two ways:
 *  - GCP_KEY_FILE — a path to a service-account JSON key (handy locally)
 *  - GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY — inline credentials (for hosts where
 *    you cannot ship a file). Newlines in the private key are commonly stored
 *    escaped, so they are unescaped here.
 *
 * With neither set, the client falls back to Application Default Credentials,
 * which is what you get on Cloud Run / GCE without any config at all.
 */

const projectId = process.env.GCP_PROJECT_ID || undefined;
const bucketName = process.env.GCP_BUCKET_NAME || '';

const buildClient = () => {
  const keyFilename = process.env.GCP_KEY_FILE;
  if (keyFilename) return new Storage({ projectId, keyFilename });

  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  const privateKey = process.env.GCP_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return new Storage({
      projectId,
      credentials: { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, '\n') },
    });
  }

  return new Storage({ projectId });
};

let storage = null;
let bucket = null;

const getBucket = () => {
  if (!bucketName) {
    throw new Error('GCP_BUCKET_NAME is not set — media uploads are not configured.');
  }
  if (!bucket) {
    storage = storage || buildClient();
    bucket = storage.bucket(bucketName);
  }
  return bucket;
};

/** True when the bucket is configured — lets routes fail loudly but early. */
export const isStorageConfigured = () => Boolean(bucketName);

/**
 * True when credentials were supplied explicitly. Application Default
 * Credentials can still work without them (on Cloud Run, say), so this is a
 * hint for the admin console rather than a hard gate.
 */
export const hasExplicitCredentials = () =>
  Boolean(process.env.GCP_KEY_FILE || (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY));

/**
 * Google's SDK reports a missing service account as "Could not load the
 * default credentials", which tells an admin nothing about what to do. This
 * turns any auth-shaped failure into an instruction.
 */
export const describeStorageError = (err) => {
  const raw = String(err?.message || '');
  if (/default credentials|invalid_grant|unauthenticated|invalid credential|could not load/i.test(raw)) {
    return 'Storage credentials are missing or invalid. Set GCP_KEY_FILE, or GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY, in the server environment.';
  }
  if (/not found|does not exist|no such bucket/i.test(raw)) {
    return `Bucket "${bucketName}" was not found. Check GCP_BUCKET_NAME and that the service account can reach it.`;
  }
  if (/permission|forbidden|403/i.test(raw)) {
    return `The service account is not allowed to write to "${bucketName}". Grant it the Storage Object Admin role.`;
  }
  return raw || 'Upload failed';
};

/**
 * Public URL for an object.
 *
 * Set GCS_PUBLIC_BASE_URL when the bucket sits behind a CDN or custom domain;
 * otherwise objects are served from storage.googleapis.com, which requires the
 * bucket (or object) to be publicly readable.
 */
export const publicUrl = (objectPath) => {
  const base = (process.env.GCS_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
  return base
    ? `${base}/${encoded}`
    : `https://storage.googleapis.com/${bucketName}/${encoded}`;
};

/** Collision-proof object name: folder/2026-08/ab12cd34ef.webp */
export const buildObjectPath = (folder, extension, originalName = '') => {
  const stamp = new Date().toISOString().slice(0, 7); // YYYY-MM
  const random = crypto.randomBytes(8).toString('hex');
  const stem = path
    .basename(originalName, path.extname(originalName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const name = stem ? `${stem}-${random}` : random;
  return `${folder}/${stamp}/${name}.${extension}`;
};

/**
 * Uploads a buffer and returns its public URL.
 *
 * `resumable: false` is deliberate — these are small, already-processed files,
 * and a resumable session would add a round trip for no benefit.
 */
export const uploadBuffer = async (buffer, { objectPath, contentType, cacheSeconds = 31536000 }) => {
  const file = getBucket().file(objectPath);

  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: {
      // Processed media is immutable — a new upload gets a new path — so it
      // can be cached hard by browsers and any CDN in front of the bucket.
      cacheControl: `public, max-age=${cacheSeconds}, immutable`,
    },
  });

  return { url: publicUrl(objectPath), path: objectPath, bytes: buffer.length, contentType };
};

/** Removes an object. A missing object is not an error — the goal is "gone". */
export const deleteObject = async (objectPath) => {
  if (!objectPath) return false;
  try {
    await getBucket().file(objectPath).delete();
    return true;
  } catch (err) {
    if (err?.code === 404) return false;
    throw err;
  }
};

/**
 * Best-effort mapping from a stored public URL back to its object path, so
 * media can be deleted when the record that referenced it goes.
 */
export const objectPathFromUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const base = (process.env.GCS_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (base && url.startsWith(base)) return decodeURIComponent(url.slice(base.length + 1));

  const marker = `storage.googleapis.com/${bucketName}/`;
  const at = url.indexOf(marker);
  if (at !== -1) return decodeURIComponent(url.slice(at + marker.length));

  return '';
};
