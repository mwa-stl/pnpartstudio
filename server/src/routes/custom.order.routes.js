// server/src/routes/customOrder.routes.js
import { Router } from 'express';
import multer from 'multer';
import { submitOrder } from '../controllers/customOrderController.js';
import { publicWriteLimiter } from '../middleware/security.js';

const router = Router();

const IMAGE_TYPES = /^image\/(jpeg|png|webp)$/i;

// A visitor-facing upload: one small image, nothing else. Without limits a
// single request could fill memory or email an arbitrary file to the studio.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 20, fieldSize: 20 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.test(file.mimetype || '')) return cb(null, true);
    return cb(Object.assign(new Error('Please attach a JPEG, PNG or WebP image.'), { status: 400 }));
  },
});

// Turns multer's size/count errors into a 4xx instead of a 500.
const uploadErrors = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'That image is larger than 10 MB.' : 'Invalid upload.';
    return res.status(413).json({ message });
  }
  return next(err);
};

router.post('/submit', publicWriteLimiter, upload.single('reference'), uploadErrors, submitOrder);

export default router;
