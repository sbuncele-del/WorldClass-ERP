-- 109_budgeting_reconcile.sql
--
-- budgets/budget_lines/budget_scenarios/variance_analysis already existed (public schema) but
-- as an entirely different, older design (what-if scenario modeling with JSONB
-- assumptions/adjustments, fiscal_year_id FK instead of a plain year, jan_amount..dec_amount
-- instead of month_1..month_12, UUID PKs on some tables vs SERIAL on others) — not just missing
-- columns like the other three modules, a genuinely different schema.
--
-- All 4 tables confirmed EMPTY before this migration — reconciling via ALTER (rename + add),
-- not DROP/CREATE, since budget_lines already has a real, correctly tenant-scoped FK to
-- chart_of_accounts(tenant_id, account_code) worth preserving.

-- --- budget_scenarios: rename PK, add missing columns the controller actually uses ---
ALTER TABLE public.budget_scenarios RENAME COLUMN scenario_id TO id;
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS fiscal_year INTEGER;
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE public.budget_scenarios ADD COLUMN IF NOT EXISTS notes TEXT;

-- --- budgets: rename PK, add missing columns, fix constraints ---
ALTER TABLE public.budgets RENAME COLUMN budget_id TO id;
ALTER TABLE public.budgets ALTER COLUMN fiscal_year_id DROP NOT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES public.budget_scenarios(id);
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS fiscal_year INTEGER;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS cost_center_id INTEGER;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS project_id INTEGER;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS total_budget_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS total_actual_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS total_variance DECIMAL(15,2) DEFAULT 0;

ALTER TABLE public.budgets DROP CONSTRAINT chk_budget_type;
ALTER TABLE public.budgets ADD CONSTRAINT chk_budget_type CHECK (budget_type IN ('ANNUAL', 'OPERATING', 'CAPITAL', 'PROJECT', 'QUARTERLY', 'MONTHLY'));
ALTER TABLE public.budgets DROP CONSTRAINT chk_budget_status;
ALTER TABLE public.budgets ADD CONSTRAINT chk_budget_status CHECK (status IN ('DRAFT', 'ACTIVE', 'APPROVED', 'REVISED', 'CLOSED'));

ALTER TABLE public.budgets DROP CONSTRAINT budgets_budget_code_key;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_tenant_code_key UNIQUE (tenant_id, budget_code);

-- --- budget_lines: rename PK, add the month_1..month_12 shape the controller actually writes ---
ALTER TABLE public.budget_lines RENAME COLUMN budget_line_id TO id;
ALTER TABLE public.budget_lines ALTER COLUMN annual_amount DROP NOT NULL;
ALTER TABLE public.budget_lines ALTER COLUMN annual_amount SET DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS account_name VARCHAR(200);
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS line_description TEXT;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS period_type VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_1 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_2 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_3 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_4 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_5 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_6 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_7 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_8 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_9 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_10 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_11 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS month_12 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS allocation_method VARCHAR(20) DEFAULT 'MANUAL';
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS annual_total DECIMAL(15,2)
  GENERATED ALWAYS AS (
    COALESCE(month_1,0) + COALESCE(month_2,0) + COALESCE(month_3,0) + COALESCE(month_4,0) +
    COALESCE(month_5,0) + COALESCE(month_6,0) + COALESCE(month_7,0) + COALESCE(month_8,0) +
    COALESCE(month_9,0) + COALESCE(month_10,0) + COALESCE(month_11,0) + COALESCE(month_12,0)
  ) STORED;

-- --- variance_analysis: add budget_id + variance_severity the controller reads (no write path
--     populates this table yet in the routed controller — same class of gap as depreciation
--     schedule generation in Fixed Assets; adding these so the read queries don't error) ---
ALTER TABLE public.variance_analysis ADD COLUMN IF NOT EXISTS budget_id INTEGER REFERENCES public.budgets(id);
ALTER TABLE public.variance_analysis ADD COLUMN IF NOT EXISTS variance_severity VARCHAR(20);
