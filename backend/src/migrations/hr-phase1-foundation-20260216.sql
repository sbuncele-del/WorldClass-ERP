-- ============================================================================
-- HR PHASE 1 FOUNDATION FIXES (2026-02-16)
-- Creates missing HR tables required by current controller/service logic.
-- Safe to run multiple times.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS hr;

-- ==========================================================================
-- EMPLOYEE LEAVE BALANCES
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.employee_leave_balances (
    balance_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id INTEGER NOT NULL,
    leave_type_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    opening_balance DECIMAL(8,2) DEFAULT 0,
    accrued DECIMAL(8,2) DEFAULT 0,
    taken DECIMAL(8,2) DEFAULT 0,
    adjustment DECIMAL(8,2) DEFAULT 0,
    pending DECIMAL(8,2) DEFAULT 0,
    closing_balance DECIMAL(8,2) DEFAULT 0,
    carryover_from_previous DECIMAL(8,2) DEFAULT 0,
    forfeited DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_employee_leave_balances_tenant_employee
    ON hr.employee_leave_balances (tenant_id, employee_id, year);

-- ==========================================================================
-- LEAVE ACCRUAL LOG
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.leave_accrual_log (
    log_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id INTEGER NOT NULL,
    leave_type_id INTEGER NOT NULL,
    accrual_year INTEGER NOT NULL,
    accrual_month INTEGER NOT NULL,
    accrual_amount DECIMAL(8,2) NOT NULL,
    previous_balance DECIMAL(8,2),
    new_balance DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, employee_id, leave_type_id, accrual_year, accrual_month)
);

CREATE INDEX IF NOT EXISTS idx_leave_accrual_log_tenant_month
    ON hr.leave_accrual_log (tenant_id, accrual_year, accrual_month);

-- ==========================================================================
-- EMPLOYEE DOCUMENTS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.employee_documents (
    document_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id INTEGER NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    expiry_date DATE,
    is_confidential BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_tenant_employee
    ON hr.employee_documents (tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_documents_tenant_expiry
    ON hr.employee_documents (tenant_id, expiry_date)
    WHERE expiry_date IS NOT NULL;

-- ==========================================================================
-- EMPLOYEE CONTRACTS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.employee_contracts (
    contract_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id INTEGER NOT NULL,
    contract_type VARCHAR(50) NOT NULL,
    contract_number VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    job_title VARCHAR(200) NOT NULL,
    department_id INTEGER,
    reporting_to INTEGER,
    basic_salary DECIMAL(15,2) NOT NULL,
    salary_frequency VARCHAR(20) DEFAULT 'MONTHLY',
    working_hours_per_week INTEGER DEFAULT 40,
    probation_period_months INTEGER DEFAULT 3,
    notice_period_days INTEGER DEFAULT 30,
    benefits JSONB DEFAULT '{}',
    special_conditions TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    termination_reason TEXT,
    terminated_by INTEGER,
    terminated_at TIMESTAMP,
    document_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, contract_number)
);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_tenant_employee
    ON hr.employee_contracts (tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_tenant_status
    ON hr.employee_contracts (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_tenant_end_date
    ON hr.employee_contracts (tenant_id, end_date)
    WHERE end_date IS NOT NULL;

-- ==========================================================================
-- PAYROLL COMPONENTS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.payroll_components (
    component_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    component_code VARCHAR(20) NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    component_type VARCHAR(20) NOT NULL,
    calculation_type VARCHAR(20) DEFAULT 'Fixed',
    amount DECIMAL(15,2) DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    is_taxable BOOLEAN DEFAULT TRUE,
    is_statutory BOOLEAN DEFAULT FALSE,
    gl_account_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, component_code)
);

CREATE INDEX IF NOT EXISTS idx_payroll_components_tenant_type
    ON hr.payroll_components (tenant_id, component_type, is_active);

-- ==========================================================================
-- EMPLOYEE RECURRING COMPONENTS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.employee_recurring_components (
    recurring_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id INTEGER NOT NULL,
    component_id INTEGER NOT NULL,
    employee_amount DECIMAL(15,2),
    employee_percentage DECIMAL(5,2),
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_recurring_components_tenant_employee
    ON hr.employee_recurring_components (tenant_id, employee_id, is_active);

-- ==========================================================================
-- PAYROLL RUN DETAILS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.payroll_run_details (
    detail_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    run_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    basic_salary DECIMAL(15,2) DEFAULT 0,
    gross_pay DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    net_pay DECIMAL(15,2) DEFAULT 0,
    paye_tax DECIMAL(15,2) DEFAULT 0,
    uif_deduction DECIMAL(15,2) DEFAULT 0,
    sdl_amount DECIMAL(15,2) DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    overtime_pay DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_run_details_tenant_run
    ON hr.payroll_run_details (tenant_id, run_id);

-- ==========================================================================
-- PAYROLL RUN LINES
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.payroll_run_lines (
    line_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    detail_id INTEGER NOT NULL,
    component_id INTEGER,
    line_type VARCHAR(20) NOT NULL,
    description VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    is_taxable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payroll_run_lines_tenant_detail
    ON hr.payroll_run_lines (tenant_id, detail_id, line_type);

-- ==========================================================================
-- SARS TAX BRACKETS (optional lookup table)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.sars_tax_brackets (
    bracket_id SERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    min_income DECIMAL(15,2) NOT NULL,
    max_income DECIMAL(15,2),
    rate DECIMAL(5,2) NOT NULL,
    base_tax DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tax_year, min_income)
);

-- ==========================================================================
-- ATTENDANCE RECORDS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr.attendance_records (
    attendance_id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id INTEGER NOT NULL,
    attendance_date DATE NOT NULL,
    clock_in_time TIME,
    clock_out_time TIME,
    hours_worked DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Present',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_employee_date
    ON hr.attendance_records (tenant_id, employee_id, attendance_date DESC);

-- ==========================================================================
-- Seed default payroll components for any tenant missing them
-- ==========================================================================
WITH tenant_components AS (
  SELECT
    t.id as tenant_id,
    v.component_code,
    v.component_name,
    v.component_type,
    v.calculation_type,
    v.is_taxable,
    v.is_statutory
  FROM tenants t
  CROSS JOIN (
    VALUES
      ('BASIC', 'Basic Salary', 'Earning', 'Fixed', true, false),
      ('OVERTIME', 'Overtime Pay', 'Earning', 'Fixed', true, false),
      ('COMMISSION', 'Commission', 'Earning', 'Fixed', true, false),
      ('BONUS', 'Performance Bonus', 'Earning', 'Fixed', true, false),
      ('TRAVEL', 'Travel Allowance', 'Earning', 'Fixed', true, false),
      ('HOUSING', 'Housing Allowance', 'Earning', 'Fixed', true, false),
      ('MEDICAL', 'Medical Aid Contribution', 'Deduction', 'Fixed', false, false),
      ('PENSION', 'Pension Fund Contribution', 'Deduction', 'Percentage', false, false),
      ('PROVIDENT', 'Provident Fund Contribution', 'Deduction', 'Percentage', false, false),
      ('LOAN', 'Loan Repayment', 'Deduction', 'Fixed', false, false)
  ) AS v(component_code, component_name, component_type, calculation_type, is_taxable, is_statutory)
)
INSERT INTO hr.payroll_components (
  tenant_id, component_code, component_name, component_type, calculation_type, is_taxable, is_statutory
)
SELECT
  tc.tenant_id,
  tc.component_code,
  tc.component_name,
  tc.component_type,
  tc.calculation_type,
  tc.is_taxable,
  tc.is_statutory
FROM tenant_components tc
WHERE NOT EXISTS (
  SELECT 1
  FROM hr.payroll_components pc
  WHERE pc.tenant_id = tc.tenant_id
    AND pc.component_code = tc.component_code
);
