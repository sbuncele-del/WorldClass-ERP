-- AI Categorize (POST /cash-management/reconciliation/ai-categorize) computed
-- suggestions and returned them in the HTTP response, but never wrote them
-- anywhere - so the suggestions only ever existed in React state for that one
-- browser tab, and vanished on refresh/navigation ("nothing holds when the
-- screen is off"). The GET /cash-management/statement-lines endpoint that
-- reloads the screen was also never selecting suggestion columns, which is
-- why the reconciliation screen always showed zero suggestions on open even
-- though the frontend (BankReconciliationHub.tsx) was already written to
-- expect exactly these column names (stmt.suggested_gl_account_id etc.) -
-- the columns just never existed.

ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggested_gl_account_id INTEGER REFERENCES chart_of_accounts(account_id);
ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggested_gl_account_code VARCHAR(50);
ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggested_gl_account_name VARCHAR(255);
ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggestion_confidence NUMERIC(5,2);
ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggestion_reason TEXT;
ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggestion_pattern_id UUID REFERENCES allocation_patterns(id);
ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggestion_human_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggestion_ai_provider VARCHAR(20);
ALTER TABLE cash_bank_statement_lines ADD COLUMN IF NOT EXISTS suggested_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_statement_lines_suggested ON cash_bank_statement_lines(tenant_id, suggested_gl_account_id) WHERE suggested_gl_account_id IS NOT NULL;
