-- bank_reconciliation_matches: was referenced by the daily BANK_RECONCILIATION
-- scheduled job (backend/src/services/jobs/bank-reconciliation.job.ts) but never
-- created - every insert (both exact matches and fuzzy suggestions) threw and was
-- caught per-statement, so the job silently matched nothing on every run.
-- Applied directly to the live Neon database; kept here for the rebuild kit.

CREATE TABLE IF NOT EXISTS bank_reconciliation_matches (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  statement_line_id INTEGER NOT NULL REFERENCES cash_bank_statement_lines(line_id) ON DELETE CASCADE,
  transaction_id INTEGER NOT NULL REFERENCES cash_transactions(transaction_id) ON DELETE CASCADE,
  match_type VARCHAR(20) NOT NULL, -- 'auto_exact', 'auto_suggestion', 'manual'
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  matched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(statement_line_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_brm_tenant ON bank_reconciliation_matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brm_statement_line ON bank_reconciliation_matches(statement_line_id);
