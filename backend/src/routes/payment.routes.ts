import { Router } from 'express';
import PaymentController from '../controllers/payment.controller';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

/**
 * Payment Routes (require authentication)
 */

// Create payment session
router.post('/create-session', tenantMiddleware, PaymentController.createPaymentSession);

// Get payment status
router.get('/status/:reference', tenantMiddleware, PaymentController.getPaymentStatus);

// Get payment history
router.get('/history', tenantMiddleware, PaymentController.getPaymentHistory);

// Cancel pending payment
router.post('/cancel/:reference', tenantMiddleware, PaymentController.cancelPayment);

// Get pricing information
router.get('/pricing', PaymentController.getPricing);

export default router;
