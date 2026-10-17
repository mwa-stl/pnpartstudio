// src/routes/products.routes.js
import { Router } from 'express';
import {
  listProducts,
  listPurchasableProducts,
  listEnquiryProducts,
  currentPrices,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.js';
import { authenticateJWT, attachUserIfPresent } from '../middleware/auth.js';

const router = Router();

// Public the storefront reads the catalogue.
// These two must be declared before '/:id', or Express matches
// "purchasable" / "enquiry" as a product id.
router.get('/prices', currentPrices);
router.get('/purchasable', listPurchasableProducts);
router.get('/enquiry', listEnquiryProducts);

// attachUserIfPresent only lets an admin ask for ?raw=1; anonymous callers are unaffected.
router.get('/', attachUserIfPresent, listProducts);
router.get('/:id', attachUserIfPresent, getProduct);

// Admin only anyone could previously create/edit/delete products.
router.post('/', authenticateJWT, createProduct);
router.put('/:id', authenticateJWT, updateProduct);
router.delete('/:id', authenticateJWT, deleteProduct);

export default router;
