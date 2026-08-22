import { Router } from 'express';
import * as storePickup from '../controllers/storePickup.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public a customer places a pickup order at checkout.
router.post("/", storePickup.createStorePickupOrder);

// Admin only these expose and mutate customer contact details.
router.get("/", authenticateJWT, storePickup.getStorePickupOrders);
router.get("/:id", authenticateJWT, storePickup.getStorePickupOrder);
router.patch("/:id", authenticateJWT, storePickup.updateStorePickupOrder);
router.delete("/:id", authenticateJWT, storePickup.deleteStorePickupOrder);

export default router;
