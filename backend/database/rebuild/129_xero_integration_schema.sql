-- 129_xero_integration_schema.sql
--
-- First real 3rd-party OAuth2 integration in this codebase. Stores the
-- per-tenant Xero OAuth connection and adds xero_*_id crosswalk columns to
-- the real target tables so re-syncs are idempotent (upsert via ON CONFLICT).
--
-- cash_bank_statement_lines has no tenant_id of its own (only scoped via
-- statement_id -> cash_bank_statements.tenant_id) - added directly here so
-- the bank-transaction upsert doesn't need a join through the parent table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.xero_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  xero_org_id VARCHAR(100) NOT NULL, -- Xero's own org identifier ("tenantId" in their API) - kept distinct from our tenant_id
  xero_org_name VARCHAR(255),

  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,

  connected_by UUID,
  connected_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,

  UNIQUE (tenant_id, xero_org_id)
);
CREATE INDEX IF NOT EXISTS idx_xero_connections_tenant ON public.xero_connections(tenant_id) WHERE is_active = true;

ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS xero_account_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coa_tenant_xero ON public.chart_of_accounts(tenant_id, xero_account_id) WHERE xero_account_id IS NOT NULL;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS xero_contact_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_tenant_xero ON public.customers(tenant_id, xero_contact_id) WHERE xero_contact_id IS NOT NULL;

ALTER TABLE purchase.suppliers ADD COLUMN IF NOT EXISTS xero_contact_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_tenant_xero ON purchase.suppliers(tenant_id, xero_contact_id) WHERE xero_contact_id IS NOT NULL;

ALTER TABLE public.sales_invoices ADD COLUMN IF NOT EXISTS xero_invoice_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_salesinv_tenant_xero ON public.sales_invoices(tenant_id, xero_invoice_id) WHERE xero_invoice_id IS NOT NULL;

ALTER TABLE purchase.vendor_invoices ADD COLUMN IF NOT EXISTS xero_invoice_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendorinv_tenant_xero ON purchase.vendor_invoices(tenant_id, xero_invoice_id) WHERE xero_invoice_id IS NOT NULL;

ALTER TABLE public.cash_bank_statement_lines ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.cash_bank_statement_lines ADD COLUMN IF NOT EXISTS xero_bank_transaction_id VARCHAR(100);
UPDATE public.cash_bank_statement_lines l SET tenant_id = s.tenant_id
  FROM public.cash_bank_statements s
  WHERE l.statement_id = s.statement_id AND l.tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bankline_tenant_xero ON public.cash_bank_statement_lines(tenant_id, xero_bank_transaction_id) WHERE xero_bank_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_tenant ON public.cash_bank_statement_lines(tenant_id);

COMMIT;
