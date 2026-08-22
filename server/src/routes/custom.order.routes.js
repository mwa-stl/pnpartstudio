// server/src/routes/customOrder.routes.js
import { Router } from 'express';
import multer from 'multer';
import { submitOrder } from '../controllers/customOrderController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/submit', upload.single('reference'), submitOrder);

export default router;
