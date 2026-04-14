-- ============================================================================
-- Siyabusa Financial Reporting Platform - Database Schema
-- Module: reporting.siyabusaerp.co.za
-- Purpose: Standalone financial statement preparation, trial balance management,
--          XBRL submission, and multi-framework reporting
-- ============================================================================

-- Schema for financial reporting workspaces
CREATE SCHEMA IF NOT EXISTS reporting;

-- ============================================================================
-- 1. ENGAGEMENT / CLIENT FILE
-- A "filing" = one client + one financial year. This is the top-level entity.
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_name VARCHAR(255) NOT NULL,
  trading_as VARCHAR(255),
  registration_number VARCHAR(100),
  tax_number VARCHAR(50),
  vat_number VARCHAR(50),
  legal_form VARCHAR(50) NOT NULL DEFAULT 'private_company',
  -- CHECK legal_form IN ('private_company','close_corporation','sole_proprietor','trust','npo','npc','partnership','body_corporate')
  nature_of_business TEXT,
  country VARCHAR(100) DEFAULT 'South Africa',
  
  -- Financial year
  financial_year_end DATE NOT NULL,
  financial_year_start DATE NOT NULL,
  comparative_year_end DATE,
  comparative_year_start DATE,
  
  -- Framework selection
  reporting_framework VARCHAR(50) NOT NULL DEFAULT 'ifrs_sme',
  -- CHECK framework IN ('ifrs_full','ifrs_sme','ifrs_sme_plus','ifrs_micro')
  
  -- Working paper type
  working_paper_type VARCHAR(50) DEFAULT 'compilation',
  -- CHECK type IN ('compilation','review','audit','agreed_upon','accounting_officer')
  
  -- Engagement metadata
  engagement_label VARCHAR(255),
  engagement_letter_date DATE,
  date_of_signature DATE,
  financial_statements_approval_date DATE,
  agm_date DATE,
  
  -- Business details
  business_commencement DATE,
  business_address JSONB DEFAULT '{}',
  postal_address JSONB DEFAULT '{}',
  bankers TEXT,
  
  -- Directors / Members / Partners
  directors JSONB DEFAULT '[]',
  -- e.g. [{"name":"Jonathan Chama","designation":"CFA","appointed":"2019-01-01"}]
  
  -- Preparer / Firm info
  preparer_firm_name VARCHAR(255),
  preparer_contact JSONB DEFAULT '{}',
  
  -- Settings
  currency VARCHAR(10) DEFAULT 'ZAR',
  currency_rounding VARCHAR(20) DEFAULT 'decimals',
  -- CHECK rounding IN ('decimals','units','thousands','millions')
  cash_flow_method VARCHAR(20) DEFAULT 'indirect',
  soci_presentation VARCHAR(20) DEFAULT 'function',
  -- CHECK presentation IN ('function','nature')
  materiality NUMERIC(18,2) DEFAULT 0,
  performance_materiality NUMERIC(18,2) DEFAULT 0,
  
  -- Status tracking
  status VARCHAR(30) DEFAULT 'draft',
  -- CHECK status IN ('draft','in_progress','review','approved','submitted','archived')
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,

  CONSTRAINT fk_engagement_tenant FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_engagement_tenant ON reporting.engagements(tenant_id);
CREATE INDEX idx_engagement_status ON reporting.engagements(tenant_id, status);
CREATE INDEX idx_engagement_year ON reporting.engagements(tenant_id, financial_year_end);

-- ============================================================================
-- 2. CHART OF ACCOUNTS TEMPLATE (per engagement)
-- Link numbers map accounts to financial statement line items
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  -- Account identification
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  
  -- Link to financial statement line item
  link_number VARCHAR(50),          -- e.g. 'cl.500.000', 'e.221.000'
  link_description VARCHAR(255),    -- e.g. 'Trade payables', 'Bank charges'
  
  -- Classification
  category VARCHAR(50) NOT NULL,
  -- CHECK category IN ('current_assets','non_current_assets','current_liabilities','non_current_liabilities','equity','revenue','cost_of_sales','expenses','other_income','taxation')
  fs_type VARCHAR(30) NOT NULL DEFAULT 'balance_sheet',
  -- CHECK fs_type IN ('balance_sheet','income_statement')
  
  -- Lead schedule reference
  lead_schedule VARCHAR(20),
  lead_schedule_sub VARCHAR(20),
  
  -- Working paper reference
  wp_ref VARCHAR(20),
  
  -- Balances
  opening_balance NUMERIC(18,2) DEFAULT 0,
  transactions NUMERIC(18,2) DEFAULT 0,
  adjustments NUMERIC(18,2) DEFAULT 0,
  closing_balance NUMERIC(18,2) DEFAULT 0,     -- computed: opening + transactions + adjustments
  prior_year_balance NUMERIC(18,2) DEFAULT 0,
  
  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_linked BOOLEAN DEFAULT false,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_account_link_engagement FOREIGN KEY (engagement_id)
    REFERENCES reporting.engagements(id) ON DELETE CASCADE,
  CONSTRAINT uq_account_engagement UNIQUE (engagement_id, account_code)
);

CREATE INDEX idx_account_links_engagement ON reporting.account_links(engagement_id);
CREATE INDEX idx_account_links_category ON reporting.account_links(engagement_id, category);
CREATE INDEX idx_account_links_link ON reporting.account_links(engagement_id, link_number);

-- ============================================================================
-- 3. LINK MAPPING LIBRARY
-- Master reference: maps link numbers to financial statement positions
-- Each reporting framework has its own set of link mappings
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.link_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework VARCHAR(50) NOT NULL,
  link_number VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  
  -- Financial statement placement
  statement VARCHAR(50) NOT NULL,
  -- CHECK statement IN ('sofp','soci','soce','scf','notes','detailed_is','tax_computation')
  section VARCHAR(100),
  line_item VARCHAR(255),
  
  -- Display
  parent_link VARCHAR(50),
  indent_level INTEGER DEFAULT 0,
  is_subtotal BOOLEAN DEFAULT false,
  is_total BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Debit/Credit behavior
  normal_balance VARCHAR(10) DEFAULT 'debit',
  sign_convention INTEGER DEFAULT 1,  -- 1 or -1

  CONSTRAINT uq_link_framework UNIQUE(framework, link_number)
);

CREATE INDEX idx_link_mappings_framework ON reporting.link_mappings(framework);
CREATE INDEX idx_link_mappings_statement ON reporting.link_mappings(framework, statement);

-- ============================================================================
-- 4. ADJUSTING JOURNAL ENTRIES
-- Audit / year-end adjustments that modify trial balance
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.adjusting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  entry_number VARCHAR(20),
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(100),
  
  -- Entry type
  entry_type VARCHAR(30) DEFAULT 'adjusting',
  -- CHECK type IN ('adjusting','reclassifying','correcting','tax','consolidation')
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',
  -- CHECK status IN ('draft','posted','reviewed','approved','void')
  
  -- Amounts (must balance)
  total_debit NUMERIC(18,2) DEFAULT 0,
  total_credit NUMERIC(18,2) DEFAULT 0,
  
  -- Audit trail
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_adj_entry_engagement FOREIGN KEY (engagement_id)
    REFERENCES reporting.engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_adj_entries_engagement ON reporting.adjusting_entries(engagement_id);

-- ============================================================================
-- 5. ADJUSTING ENTRY LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.adjusting_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entry_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255),
  description TEXT,
  
  debit_amount NUMERIC(18,2) DEFAULT 0,
  credit_amount NUMERIC(18,2) DEFAULT 0,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_adj_line_entry FOREIGN KEY (entry_id)
    REFERENCES reporting.adjusting_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_adj_lines_entry ON reporting.adjusting_entry_lines(entry_id);

-- ============================================================================
-- 6. LEAD SCHEDULES / WORKING PAPERS
-- Supporting documentation for each financial statement line
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.lead_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  schedule_ref VARCHAR(20) NOT NULL,  -- e.g. '35.06', '51.12.08'
  title VARCHAR(255) NOT NULL,
  
  -- Content
  content JSONB DEFAULT '{}',    -- Flexible structured data
  narrative TEXT,                 -- Free-form working paper notes
  
  -- Sign-off workflow
  prepared_by UUID,
  prepared_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  partner_reviewed_by UUID,
  partner_reviewed_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'not_started',
  -- CHECK status IN ('not_started','in_progress','prepared','reviewed','partner_reviewed','exception')
  
  -- Tickmarks
  tickmarks JSONB DEFAULT '[]',
  notes JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_lead_schedule_engagement FOREIGN KEY (engagement_id)
    REFERENCES reporting.engagements(id) ON DELETE CASCADE,
  CONSTRAINT uq_lead_schedule UNIQUE(engagement_id, schedule_ref)
);

CREATE INDEX idx_lead_schedules_engagement ON reporting.lead_schedules(engagement_id);

-- ============================================================================
-- 7. DISCLOSURE CHECKLIST
-- Track compliance with framework disclosure requirements
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.disclosure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  -- Reference (e.g. ISA, IFRS for SMEs section)
  standard_ref VARCHAR(100),
  section VARCHAR(255) NOT NULL,
  detail TEXT,
  
  -- Compliance
  is_applicable BOOLEAN DEFAULT true,
  is_compliant BOOLEAN,
  effective_date DATE,
  comments TEXT,
  sign_off VARCHAR(50),
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_disclosure_engagement FOREIGN KEY (engagement_id)
    REFERENCES reporting.engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_disclosure_engagement ON reporting.disclosure_items(engagement_id);

-- ============================================================================
-- 8. FINANCIAL STATEMENT SNAPSHOTS
-- Generated PDF / rendered statements stored for versioning
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.statement_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  version INTEGER NOT NULL DEFAULT 1,
  statement_type VARCHAR(50) NOT NULL,
  -- CHECK type IN ('full_set','sofp','soci','soce','scf','notes','detailed_is','tax_computation','directors_report','compilation_report')
  
  -- Rendered content
  rendered_html TEXT,
  rendered_data JSONB,
  
  -- PDF storage
  pdf_url VARCHAR(500),
  pdf_s3_key VARCHAR(500),
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID,
  is_draft BOOLEAN DEFAULT true,
  watermark VARCHAR(50) DEFAULT 'Draft',
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_snapshot_engagement FOREIGN KEY (engagement_id)
    REFERENCES reporting.engagements(id) ON DELETE CASCADE
);

CREATE INDEX idx_snapshots_engagement ON reporting.statement_snapshots(engagement_id);
CREATE INDEX idx_snapshots_type ON reporting.statement_snapshots(engagement_id, statement_type);

-- ============================================================================
-- 9. NOTES TO FINANCIAL STATEMENTS
-- Structured note data for each disclosure note
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.financial_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  note_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  
  -- Content (structured + narrative)
  structured_data JSONB DEFAULT '{}',
  narrative TEXT,
  
  -- Applicability
  is_applicable BOOLEAN DEFAULT true,
  is_auto_generated BOOLEAN DEFAULT false,
  
  -- Source link numbers that feed into this note
  source_links JSONB DEFAULT '[]',  -- e.g. ['cl.500.000', 'ca.500.000']
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_note_engagement FOREIGN KEY (engagement_id)
    REFERENCES reporting.engagements(id) ON DELETE CASCADE,
  CONSTRAINT uq_note_number UNIQUE(engagement_id, note_number)
);

CREATE INDEX idx_financial_notes_engagement ON reporting.financial_notes(engagement_id);

-- ============================================================================
-- 10. IMPORT HISTORY
-- Track trial balance imports from external sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  source VARCHAR(50) NOT NULL,
  -- CHECK source IN ('manual','csv','excel','sage','xero','quickbooks','siyabusa_gl','pastel','caseware')
  
  file_name VARCHAR(255),
  file_url VARCHAR(500),
  
  -- Import stats
  accounts_imported INTEGER DEFAULT 0,
  accounts_matched INTEGER DEFAULT 0,
  accounts_unmatched INTEGER DEFAULT 0,
  total_debits NUMERIC(18,2) DEFAULT 0,
  total_credits NUMERIC(18,2) DEFAULT 0,
  is_balanced BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  -- CHECK status IN ('pending','processing','completed','failed','rolled_back')
  error_log TEXT,
  
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  imported_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_history_engagement ON reporting.import_history(engagement_id);

-- ============================================================================
-- 11. XBRL TAXONOMY MAPPINGS
-- Map link numbers to XBRL taxonomy elements for CIPC submission
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.xbrl_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework VARCHAR(50) NOT NULL,
  link_number VARCHAR(50),
  
  xbrl_element VARCHAR(255) NOT NULL,
  xbrl_namespace VARCHAR(255),
  xbrl_period_type VARCHAR(20),  -- 'instant' or 'duration'
  xbrl_balance_type VARCHAR(20), -- 'debit' or 'credit'
  
  taxonomy_version VARCHAR(50),
  
  CONSTRAINT uq_xbrl_mapping UNIQUE(framework, link_number, xbrl_element)
);

CREATE INDEX idx_xbrl_framework ON reporting.xbrl_mappings(framework);

-- ============================================================================
-- 12. ENGAGEMENT AUDIT LOG
-- Track all changes within an engagement
-- ============================================================================
CREATE TABLE IF NOT EXISTS reporting.engagement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  engagement_id UUID NOT NULL,
  
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  
  before_data JSONB,
  after_data JSONB,
  
  performed_by UUID,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_engagement ON reporting.engagement_audit_log(engagement_id);
CREATE INDEX idx_audit_log_performed ON reporting.engagement_audit_log(engagement_id, performed_at);

-- ============================================================================
-- SEED: IFRS for SMEs Link Mappings (South Africa standard)
-- These are the standard link numbers used in SA financial reporting
-- ============================================================================

INSERT INTO reporting.link_mappings (framework, link_number, description, statement, section, line_item, normal_balance, sort_order)
VALUES
  -- STATEMENT OF FINANCIAL POSITION - Assets
  ('ifrs_sme', 'na.100.000', 'Property, plant and equipment', 'sofp', 'non_current_assets', 'Property, plant and equipment', 'debit', 10),
  ('ifrs_sme', 'na.200.000', 'Intangible assets', 'sofp', 'non_current_assets', 'Intangible assets', 'debit', 20),
  ('ifrs_sme', 'na.300.000', 'Investment property', 'sofp', 'non_current_assets', 'Investment property', 'debit', 30),
  ('ifrs_sme', 'na.400.000', 'Investments', 'sofp', 'non_current_assets', 'Investments', 'debit', 40),
  ('ifrs_sme', 'na.500.000', 'Deferred tax asset', 'sofp', 'non_current_assets', 'Deferred tax asset', 'debit', 50),
  ('ifrs_sme', 'na.600.000', 'Long-term receivables', 'sofp', 'non_current_assets', 'Long-term receivables', 'debit', 60),
  
  -- Current Assets
  ('ifrs_sme', 'ca.100.000', 'Inventories', 'sofp', 'current_assets', 'Inventories', 'debit', 100),
  ('ifrs_sme', 'ca.200.000', 'Biological assets', 'sofp', 'current_assets', 'Biological assets', 'debit', 110),
  ('ifrs_sme', 'ca.300.000', 'Current tax receivable', 'sofp', 'current_assets', 'Current tax receivable', 'debit', 120),
  ('ifrs_sme', 'ca.500.000', 'Trade and other receivables', 'sofp', 'current_assets', 'Trade and other receivables', 'debit', 130),
  ('ifrs_sme', 'ca.600.000', 'Prepayments', 'sofp', 'current_assets', 'Prepayments', 'debit', 140),
  ('ifrs_sme', 'c.840.001', 'Cash and cash equivalents', 'sofp', 'current_assets', 'Cash and cash equivalents', 'debit', 150),
  
  -- Equity
  ('ifrs_sme', 'eq.100.000', 'Share capital', 'sofp', 'equity', 'Share capital', 'credit', 200),
  ('ifrs_sme', 'eq.200.000', 'Share premium', 'sofp', 'equity', 'Share premium', 'credit', 210),
  ('ifrs_sme', 'eq.300.000', 'Retained income', 'sofp', 'equity', 'Retained income', 'credit', 220),
  ('ifrs_sme', 'eq.400.000', 'Revaluation reserve', 'sofp', 'equity', 'Revaluation reserve', 'credit', 230),
  ('ifrs_sme', 'eq.500.000', 'Other reserves', 'sofp', 'equity', 'Other reserves', 'credit', 240),
  
  -- Non-Current Liabilities
  ('ifrs_sme', 'nl.100.000', 'Long-term borrowings', 'sofp', 'non_current_liabilities', 'Long-term borrowings', 'credit', 300),
  ('ifrs_sme', 'nl.200.000', 'Finance lease obligations', 'sofp', 'non_current_liabilities', 'Finance lease obligations', 'credit', 310),
  ('ifrs_sme', 'nl.300.000', 'Deferred tax liability', 'sofp', 'non_current_liabilities', 'Deferred tax liability', 'credit', 320),
  ('ifrs_sme', 'nl.400.000', 'Provisions', 'sofp', 'non_current_liabilities', 'Provisions', 'credit', 330),
  ('ifrs_sme', 'nl.500.000', 'Shareholders loan', 'sofp', 'non_current_liabilities', 'Shareholders loan', 'credit', 340),
  
  -- Current Liabilities
  ('ifrs_sme', 'cl.100.000', 'Short-term borrowings', 'sofp', 'current_liabilities', 'Short-term borrowings', 'credit', 400),
  ('ifrs_sme', 'cl.200.000', 'Current portion of long-term debt', 'sofp', 'current_liabilities', 'Current portion of long-term debt', 'credit', 410),
  ('ifrs_sme', 'cl.300.000', 'Current tax liability', 'sofp', 'current_liabilities', 'Current tax liability', 'credit', 420),
  ('ifrs_sme', 'cl.400.000', 'Provisions', 'sofp', 'current_liabilities', 'Provisions', 'credit', 430),
  ('ifrs_sme', 'cl.500.000', 'Trade and other payables', 'sofp', 'current_liabilities', 'Trade and other payables', 'credit', 440),
  ('ifrs_sme', 'cl.600.000', 'Bank overdraft', 'sofp', 'current_liabilities', 'Bank overdraft', 'credit', 450),
  
  -- STATEMENT OF COMPREHENSIVE INCOME
  ('ifrs_sme', 'r.100.000', 'Revenue', 'soci', 'revenue', 'Revenue', 'credit', 500),
  ('ifrs_sme', 'cos.000.001', 'Cost of sales', 'soci', 'cost_of_sales', 'Cost of sales', 'debit', 510),
  ('ifrs_sme', 'oi.100.000', 'Other income', 'soci', 'other_income', 'Other income', 'credit', 520),
  ('ifrs_sme', 'oi.911.500', 'Trade and other payables exchange gain', 'soci', 'other_income', 'Foreign exchange gains', 'credit', 521),
  
  -- Operating Expenses (by function)
  ('ifrs_sme', 'e.100.000', 'Distribution costs', 'soci', 'expenses', 'Distribution costs', 'debit', 600),
  ('ifrs_sme', 'e.200.000', 'Administrative expenses', 'soci', 'expenses', 'Administrative expenses', 'debit', 610),
  ('ifrs_sme', 'e.201.000', 'Contractor fees', 'detailed_is', 'administrative', 'Contractor fees', 'debit', 611),
  ('ifrs_sme', 'e.221.000', 'Bank charges', 'detailed_is', 'administrative', 'Bank charges', 'debit', 612),
  ('ifrs_sme', 'e.232.000', 'Computer expenses', 'detailed_is', 'administrative', 'Computer expenses', 'debit', 613),
  ('ifrs_sme', 'e.266.000', 'Subscriptions', 'detailed_is', 'other', 'Subscriptions', 'debit', 614),
  ('ifrs_sme', 'e.300.000', 'Other expenses', 'soci', 'expenses', 'Other expenses', 'debit', 620),
  ('ifrs_sme', 'e.302.000', 'Advertising', 'detailed_is', 'other', 'Advertising', 'debit', 621),
  ('ifrs_sme', 'e.351.000', 'Entertainment', 'detailed_is', 'other', 'Entertainment', 'debit', 622),
  ('ifrs_sme', 'e.370.000', 'General expenses', 'detailed_is', 'other', 'General expenses', 'debit', 623),
  ('ifrs_sme', 'e.380.000', 'Hire - Equipment', 'detailed_is', 'other', 'Hire - Equipment', 'debit', 624),
  ('ifrs_sme', 'e.390.000', 'Insurance', 'detailed_is', 'other', 'Insurance', 'debit', 625),
  ('ifrs_sme', 'e.401.000', 'Legal expenses', 'detailed_is', 'other', 'Legal expenses', 'debit', 626),
  ('ifrs_sme', 'e.410.000', 'Operating lease expenses', 'detailed_is', 'other', 'Operating lease expenses', 'debit', 627),
  ('ifrs_sme', 'e.450.000', 'Repairs and maintenance', 'detailed_is', 'other', 'Repairs and maintenance', 'debit', 628),
  ('ifrs_sme', 'e.483.000', 'Travel - Local', 'detailed_is', 'other', 'Travel - Local', 'debit', 629),
  
  -- Finance costs
  ('ifrs_sme', 'fc.100.000', 'Finance costs', 'soci', 'finance_costs', 'Finance costs', 'debit', 700),
  ('ifrs_sme', 'fi.100.000', 'Finance income', 'soci', 'finance_income', 'Finance income', 'credit', 710),
  
  -- Tax
  ('ifrs_sme', 'tax.100.000', 'Current tax', 'soci', 'taxation', 'Income tax expense', 'debit', 800),
  ('ifrs_sme', 'tax.200.000', 'Deferred tax', 'soci', 'taxation', 'Deferred tax', 'debit', 810),
  
  -- Cost of Sales detail
  ('ifrs_sme', 'cos.050.000', 'Freight costs', 'detailed_is', 'cost_of_sales', 'Freight costs', 'debit', 511),
  ('ifrs_sme', 'cos.100.000', 'Manufacturing expenses', 'detailed_is', 'cost_of_sales', 'Manufacturing expenses', 'debit', 512),
  ('ifrs_sme', 'cos.200.000', 'Supplies and materials', 'detailed_is', 'cost_of_sales', 'Supplies and materials', 'debit', 513)
  
ON CONFLICT (framework, link_number) DO NOTHING;
