/**
 * Payment Controller V2
 * Tenant-hardened API for payment processing
 * 
 * Features:
 * - Payment session creation (Ozow/Stripe)
 * - Payment status tracking
 * - Payment history
 * - Pricing information
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import OzowPaymentService from '../services/ozow-payment.service';
import StripePaymentService from '../services/stripe-payment.service';
import PayPalPaymentService from '../services/paypal-payment.service';
import EFTPaymentService from '../services/eft-payment.service';
import CryptoPaymentService, { SUPPORTED_COINS } from '../services/crypto-payment.service';

/**
 * Tenant context helper
 */
function getTenantContext(req: TenantRequest): { tenantId: string; userId: string; tenant: any; user: any } {
  const tenantId = req.tenant?.id;
  const userId = req.user?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: userId || '', tenant: req.tenant, user: req.user };
}

// ============================================================================
// PAYMENT SESSIONS
// ============================================================================

/**
 * Create payment session (Ozow or Stripe based on country)
 */
export const createPaymentSession = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, tenant, user } = getTenantContext(req);
    const { plan, billingCycle = 'monthly', paymentMethod = 'auto' } = req.body;

    // Validate plan
    const validPlans = ['starter', 'professional', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan', validPlans });
    }

    // Validate billing cycle
    if (!['monthly', 'annual'].includes(billingCycle)) {
      return res.status(400).json({ success: false, error: 'Invalid billing cycle', valid: ['monthly', 'annual'] });
    }

    // Determine payment gateway
    let gateway = paymentMethod;
    if (gateway === 'auto') {
      // Prefer PayPal if configured, else Ozow for ZA, else Stripe
      if (PayPalPaymentService.isConfigured()) {
        gateway = 'paypal';
      } else {
        const tenantCountry = tenant?.settings?.country || 'ZA';
        gateway = tenantCountry === 'ZA' && OzowPaymentService.isConfigured() ? 'ozow' : 'stripe';
      }
    }

    const customerName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    const paymentData = {
      tenantId,
      userId: user?.id || '',
      plan,
      billingCycle,
      customerEmail: user?.email || '',
      customerName,
    };

    let amount: number;
    let currency = 'ZAR';
    let paymentUrl: string;
    let transactionReference: string;
    let extraData: Record<string, unknown> = {};

    if (gateway === 'paypal') {
      if (!PayPalPaymentService.isConfigured()) {
        return res.status(503).json({ success: false, error: 'PayPal not configured' });
      }
      const ppResponse = await PayPalPaymentService.createOrder(paymentData);
      amount = PayPalPaymentService.getPlanPricing(plan, billingCycle);
      paymentUrl = ppResponse.url;
      transactionReference = ppResponse.transactionReference;
      extraData = { orderId: ppResponse.orderId };

    } else if (gateway === 'eft') {
      const eftResponse = await EFTPaymentService.createEFTPayment(paymentData);
      amount = eftResponse.amount;
      currency = 'ZAR';
      paymentUrl = ''; // EFT has no redirect URL – details returned inline
      transactionReference = eftResponse.transactionReference;
      extraData = {
        bankDetails: {
          bankName: eftResponse.bankName,
          accountName: eftResponse.accountName,
          accountNumber: eftResponse.accountNumber,
          branchCode: eftResponse.branchCode,
          accountType: eftResponse.accountType,
          swiftCode: eftResponse.swiftCode,
          paymentReference: eftResponse.paymentReference,
          expiresAt: eftResponse.expiresAt,
        },
      };

    } else if (gateway === 'crypto') {
      if (!CryptoPaymentService.isConfigured()) {
        return res.status(503).json({ success: false, error: 'Crypto payments not configured – set NOWPAYMENTS_API_KEY' });
      }
      const payCurrency = req.body.payCurrency || 'usdt';
      const cryptoResponse = await CryptoPaymentService.createPayment({ ...paymentData, payCurrency });
      amount = cryptoResponse.amountZAR;
      paymentUrl = cryptoResponse.paymentUrl;
      transactionReference = cryptoResponse.transactionReference;
      extraData = { paymentId: cryptoResponse.paymentId, payCurrency: cryptoResponse.payCurrency };

    } else if (gateway === 'ozow') {
      if (!OzowPaymentService.isConfigured()) {
        return res.status(503).json({ success: false, error: 'Ozow payment gateway not configured' });
      }
      amount = OzowPaymentService.getPlanPricing(plan, billingCycle);
      const ozowResponse = await OzowPaymentService.createPaymentRequest({ ...paymentData, amount });
      paymentUrl = ozowResponse.url;
      transactionReference = ozowResponse.transactionReference;

    } else {
      // Stripe fallback
      if (!StripePaymentService.isConfigured()) {
        return res.status(503).json({ success: false, error: 'Stripe payment gateway not configured' });
      }
      amount = StripePaymentService.getPlanPricing(plan, billingCycle);
      currency = 'USD';
      const stripeResponse = await StripePaymentService.createCheckoutSession({ ...paymentData, amount, currency });
      paymentUrl = stripeResponse.url;
      transactionReference = stripeResponse.transactionReference;
    }

    res.json({
      success: true,
      data: {
        gateway,
        paymentUrl,
        transactionReference,
        amount,
        currency,
        plan,
        billingCycle,
        ...extraData,
      }
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Create payment session error:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment session' });
  }
};

/**
 * Get payment transaction status
 */
export const getPaymentStatus = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { reference } = req.params;

    const payment = await OzowPaymentService.getPaymentStatus(reference);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Verify tenant ownership
    if (payment.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        reference: payment.transaction_reference,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        gateway: payment.payment_gateway,
        plan: payment.plan,
        billingCycle: payment.billing_cycle,
        paidAt: payment.paid_at,
        createdAt: payment.created_at
      }
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment status' });
  }
};

/**
 * Get tenant payment history
 */
export const getPaymentHistory = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);

    const payments = await OzowPaymentService.getPaymentHistory(tenantId);

    res.json({
      success: true,
      data: payments
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment history' });
  }
};

/**
 * Cancel pending payment
 */
export const cancelPayment = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { reference } = req.params;

    await OzowPaymentService.cancelPayment(reference, tenantId);

    res.json({
      success: true,
      message: 'Payment cancelled'
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Cancel payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel payment' });
  }
};

/**
 * Get pricing information for all plans
 */
export const getPricing = async (req: TenantRequest, res: Response) => {
  try {
    const { tenant } = getTenantContext(req);
    const { gateway = 'auto' } = req.query;

    let selectedGateway = gateway as string;
    if (selectedGateway === 'auto') {
      const tenantCountry = tenant?.settings?.country || 'ZA';
      selectedGateway = tenantCountry === 'ZA' ? 'ozow' : 'stripe';
    }

    const plans = ['starter', 'professional', 'enterprise'];
    const pricing: any = {};

    for (const plan of plans) {
      if (selectedGateway === 'ozow') {
        pricing[plan] = {
          monthly: {
            amount: OzowPaymentService.getPlanPricing(plan, 'monthly'),
            currency: 'ZAR'
          },
          annual: {
            amount: OzowPaymentService.getPlanPricing(plan, 'annual'),
            currency: 'ZAR',
            discount: '2 months free'
          }
        };
      } else {
        pricing[plan] = {
          monthly: {
            amount: StripePaymentService.getPlanPricing(plan, 'monthly'),
            currency: 'USD'
          },
          annual: {
            amount: StripePaymentService.getPlanPricing(plan, 'annual'),
            currency: 'USD',
            discount: '2 months free'
          }
        };
      }
    }

    res.json({
      success: true,
      data: {
        gateway: selectedGateway,
        pricing
      }
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get pricing error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pricing' });
  }
};

/**
 * POST /api/payment/paypal/capture
 * Capture a PayPal order after payer approval
 */
export const capturePayPalOrder = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId required' });
    }
    const result = await PayPalPaymentService.captureOrder(orderId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('PayPal capture error:', error);
    res.status(500).json({ success: false, error: error.message || 'PayPal capture failed' });
  }
};

/**
 * POST /api/payment/eft/proof
 * Customer submits proof of EFT payment
 */
export const submitEFTProof = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { transactionReference, popReference, notes } = req.body;
    if (!transactionReference) {
      return res.status(400).json({ success: false, error: 'transactionReference required' });
    }
    await EFTPaymentService.submitProofOfPayment(transactionReference, tenantId, { popReference, notes });
    res.json({ success: true, message: 'Proof of payment submitted. We will confirm within 1 business day.' });
  } catch (error: any) {
    console.error('EFT proof submit error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to submit proof of payment' });
  }
};

/**
 * GET /api/payment/crypto/coins
 * Return list of supported cryptocurrencies
 */
export const getSupportedCryptos = async (_req: TenantRequest, res: Response) => {
  res.json({ success: true, data: SUPPORTED_COINS });
};

export default {
  createPaymentSession,
  getPaymentStatus,
  getPaymentHistory,
  cancelPayment,
  getPricing,
  capturePayPalOrder,
  submitEFTProof,
  getSupportedCryptos,
};
