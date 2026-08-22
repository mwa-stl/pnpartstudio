import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/** How many photos a visitor may attach — matches the server's own cap. */
export const MAX_REVIEW_PHOTOS = 4;

/**
 * Visitor-facing uploads.
 *
 * Goes through our API, which converts the file to WebP before it reaches the
 * bucket — so a 6MB phone photo becomes a few hundred KB, and nothing the
 * browser hands over is stored as-is. The route is rate limited server side;
 * this only returns the finished public URL.
 */
export const uploadPublicImage = async (file, { folder = "reviews", onProgress } = {}) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  try {
    const { data } = await axios.post(`${API_BASE}/api/media/public/image`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      },
      timeout: 2 * 60 * 1000,
    });
    return data;
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      (err?.code === "ECONNABORTED" ? "Upload timed out — try a smaller photo." : err.message);
    throw new Error(message || "Upload failed");
  }
};

/** Human-readable size, for upload feedback. */
export const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
