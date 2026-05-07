/**
 * Crypto Payment Service
 * Uses NOWPayments API (https://nowpayments.io) – free to sign up, 200+ coins
 * Env vars needed:
 *   NOWPAYMENTS_API_KEY  – your NOWPayments API key
 *   NOWPAYMENTS_IPN_SECRET – IPN secret for webhook verification
 */

import pool from '../config/database';
import { createHmac } from 'crypto';

const NOWPAYMENTS_API_KEY   = process.env.NOWPAYMENTS_API_KEY   || '';
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';
const NOWPAYMENTS_BASE      = 'https://api.nowpayments.io/v1';

// ZAR pricing per plan
const PLAN_PRICING: Record<string, Record<string, number>> = {
  starter:      { monthly: 299,  annual: 2990  },
  professional: { monthly: 799,  annual: 7990  },
  enterprise:   { monthly: 1999, annual: 19990 },
};

// Supported coins to display in the UI (subset – NOWPayments supports 200+)
export const SUPPORTED_COINS = [
  { id: 'btc',  name: 'Bitcoin',  symbol: 'BTC',  icon: '₿' },
  { id: 'eth',  name: 'Ethereum', symbol: 'ETH',  icon: 'Ξ' },
  { id: 'usdt', name: 'Tether',   symbol: 'USDT', icon: '₮' },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', icon: '$' },
  { id: 'bnb',  name: 'BNB',      symbol: 'BNB',  icon: 'B' },
  { id: 'xrp',  name: 'XRP',      symbol: 'XRP',  icon: '✕' },
  { id: 'sol',  name: 'Solana',   symbol: 'SOL',  icon: '◎' },
  { id: 'ltc',  name: 'Litecoin', symbol: 'LTC',  icon: 'Ł' },
];

interface CryptoPaymentRequest {
  tenantId: string;
  userId: string;
  plan: string;
  billingCycle: 'monthly' | 'annual';
  customerEmail: string;
  customerName: string;
  payCurrency: string; // e.g. 'btc', 'eth', 'usdt'
}

export interface CryptoPaymentResponse {
  transactionReference: string;
  paymentUrl: string;  // hosted NOWPayments checkout page
  paymentId: string;
  payCurrency: string;
  amountZAR: number;
  status: string;
}

export class CryptoPaymentService {
  static isConfigured(): boolean {
    return !!NOWPAYMENTS_API_KEY;
  }

  static getPlanPricing(plan: string, billingCycle: string): number {
    return PLAN_PRICING[plan]?.[billingCycle] ?? 0;
  }

  private static async apiRequest(method: string, path: string, body?: object): Promise<any> {
    const response = await fetch(`${NOWPAYMENTS_BASE}${path}`, {
      method,
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`NOWPayments error ${response.status}: ${err}`);
    }
    return response.json();
  }

  /**
   * Create a hosted payment link via NOWPayments Invoice API
   * The customer is redirected to a page where they send crypto
   */
  static async createPayment(data: CryptoPaymentRequest): Promise<CryptoPaymentResponse> {
    const { tenantId, userId, plan, billingCycle, customerEmail, customerName, payCurrency } = data;

    const amountZAR = this.getPlanPricing(plan, billingCycle);
    if (!amountZAR) throw new Error(`Invalid plan/billing cycle: ${plan}/${billingCycle}`);

    const transactionReference = `CRY-${tenantId.substring(0, 8).toUpperCase()}-${Date.now()}`;
    const frontendUrl = process.env.APP_URL || 'https://siyabusaerp.co.za';

    // NOWPayments Invoice endpoint (creates hosted payment page)
    const invoice = await this.apiRequest('POST', '/invoice', {
      price_amount: amountZAR,
      price_currency: 'zar',   // charge in ZAR, NOWPayments converts to crypto
      pay_currency: payCurrency.toLowerCase(),
      order_id: transactionReference,
      order_description: `Siyabusa ERP – ${plan} plan (${billingCycle})`,
      ipn_callback_url: `${process.env.API_URL || 'https://api.siyabusaerp.co.za'}/api/webhooks/crypto/nowpayments`,
      success_url: `${frontendUrl}/payment/success?ref=${transactionReference}&gateway=crypto`,
      cancel_url: `${frontendUrl}/payment/cancel?ref=${transactionReference}&gateway=crypto`,
      customer_email: customerEmail,
    });

    await pool.query(
      `INSERT INTO payment_transactions (
        tenant_id, user_id, transaction_reference, amount, currency,
        payment_gateway, plan, billing_cycle, status, customer_email, customer_name, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        tenantId, userId, transactionReference, amountZAR, 'ZAR',
        'crypto', plan, billingCycle, 'pending',
        customerEmail, customerName,
        JSON.stringify({
          nowpayments_invoice_id: invoice.id,
          pay_currency: payCurrency,
          invoice_url: invoice.invoice_url,
        }),
      ]
    );

    return {
      transactionReference,
      paymentUrl: invoice.invoice_url,
      paymentId: invoice.id,
      payCurrency,
      amountZAR,
      status: 'pending',
    };
  }

  /**
   * Handle IPN (webhook) callback from NOWPayments
   * Called when crypto payment status changes
   */
  static async handleWebhook(
    body: string,
    ipnSignature: string
  ): Promise<{ transactionReference: string; status: string }> {
    // Verify signature
    if (NOWPAYMENTS_IPN_SECRET) {
      const expectedSig = createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
        .update(body)
        .digest('hex');
      if (expectedSig !== ipnSignature) {
        throw new Error('Invalid NOWPayments IPN signature');
      }
    }

    const payload = JSON.parse(body) as {
      order_id: string;
      payment_status: string;
      price_amount: number;
      pay_amount: number;
      pay_currency: string;
    };

    const { order_id: transactionReference, payment_status } = payload;

    // Map NOWPayments status → our status
    const statusMap: Record<string, string> = {
      waiting:     'pending',
      confirming:  'processing',
      confirmed:   'processing',
      sending:     'processing',
      partially_paid: 'partial',
      finished:    'completed',
      failed:      'failed',
      refunded:    'refunded',
      expired:     'expired',
    };
    const status = statusMap[payment_status] || 'processing';

    await pool.query(
      `UPDATE payment_transactions SET status = $1, updated_at = NOW()
       WHERE transaction_reference = $2`,
      [status, transactionReference]
    );

    if (status === 'completed') {
      await this.activateSubscription(transactionReference);
    }

    return { transactionReference, status };
  }

  private static async activateSubscription(transactionReference: string): Promise<void> {
    const result = await pool.query(
      `SELECT tenant_id, plan, billing_cycle FROM payment_transactions
       WHERE transaction_reference = $1`,
      [transactionReference]
    );
    if (!result.rows.length) return;

    const { tenant_id, plan, billing_cycle } = result.rows[0];
    const nextBillingDate = billing_cycle === 'annual'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE tenants SET
         subscription_status = 'active',
         plan = $1,
         trial_ends_at = NULL,
         current_period_end = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [plan, nextBillingDate, tenant_id]
    );
  }
}

export default CryptoPaymentService;
