-- 101_runtime_gaps.sql — gaps found by live endpoint testing (July 2026, Render+Neon)
-- Idempotent. Run after 100_gap_fixes.sql.

-- A. sales.leads lacked tenant_id (getLeads filters on it)
ALTER TABLE sales.leads ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_sales_leads_tenant ON sales.leads(tenant_id);

-- B. chart_of_accounts: code expects account_code/account_name (v2 + CoA module),
--    while migration 011 created code/name. Rename + keep read-only mirrors.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='chart_of_accounts' AND column_name='code')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='chart_of_accounts' AND column_name='account_code') THEN
    ALTER TABLE public.chart_of_accounts RENAME COLUMN code TO account_code;
    ALTER TABLE public.chart_of_accounts RENAME COLUMN name TO account_name;
    ALTER TABLE public.chart_of_accounts ADD COLUMN code VARCHAR(50) GENERATED ALWAYS AS (account_code) STORED;
    ALTER TABLE public.chart_of_accounts ADD COLUMN name VARCHAR(255) GENERATED ALWAYS AS (account_name) STORED;
  END IF;
END $$;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS parent_account_id INTEGER;

-- C. regulatory_filings (compliance v2 'frameworks' endpoint reads this)
CREATE TABLE IF NOT EXISTS regulatory_filings (
  filing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  framework VARCHAR(100), filing_name VARCHAR(255), filing_type VARCHAR(100),
  authority VARCHAR(100) DEFAULT 'SARS',
  period_start DATE, period_end DATE, due_date DATE,
  status VARCHAR(40) DEFAULT 'pending',
  submitted_at TIMESTAMP, reference_number VARCHAR(100),
  notes TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_regulatory_filings_tenant ON regulatory_filings(tenant_id);

-- D. compliance_policies (policies endpoint)
CREATE TABLE IF NOT EXISTS compliance_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL, description TEXT,
  policy_type VARCHAR(100), status VARCHAR(40) DEFAULT 'draft',
  effective_date DATE, review_date DATE, document_url TEXT,
  created_by UUID, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_tenant ON compliance_policies(tenant_id);

-- E. default legal entity per tenant (entity-scoped reports need req.entity)
INSERT INTO legal_entities (id, tenant_id, code, name, type, currency, country, level, status, is_default, created_at, updated_at)
SELECT gen_random_uuid(), t.id, 'MAIN', t.name, 'company', 'ZAR', 'ZA', 0, 'active', true, NOW(), NOW()
FROM tenants t
WHERE t.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM legal_entities le WHERE le.tenant_id = t.id);

-- F. compliance_policies: v2 controller selects cp.id
ALTER TABLE compliance_policies ADD COLUMN IF NOT EXISTS id UUID GENERATED ALWAYS AS (policy_id) STORED;

-- G. journal_entry_lines compat columns (repos join on account_id; writers use entry_id/tenant_id)
ALTER TABLE journal_entry_lines
  ADD COLUMN IF NOT EXISTS account_id INTEGER,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS entry_id UUID;
CREATE INDEX IF NOT EXISTS idx_jel_tenant ON journal_entry_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);

-- H. chart_of_accounts: some financial queries reference coa.id (PK is account_id)
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS id INTEGER GENERATED ALWAYS AS (account_id) STORED;
