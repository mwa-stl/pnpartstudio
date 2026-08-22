import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const MEDIA_URL = `${API_BASE}/api/media`;

/**
 * Uploads go through our own API rather than straight to a storage provider.
 *
 * That is the whole point of the move off Cloudinary: the server converts
 * every image to WebP and re-encodes every video before anything reaches the
 * bucket, which cannot happen if the browser uploads directly. It also means
 * the bucket credentials never leave the server.
 *
 * `folder` must be one of the names the API whitelists: products, gallery,
 * classes, hero, testimonials, artist, pages, popup, misc.
 */

const post = async (endpoint, file, { folder = "misc", onProgress } = {}) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  try {
    const { data } = await axios.post(`${MEDIA_URL}/${endpoint}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      },
      // Re-encoding a long video takes far longer than a default axios timeout.
      timeout: 10 * 60 * 1000,
    });
    return data;
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      (err?.code === "ECONNABORTED" ? "Upload timed out — try a shorter or smaller file." : err.message);
    throw new Error(message || "Upload failed");
  }
};

/** Any image in → WebP out. Resolves to { url, path, width, height, bytes }. */
export const uploadImage = (file, options) => post("image", file, options);

/**
 * Any video in → compressed MP4 out, with a poster frame.
 * Resolves to { url, path, poster, posterPath, duration, width, height, bytes }.
 */
export const uploadVideo = (file, options) => post("video", file, options);

/** Picks the right endpoint from the file's own type. */
export const uploadMedia = (file, options) =>
  (file?.type?.startsWith("video/") ? uploadVideo : uploadImage)(file, options);

/** Removes an object from the bucket, by object path or public URL. */
export const deleteMedia = async ({ path: objectPath, url }) => {
  try {
    await axios.delete(MEDIA_URL, { data: { path: objectPath, url } });
    return true;
  } catch {
    // Losing a file in the bucket is untidy, never fatal — the caller has
    // already removed the record that pointed at it.
    return false;
  }
};

/** Whether the server has a bucket configured, for a clear message up front. */
export const storageStatus = async () => {
  try {
    const { data } = await axios.get(`${MEDIA_URL}/status`);
    return data;
  } catch {
    return { configured: false, bucket: "" };
  }
};

/** Human-readable size, for upload feedback. */
export const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
