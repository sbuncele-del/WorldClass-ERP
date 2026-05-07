/**
 * PayPal Payment Service
 * Uses PayPal Orders API v2 (no SDK required – plain HTTPS)
 * Supports: one-time subscription payments + webhook verification
 */

import pool from '../config/database';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' | 'live'
const PAYPAL_BASE = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// ZAR pricing per plan (monthly / annual)
const PLAN_PRICING: Record<string, Record<string, number>> = {
  starter:      { monthly: 299,  annual: 2990  },
  professional: { monthly: 799,  annual: 7990  },
  enterprise:   { monthly: 1999, annual: 19990 },
};

interface PayPalOrderRequest {
  tenantId: string;
  userId: string;
  plan: string;
  billingCycle: 'monthly' | 'annual';
  customerEmail: string;
  customerName: string;
}

interface PayPalOrderResponse {
  url: string;
  orderId: string;
  transactionReference: string;
}

export class PayPalPaymentService {
  static isConfigured(): boolean {
    return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
  }

  static getPlanPricing(plan: string, billingCycle: string): number {
    return PLAN_PRICING[plan]?.[billingCycle] ?? 0;
  }

  /**
   * Get OAuth2 access token from PayPal
   */
  private static async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`PayPal auth failed: ${response.status}`);
    }
    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  /**
   * Create a PayPal Order and return approval URL
   */
  static async createOrder(data: PayPalOrderRequest): Promise<PayPalOrderResponse> {
    const { tenantId, userId, plan, billingCycle, customerEmail, customerName } = data;

    const amount = this.getPlanPricing(plan, billingCycle);
    if (!amount) throw new Error(`Invalid plan/billing cycle: ${plan}/${billingCycle}`);

    const transactionReference = `PP-${tenantId.substring(0, 8).toUpperCase()}-${Date.now()}`;

    const frontendUrl = process.env.APP_URL || 'https://siyabusaerp.co.za';
    const returnUrl = `${frontendUrl}/payment/success?ref=${transactionReference}&gateway=paypal`;
    const cancelUrl = `${frontendUrl}/payment/cancel?ref=${transactionReference}&gateway=paypal`;

    const accessToken = await this.getAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: transactionReference,
        description: `Siyabusa ERP – ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${billingCycle})`,
        amount: {
          currency_code: 'ZAR',
          value: amount.toFixed(2),
        },
        custom_id: `${tenantId}:${plan}:${billingCycle}`,
      }],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    };

    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': transactionReference,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PayPal order creation failed: ${err}`);
    }

    const order = await response.json() as {
      id: string;
      links: Array<{ rel: string; href: string }>;
    };

    const approveLink = order.links.find(l => l.rel === 'payer-action' || l.rel === 'approve');
    if (!approveLink) throw new Error('PayPal did not return an approval URL');

    // Persist to DB
    await pool.query(
      `INSERT INTO payment_transactions (
        tenant_id, user_id, transaction_reference, amount, currency,
        payment_gateway, plan, billing_cycle, status, customer_email, customer_name, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        tenantId, userId, transactionReference, amount, 'ZAR',
        'paypal', plan, billingCycle, 'pending',
        customerEmail, customerName,
        JSON.stringify({ paypal_order_id: order.id, mode: PAYPAL_MODE }),
      ]
    );

    return { url: approveLink.href, orderId: order.id, transactionReference };
  }

  /**
   * Capture a PayPal Order after payer approval
   */
  static async captureOrder(orderId: string): Promise<{ status: string; transactionReference: string }> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PayPal capture failed: ${err}`);
    }

    const capture = await response.json() as {
      status: string;
      purchase_units: Array<{ reference_id: string }>;
    };

    const ref = capture.purchase_units?.[0]?.reference_id;
    const status = capture.status === 'COMPLETED' ? 'completed' : 'failed';

    if (ref) {
      await pool.query(
        `UPDATE payment_transactions SET status = $1, updated_at = NOW()
         WHERE transaction_reference = $2`,
        [status, ref]
      );

      if (status === 'completed') {
        await this.activateSubscription(ref);
      }
    }

    return { status, transactionReference: ref };
  }

  /**
   * Activate tenant subscription after successful payment
   */
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

  /**
   * Verify PayPal webhook signature
   */
  static async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
    webhookId: string
  ): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
      });
      const result = await response.json() as { verification_status: string };
      return result.verification_status === 'SUCCESS';
    } catch {
      return false;
    }
  }
}

export default PayPalPaymentService;
