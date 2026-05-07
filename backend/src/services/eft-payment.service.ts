/**
 * Direct EFT Payment Service
 * Displays SA bank account details, generates a unique payment reference,
 * and tracks manual bank transfers pending admin confirmation.
 */

import pool from '../config/database';

// Your SA bank account details for receiving EFT payments
// Set via env vars (never hardcode in source)
const EFT_BANK_NAME        = process.env.EFT_BANK_NAME        || 'First National Bank (FNB)';
const EFT_ACCOUNT_NAME     = process.env.EFT_ACCOUNT_NAME     || 'Siyabusa Holdings (Pty) Ltd';
const EFT_ACCOUNT_NUMBER   = process.env.EFT_ACCOUNT_NUMBER   || '';
const EFT_BRANCH_CODE      = process.env.EFT_BRANCH_CODE      || '250655'; // FNB universal
const EFT_ACCOUNT_TYPE     = process.env.EFT_ACCOUNT_TYPE     || 'Business Cheque';
const EFT_SWIFT            = process.env.EFT_SWIFT            || 'FIRNZAJJ'; // FNB SWIFT

export interface EFTPaymentDetails {
  transactionReference: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  swiftCode: string;
  amount: number;
  currency: string;
  paymentReference: string; // what customer writes on EFT
  expiresAt: string;        // 48 hours to complete
}

interface EFTCreateRequest {
  tenantId: string;
  userId: string;
  plan: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;  // pre-calculated by pricing.service (includes user count)
  customerEmail: string;
  customerName: string;
}

export class EFTPaymentService {
  /**
   * Create an EFT payment record and return bank details with unique reference
   */
  static async createEFTPayment(data: EFTCreateRequest): Promise<EFTPaymentDetails> {
    const { tenantId, userId, plan, billingCycle, amount, customerEmail, customerName } = data;

    if (!amount) throw new Error(`Amount required for EFT payment`);

    // Short memorable reference: EFT-XXXX-YYYY
    const shortCode = tenantId.substring(0, 6).toUpperCase();
    const transactionReference = `EFT-${shortCode}-${Date.now().toString(36).toUpperCase()}`;

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await pool.query(
      `INSERT INTO payment_transactions (
        tenant_id, user_id, transaction_reference, amount, currency,
        payment_gateway, plan, billing_cycle, status, customer_email, customer_name, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        tenantId, userId, transactionReference, amount, 'ZAR',
        'eft', plan, billingCycle, 'awaiting_payment',
        customerEmail, customerName,
        JSON.stringify({ expires_at: expiresAt.toISOString(), eft_reference: transactionReference }),
      ]
    );

    return {
      transactionReference,
      bankName: EFT_BANK_NAME,
      accountName: EFT_ACCOUNT_NAME,
      accountNumber: EFT_ACCOUNT_NUMBER,
      branchCode: EFT_BRANCH_CODE,
      accountType: EFT_ACCOUNT_TYPE,
      swiftCode: EFT_SWIFT,
      amount,
      currency: 'ZAR',
      paymentReference: transactionReference, // customer uses this as their reference
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Customer submits proof of payment (POP) – reference + optional notes
   */
  static async submitProofOfPayment(
    transactionReference: string,
    tenantId: string,
    proofDetails: { popReference?: string; notes?: string }
  ): Promise<void> {
    const result = await pool.query(
      `UPDATE payment_transactions
       SET status = 'proof_submitted',
           metadata = metadata || $1::jsonb,
           updated_at = NOW()
       WHERE transaction_reference = $2 AND tenant_id = $3 AND status = 'awaiting_payment'
       RETURNING id`,
      [
        JSON.stringify({ pop_reference: proofDetails.popReference, pop_notes: proofDetails.notes, pop_submitted_at: new Date().toISOString() }),
        transactionReference,
        tenantId,
      ]
    );
    if (!result.rowCount) {
      throw new Error('Transaction not found or already processed');
    }
  }

  /**
   * Admin confirms EFT receipt and activates subscription
   */
  static async confirmEFTPayment(transactionReference: string): Promise<void> {
    const result = await pool.query(
      `UPDATE payment_transactions
       SET status = 'completed', updated_at = NOW()
       WHERE transaction_reference = $1
       RETURNING tenant_id, plan, billing_cycle`,
      [transactionReference]
    );
    if (!result.rowCount) throw new Error('Transaction not found');

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

export default EFTPaymentService;
