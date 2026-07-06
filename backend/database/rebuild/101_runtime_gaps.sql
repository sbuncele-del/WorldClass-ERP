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

-- I. referral_codes: signup queries it when a referral code is supplied; no DDL existed
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  owner_tenant_id UUID,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
-- 102: compliance workspace tables + onboarding checklist (live-found gaps)

CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  framework_name VARCHAR(150) NOT NULL,
  compliance_percentage NUMERIC(5,2) DEFAULT 0,
  last_assessment_date DATE,
  status VARCHAR(40) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cf_tenant ON compliance_frameworks(tenant_id);

CREATE TABLE IF NOT EXISTS compliance_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  audit_name VARCHAR(200), audit_type VARCHAR(80),
  scheduled_date DATE, status VARCHAR(40) DEFAULT 'scheduled',
  auditor VARCHAR(150), scope TEXT,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_caud_tenant ON compliance_audits(tenant_id);

CREATE TABLE IF NOT EXISTS compliance_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  risk_category VARCHAR(100), risk_level VARCHAR(30),
  description TEXT, detected_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(40) DEFAULT 'open', mitigation_plan TEXT,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crisk_tenant ON compliance_risks(tenant_id);

CREATE TABLE IF NOT EXISTS compliance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  framework_id UUID, assessment_name VARCHAR(200),
  assessment_date DATE, score NUMERIC(5,2), status VARCHAR(40),
  findings TEXT, assessor VARCHAR(150),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cassess_tenant ON compliance_assessments(tenant_id);

-- workspace controller also reads these policy columns
ALTER TABLE compliance_policies
  ADD COLUMN IF NOT EXISTS policy_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS policy_version VARCHAR(30) DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS last_review_date DATE,
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- onboarding checklist (provisioning service expects it; no DDL existed)
CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  task_key VARCHAR(60) NOT NULL,
  task_label VARCHAR(255) NOT NULL,
  task_url VARCHAR(255),
  task_icon VARCHAR(40),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, task_key)
);

-- seed the standard tasks for every existing active tenant
INSERT INTO onboarding_checklist (tenant_id, task_key, task_label, task_url, task_icon, sort_order)
SELECT t.id, x.k, x.l, x.u, x.i, x.o FROM tenants t CROSS JOIN (VALUES
  ('verify_email','Verify your email address',NULL,'mail',1),
  ('complete_profile','Complete your company profile','/app/tenant-settings','building',2),
  ('invite_team','Invite your team members','/app/users','users',3),
  ('add_bank_account','Add your bank account','/app/banking','credit-card',4),
  ('create_first_invoice','Create your first invoice','/app/sales/invoices/new','file-text',5),
  ('add_first_customer','Add your first customer','/app/sales/customers/new','user-plus',6),
  ('setup_chart_of_accts','Review your chart of accounts','/app/financial/chart-of-accounts','bar-chart-2',7),
  ('explore_reports','Explore your financial reports','/app/reports','pie-chart',8)
) AS x(k,l,u,i,o)
WHERE t.deleted_at IS NULL
ON CONFLICT (tenant_id, task_key) DO NOTHING;

-- J. journal_entries legacy read-compat (older code reads entry_date/entry_number)
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS entry_date DATE, ADD COLUMN IF NOT EXISTS entry_number VARCHAR(60);
-- K. regulatory_filings columns per workspace controller bootstrap
ALTER TABLE regulatory_filings
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS period VARCHAR(30),
  ADD COLUMN IF NOT EXISTS submitted_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'manual';

-- L. more read-compat: workspace compliance helpers
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS tax_code VARCHAR(30);
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS default_tax_code VARCHAR(30);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS name VARCHAR(255) GENERATED ALWAYS AS (entity_name) STORED;
ALTER TABLE regulatory_filings ADD COLUMN IF NOT EXISTS reference VARCHAR(120);
ALTER TABLE compliance_assessments ADD COLUMN IF NOT EXISTS compliance_percentage NUMERIC(5,2);

-- M. modules catalog + tenant_modules (tenant settings module toggles)
-- (see repo history for full definition — created 2026-07-06)

-- N. sales invoice v2-writer columns (tax_amount naming era + order-line fields)
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales_invoice_lines
  ADD COLUMN IF NOT EXISTS item_id INTEGER,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
