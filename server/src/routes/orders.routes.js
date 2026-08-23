// routes/orders.routes.js
import { Router } from 'express';
import * as orders from '../controllers/orders.controller.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Public checkout creates the order, and customers look theirs up by
// reference from the confirmation email.
router.post('/', orders.createOrder);
router.get('/ref/:referenceId', orders.getOrderByReferenceId);
router.get('/ref/:referenceId/invoice.pdf', orders.downloadPublicInvoicePdf);

// Called by the PayPal return/capture flow.
router.patch('/paypal/:paypalOrderId/capture', orders.updateOrderWithCapture);
router.post('/paypal/:paypalOrderId/webhook', orders.addWebhookEvent);

// Admin only these expose or mutate every customer's order, including
// names, emails, phone numbers and shipping addresses.
router.get('/', authenticateJWT, orders.getOrders);
router.get('/:id/invoice.pdf', authenticateJWT, orders.downloadInvoicePdf);
router.get('/:id/invoice.docx', authenticateJWT, orders.downloadInvoiceDocx);
router.get('/:id', authenticateJWT, orders.getOrder);
router.patch('/:id', authenticateJWT, orders.updateOrderStatus);

export default router;
