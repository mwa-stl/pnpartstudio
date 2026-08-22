// src/routes/products.routes.js
import { Router } from 'express';
import {
  listProducts,
  listPurchasableProducts,
  listEnquiryProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public the storefront reads the catalogue.
// These two must be declared before '/:id', or Express matches
// "purchasable" / "enquiry" as a product id.
router.get('/purchasable', listPurchasableProducts);
router.get('/enquiry', listEnquiryProducts);

router.get('/', listProducts);
router.get('/:id', getProduct);

// Admin only anyone could previously create/edit/delete products.
router.post('/', authenticateJWT, createProduct);
router.put('/:id', authenticateJWT, updateProduct);
router.delete('/:id', authenticateJWT, deleteProduct);

export default router;
