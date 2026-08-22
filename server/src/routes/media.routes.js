import { Router } from 'express';
import multer from 'multer';
import {
  uploadImage, uploadVideo, uploadPublicImage, removeMedia, storageStatus,
} from '../controllers/media.controller.js';
import { authenticateJWT } from '../middleware/auth.js';
import { rateLimit } from 'express-rate-limit';

const mb = (value, fallback) => {
  const n = Number(value);
  return (Number.isFinite(n) && n > 0 ? n : fallback) * 1024 * 1024;
};

/* Files are held in memory only long enough to be processed and pushed to the
   bucket — nothing is written to the app's own disk. The caps stop a huge
   upload from exhausting memory before the mime check ever runs. */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: mb(process.env.MEDIA_MAX_IMAGE_MB, 15), files: 1 },
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: mb(process.env.MEDIA_MAX_VIDEO_MB, 200), files: 1 },
});

/* Public uploads get a much smaller cap than an admin's — a review photo is
   a snapshot, not a print master. */
const publicUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: mb(process.env.MEDIA_MAX_PUBLIC_IMAGE_MB, 8), files: 1 },
});

/* The only upload route without a login behind it, so it gets the tightest
   budget on the server. Enough for a few photos with a review, nowhere near
   enough to fill a bucket. */
const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads. Please try again later.' },
});

/** Turns multer's own errors into a readable message instead of a 500. */
const handleUploadErrors = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'That file is larger than the upload limit.'
      : err.message;
    return res.status(413).json({ message });
  }
  return next(err);
};

const router = Router();

// Public — a photo attached to a review or a commission enquiry.
router.post('/public/image', publicUploadLimiter, publicUpload.single('file'), handleUploadErrors, uploadPublicImage);

// Everything else is admin-only — uploads cost storage and CPU.
router.get('/status', authenticateJWT, storageStatus);
router.post('/image', authenticateJWT, imageUpload.single('file'), handleUploadErrors, uploadImage);
router.post('/video', authenticateJWT, videoUpload.single('file'), handleUploadErrors, uploadVideo);
router.delete('/', authenticateJWT, removeMedia);

router.use(handleUploadErrors);

export default router;
