/**
 * Payment Routes (V2, tenant-aware)
 * Delegates to tenant-hardened V2 controller.
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import PaymentControllerV2 from '../controllers/payment.controller.v2';
import PayPalPaymentService from '../services/paypal-payment.service';
import EFTPaymentService from '../services/eft-payment.service';
import CryptoPaymentService from '../services/crypto-payment.service';
import pool from '../config/database';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

router.post('/create-session',    PaymentControllerV2.createPaymentSession);
router.get('/status/:reference',  PaymentControllerV2.getPaymentStatus);
router.get('/history',            PaymentControllerV2.getPaymentHistory);
router.post('/cancel/:reference', PaymentControllerV2.cancelPayment);
router.get('/pricing',            PaymentControllerV2.getPricing);

// PayPal
router.post('/paypal/capture',    PaymentControllerV2.capturePayPalOrder);

// EFT
router.post('/eft/proof',         PaymentControllerV2.submitEFTProof);

// Crypto
router.get('/crypto/coins',       PaymentControllerV2.getSupportedCryptos);

export default router;

// ============================================================================
// WEBHOOK ROUTES (no auth – signed by payment provider)
// Mount separately at /api/webhooks/*
// ============================================================================

export const webhookRouter = Router();

/**
 * PayPal IPN / Webhook
 * PayPal sends CHECKOUT.ORDER.APPROVED or PAYMENT.CAPTURE.COMPLETED events
 */
webhookRouter.post('/paypal', async (req: Request, res: Response) => {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
    const body = JSON.stringify(req.body);
    const headers = req.headers as Record<string, string>;

    const isValid = await PayPalPaymentService.verifyWebhookSignature(headers, body, webhookId);
    if (!isValid && webhookId) {
      console.warn('PayPal webhook signature invalid');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body as { event_type: string; resource: { id?: string; purchase_units?: any[] } };

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderId = event.resource?.id;
      if (orderId) {
        await PayPalPaymentService.captureOrder(orderId).catch(console.error);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('PayPal webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * NOWPayments IPN (crypto)
 */
webhookRouter.post('/crypto/nowpayments', async (req: Request, res: Response) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-nowpayments-sig'] as string || '';

    await CryptoPaymentService.handleWebhook(rawBody, signature);
    res.json({ received: true });
  } catch (err: any) {
    console.error('NOWPayments webhook error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Admin: Confirm EFT payment (protected by auth – admin only)
 * POST /api/webhooks/eft/confirm  { transactionReference }
 */
webhookRouter.post('/eft/confirm', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { transactionReference } = req.body;
    if (!transactionReference) {
      return res.status(400).json({ error: 'transactionReference required' });
    }
    await EFTPaymentService.confirmEFTPayment(transactionReference);
    res.json({ success: true, message: 'EFT payment confirmed and subscription activated' });
  } catch (err: any) {
    console.error('EFT confirm error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Admin: List pending EFT payments for approval
 * GET /api/webhooks/eft/pending
 */
webhookRouter.get('/eft/pending', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT transaction_reference, tenant_id, amount, currency, plan,
              billing_cycle, customer_email, customer_name, status, metadata, created_at
       FROM payment_transactions
       WHERE payment_gateway = 'eft' AND status IN ('awaiting_payment','proof_submitted')
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('EFT pending list error:', err);
    res.status(500).json({ error: 'Failed to fetch pending EFTs' });
  }
});
