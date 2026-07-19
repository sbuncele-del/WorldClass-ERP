-- 102_module_audit_fixes.sql — gaps found by full module-by-module audit (July 2026)
-- Idempotent. Safe to run regardless of whether 100/101 already ran.
-- Covers: chart_of_accounts, financial.dimensions, financial.tax_settings,
--         bare tax_settings/vat_config, departments, employees, fixed_assets.

-- A. chart_of_accounts.account_category — code (financial.controller.v2, financial.workspace.controller)
--    reads/writes this column; it was never added to the live table.
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS account_category VARCHAR(50);
UPDATE public.chart_of_accounts SET account_category = account_type WHERE account_category IS NULL;

-- B. financial.dimensions — createDimension/getDimensions query this table; never created.
CREATE TABLE IF NOT EXISTS financial.dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  dimension_code VARCHAR(50) NOT NULL,
  dimension_name VARCHAR(200) NOT NULL,
  description TEXT,
  dimension_type VARCHAR(50),
  parent_dimension_id UUID REFERENCES financial.dimensions(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, dimension_code)
);
CREATE INDEX IF NOT EXISTS idx_financial_dimensions_tenant ON financial.dimensions(tenant_id);

-- C. financial.tax_settings — createTaxSetting/getTaxSettings (financial.controller.v2) query this; never created.
CREATE TABLE IF NOT EXISTS financial.tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  tax_code VARCHAR(50) NOT NULL,
  tax_name VARCHAR(200) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_type VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, tax_code)
);
CREATE INDEX IF NOT EXISTS idx_financial_tax_settings_tenant ON financial.tax_settings(tenant_id);

-- D. bare tax_settings / vat_config — a SEPARATE controller (tax-settings.controller.v2, mounted at
--    /financial/tax-settings) queries these unqualified table names, distinct from financial.tax_settings
--    above. Same "tax settings" concept, two different code paths expecting two different tables.
CREATE TABLE IF NOT EXISTS public.tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  vat_enabled BOOLEAN DEFAULT false,
  vat_rate DECIMAL(5,2) DEFAULT 15,
  paye_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS public.vat_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  standard_rate DECIMAL(5,2) DEFAULT 15,
  reduced_rates JSONB DEFAULT '[]',
  exemptions JSONB DEFAULT '[]',
  registration_threshold DECIMAL(15,2) DEFAULT 1000000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- E/F. NOTE: public.departments/public.employees turned out to be unrelated legacy duplicate tables —
--       the app actually queries hr.departments/hr.employees (see section I). Left here harmlessly
--       (idempotent, additive) rather than removed, since some other unaudited code path may still use them.
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS cost_center_code VARCHAR(50);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_title VARCHAR(200);

-- G. fixed_assets.acquisition_cost — createAsset/getAllAssets read/write this; table exists but column missing.
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS acquisition_cost DECIMAL(15,2) DEFAULT 0;

-- H. chart_of_accounts — remaining columns the model (chart-of-accounts.model.ts) expects but the
--    live table never had. Found via live testing after the first pass above.
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS is_system_account BOOLEAN DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS allow_manual_entry BOOLEAN DEFAULT true;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS require_cost_center BOOLEAN DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS allow_foreign_currency BOOLEAN DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS default_tax_code VARCHAR(20);
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS is_tax_relevant BOOLEAN DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS requires_reconciliation BOOLEAN DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'ZAR';
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(18,2) DEFAULT 0;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS current_balance DECIMAL(18,2) DEFAULT 0;

-- I. hr.departments / hr.employees — createDepartment/createEmployee (hr.controller.v2 -> repositories,
--    schema='hr') write these columns; the repositories query hr.departments/hr.employees, NOT the bare
--    public.departments/public.employees tables (which also exist and are unrelated legacy duplicates).
ALTER TABLE hr.departments ADD COLUMN IF NOT EXISTS cost_center_code VARCHAR(50);
ALTER TABLE hr.departments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS job_title VARCHAR(200);
ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS created_by UUID;
