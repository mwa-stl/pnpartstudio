// routes/orders.routes.js
import { Router } from 'express';
import * as orders from '../controllers/orders.controller.js';
import { authenticateJWT } from '../middleware/auth.js';
import { lookupLimiter } from '../middleware/security.js';

const router = Router();

// Orders are created only by the PayPal flow (POST /api/paypal/create-order,
// then capture-order), which prices them on the server. There is deliberately
// no public "create order" or "mark paid" endpoint.

// Customers look an order up by its (unguessable) reference.
router.get('/ref/:referenceId', lookupLimiter, orders.getOrderByReferenceId);
router.get('/ref/:referenceId/invoice.pdf', lookupLimiter, orders.downloadPublicInvoicePdf);

// Admin only: these expose or mutate every customer's order.
router.get('/', authenticateJWT, orders.getOrders);
router.get('/:id/invoice.pdf', authenticateJWT, orders.downloadInvoicePdf);
router.get('/:id/invoice.docx', authenticateJWT, orders.downloadInvoiceDocx);
router.get('/:id', authenticateJWT, orders.getOrder);
router.patch('/:id', authenticateJWT, orders.updateOrderStatus);

export default router;
