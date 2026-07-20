-- ============================================================================
-- Migration 119: payment_transactions table
--
-- Table is referenced (INSERT/UPDATE/SELECT) across many services but does
-- NOT exist in production. This migration creates it idempotently.
--
-- Column source map (file : gateway/purpose):
--   id                       - PK, UUID. Referenced by
--                               backend/src/config/invoices-schema.sql:14
--                               (invoices.payment_transaction_id UUID
--                               REFERENCES payment_transactions(id)) -> confirms UUID type.
--   tenant_id                - all gateways (stripe/ozow/paypal/crypto/eft), multi-tenant FK pattern
--   user_id                  - all gateways at INSERT time (nullable: stripe renewal INSERT
--                               in stripe-payment.service.ts handleInvoicePaymentSucceeded
--                               does NOT populate user_id)
--   transaction_reference    - all gateways; unique human/gateway-facing reference string
--                               (e.g. "AE-STRIPE-...", "AE-...", "PP-...", "CRY-...", "EFT-...")
--   amount                   - all gateways
--   currency                 - all gateways (USD for stripe, ZAR for ozow/paypal/crypto/eft)
--   payment_gateway          - all gateways: 'stripe' | 'ozow' | 'paypal' | 'crypto' | 'eft'
--   plan                     - all gateways except stripe renewal INSERT (nullable)
--   billing_cycle            - all gateways except stripe renewal INSERT (nullable)
--   status                   - all gateways; values observed: 'pending', 'completed',
--                               'failed', 'cancelled', 'awaiting_payment', 'proof_submitted',
--                               'processing', 'partial', 'refunded', 'expired'.
--                               NOTE (ambiguity): super-admin.service.ts filters status = 'success'
--                               (lines ~382, ~435) but no INSERT/UPDATE anywhere ever writes
--                               'success' - all completions write 'completed'. Likely a bug in
--                               super-admin.service.ts, not a schema issue; flagged for review.
--   customer_email           - stripe, ozow, paypal, crypto, eft (all createX INSERTs)
--   customer_name            - stripe, ozow, paypal, crypto, eft (all createX INSERTs)
--   metadata                 - all gateways; JSONB, gateway-specific payload
--                               (stripe: stripe_mode/session id; ozow: site_code/is_test;
--                               paypal: paypal_order_id/mode; crypto: nowpayments_invoice_id/
--                               pay_currency/invoice_url; eft: expires_at/eft_reference/
--                               pop_reference/pop_notes/pop_submitted_at). Updated in-place via
--                               `metadata || $x::jsonb` merge (stripe-payment.service.ts,
--                               eft-payment.service.ts) so must default to '{}'::jsonb, not NULL.
--   gateway_session_id       - stripe only (Stripe Checkout Session id), set via UPDATE
--   gateway_transaction_id   - stripe (payment_intent id), ozow (Ozow TransactionId)
--   gateway_subscription_id  - stripe only (Stripe subscription id)
--   paid_at                  - stripe, ozow; set on completion via UPDATE
--   gateway_response         - stripe, ozow; JSONB raw webhook/notification payload snapshot
--   description               - SELECTed in subscription.controller.v2.ts getBillingHistory()
--                               (`SELECT ... description ... FROM payment_transactions`) but
--                               NO INSERT in any of the 5 gateway services ever populates it.
--                               AMBIGUITY: column is read-only in current code; included as
--                               nullable TEXT so the SELECT doesn't fail against production.
--   created_at                - all gateways; default NOW()
--   updated_at                - all gateways; set NOW() on every UPDATE
--
-- Referenced by:
--   backend/src/services/stripe-payment.service.ts
--   backend/src/services/ozow-payment.service.ts
--   backend/src/services/paypal-payment.service.ts
--   backend/src/services/crypto-payment.service.ts
--   backend/src/services/eft-payment.service.ts
--   backend/src/services/super-admin.service.ts
--   backend/src/services/demo-reset.service.ts (bulk DELETE FROM payment_transactions WHERE tenant_id = $1)
--   backend/src/controllers/subscription.controller.v2.ts
--   backend/src/config/invoices-schema.sql (FK: invoices.payment_transaction_id -> payment_transactions.id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL,
  user_id                  UUID,

  transaction_reference    VARCHAR(255) NOT NULL UNIQUE,

  amount                   NUMERIC(14, 2) NOT NULL,
  currency                 VARCHAR(10) NOT NULL DEFAULT 'ZAR',

  payment_gateway          VARCHAR(30) NOT NULL, -- 'stripe' | 'ozow' | 'paypal' | 'crypto' | 'eft'
  plan                     VARCHAR(50),
  billing_cycle            VARCHAR(20), -- 'monthly' | 'annual'
  status                   VARCHAR(30) NOT NULL DEFAULT 'pending',

  customer_email           VARCHAR(255),
  customer_name            VARCHAR(255),
  description              TEXT, -- read by subscription.controller.v2 getBillingHistory; never written today

  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- gateway-specific fields (nullable: only populated by the gateway that uses them)
  gateway_session_id       TEXT,      -- stripe: Checkout Session id
  gateway_transaction_id   TEXT,      -- stripe: payment_intent id; ozow: TransactionId
  gateway_subscription_id  TEXT,      -- stripe: subscription id
  gateway_response         JSONB,     -- stripe: full session JSON; ozow: full notification JSON

  paid_at                  TIMESTAMP,

  created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

COMMENT ON TABLE payment_transactions IS 'Unified payment transaction ledger across all gateways (Stripe, Ozow, PayPal, NOWPayments crypto, manual EFT).';
