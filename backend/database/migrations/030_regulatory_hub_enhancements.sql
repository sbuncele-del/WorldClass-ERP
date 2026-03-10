-- ============================================================================
-- Migration 030: Regulatory Hub Enhancements
-- Adds columns and tables for VAT, B-BBEE, CIPC, FICA, POPIA integrations
-- ============================================================================

-- 1) B-BBEE: Add demographic columns to hr.employees
ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS race VARCHAR(30);
ALTER TABLE hr.employees ADD COLUMN IF NOT EXISTS disability_status VARCHAR(20) DEFAULT 'No';

COMMENT ON COLUMN hr.employees.race IS 'B-BBEE demographic: African, Coloured, Indian, White';
COMMENT ON COLUMN hr.employees.disability_status IS 'B-BBEE disability: Yes/No';

-- 2) FICA: Customer Due Diligence table
CREATE TABLE IF NOT EXISTS fica_customer_due_diligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID,
  customer_name VARCHAR(255) NOT NULL,
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  verification_status VARCHAR(30) DEFAULT 'pending',
  risk_rating VARCHAR(20) DEFAULT 'low',
  verified_date TIMESTAMP,
  verified_by UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fica_cdd_tenant
  ON fica_customer_due_diligence (tenant_id, verification_status);

-- 3) FICA: Suspicious Transaction Reports
CREATE TABLE IF NOT EXISTS fica_suspicious_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  report_type VARCHAR(50) NOT NULL DEFAULT 'STR',
  transaction_date DATE,
  amount NUMERIC(14,2),
  description TEXT,
  status VARCHAR(30) DEFAULT 'open',
  reported_to_fic BOOLEAN DEFAULT FALSE,
  fic_reference VARCHAR(100),
  reported_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fica_str_tenant
  ON fica_suspicious_reports (tenant_id, status);

-- 4) POPIA: Data Subject Requests
CREATE TABLE IF NOT EXISTS popia_data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  data_subject_name VARCHAR(255),
  data_subject_email VARCHAR(255),
  description TEXT,
  status VARCHAR(30) DEFAULT 'received',
  due_date DATE,
  completed_date TIMESTAMP,
  assigned_to UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popia_dsr_tenant
  ON popia_data_subject_requests (tenant_id, status);

-- 5) POPIA: Consent Records
CREATE TABLE IF NOT EXISTS popia_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  data_subject_name VARCHAR(255),
  data_subject_email VARCHAR(255),
  purpose VARCHAR(255) NOT NULL,
  consent_given BOOLEAN DEFAULT TRUE,
  consent_date TIMESTAMP DEFAULT NOW(),
  withdrawal_date TIMESTAMP,
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popia_consent_tenant
  ON popia_consent_records (tenant_id);

-- 6) POPIA: Breach Incidents
CREATE TABLE IF NOT EXISTS popia_breach_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  incident_date TIMESTAMP NOT NULL DEFAULT NOW(),
  description TEXT,
  data_affected TEXT,
  records_affected INTEGER DEFAULT 0,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'open',
  reported_to_regulator BOOLEAN DEFAULT FALSE,
  regulator_reference VARCHAR(100),
  remediation_plan TEXT,
  closed_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popia_breach_tenant
  ON popia_breach_incidents (tenant_id, status);

-- 7) POPIA: Data Processing Agreements
CREATE TABLE IF NOT EXISTS popia_processing_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  processor_name VARCHAR(255) NOT NULL,
  purpose VARCHAR(255),
  data_categories TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  document_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popia_dpa_tenant
  ON popia_processing_agreements (tenant_id, is_active);
