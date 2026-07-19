-- 103_chart_of_accounts_tenant_scoping.sql
-- Fixes: chart_of_accounts.account_code was globally UNIQUE (not tenant-scoped), which would
-- break the moment a second tenant seeds the default SA chart of accounts (same codes like
-- '1000', '1100' collide across tenants). This makes it UNIQUE(tenant_id, account_code) and
-- updates the 4 dependent foreign keys to match.
--
-- Safe to run: account_period_balances, budget_lines, journal_entry_lines, and tax_codes were
-- all confirmed EMPTY (0 rows) at the time this was written — no data migration/backfill risk.
-- tenant_id columns on account_period_balances and budget_lines were already added in a prior step.
--
-- Run this as one script (not statement-by-statement) so the constraint swap is atomic.

BEGIN;

-- Drop the old single-column FKs that all point at the (soon to be removed) global unique account_code
ALTER TABLE public.journal_entry_lines DROP CONSTRAINT IF EXISTS journal_entry_lines_account_code_fkey;
ALTER TABLE public.account_period_balances DROP CONSTRAINT IF EXISTS account_period_balances_account_code_fkey;
ALTER TABLE public.budget_lines DROP CONSTRAINT IF EXISTS budget_lines_account_code_fkey;
ALTER TABLE public.tax_codes DROP CONSTRAINT IF EXISTS tax_codes_tax_payable_account_fkey;
ALTER TABLE public.tax_codes DROP CONSTRAINT IF EXISTS tax_codes_tax_receivable_account_fkey;

-- Now safe to drop the global unique constraint (tenant-scoped one already added in a prior partial run)
ALTER TABLE public.chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_code_key;

-- Re-add FKs as composite (tenant_id, account_code) so each tenant's accounts are isolated
ALTER TABLE public.journal_entry_lines
  ADD CONSTRAINT journal_entry_lines_account_code_fkey
  FOREIGN KEY (tenant_id, account_code) REFERENCES public.chart_of_accounts(tenant_id, account_code);

ALTER TABLE public.account_period_balances
  ADD CONSTRAINT account_period_balances_account_code_fkey
  FOREIGN KEY (tenant_id, account_code) REFERENCES public.chart_of_accounts(tenant_id, account_code);

ALTER TABLE public.budget_lines
  ADD CONSTRAINT budget_lines_account_code_fkey
  FOREIGN KEY (tenant_id, account_code) REFERENCES public.chart_of_accounts(tenant_id, account_code);

ALTER TABLE public.tax_codes
  ADD CONSTRAINT tax_codes_tax_payable_account_fkey
  FOREIGN KEY (tenant_id, tax_payable_account) REFERENCES public.chart_of_accounts(tenant_id, account_code);

ALTER TABLE public.tax_codes
  ADD CONSTRAINT tax_codes_tax_receivable_account_fkey
  FOREIGN KEY (tenant_id, tax_receivable_account) REFERENCES public.chart_of_accounts(tenant_id, account_code);

COMMIT;
