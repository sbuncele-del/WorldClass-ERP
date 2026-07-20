-- ============================================================================
-- 126_hr_payroll_missing_tables_schema.sql
-- ============================================================================
-- WHY: The live, mounted HR/Payroll module routes (mounted at /api/v1/hr in
-- src/routes/hr.routes.ts) delegate to three controllers that are confirmed
-- live:
--   - src/modules/hr/controllers/hr.controller.v2.ts
--   - src/modules/hr/controllers/hr.workspace.controller.ts
--   - src/modules/hr/controllers/hr.compliance.controller.ts (via
--     src/modules/hr/services/employee-documents.service.ts,
--     src/modules/hr/services/payslip.service.ts,
--     src/modules/hr/services/leave-accrual.service.ts,
--     src/modules/hr/services/tax-calculation.service.ts)
--
-- `psql \dt hr.*` confirms only 7 tables exist in the hr schema:
--   hr.departments, hr.employees, hr.leave_requests, hr.leave_types,
--   hr.payroll_periods, hr.payroll_runs, hr.positions
--
-- But the controllers/services above reference 9 additional hr.* tables that
-- do NOT exist, so every endpoint touching them 500s with "relation does not
-- exist":
--   hr.attendance_records, hr.employee_contracts, hr.employee_documents,
--   hr.employee_leave_balances, hr.employee_recurring_components,
--   hr.payroll_components, hr.payroll_run_details, hr.payroll_run_lines,
--   hr.leave_accrual_log
-- (leave_accrual_log was not in the original 8-table list handed to this
-- migration's author -- it surfaced while reading
-- leave-accrual.service.ts::processMonthlyAccruals, which both reads and
-- writes it every time POST /api/hr/leave/process-accruals runs. It is
-- included here because omitting it would leave that endpoint broken too.)
--
-- PK/FK type verification: live `psql \d` access was not available in this
-- environment. Instead, the real column/PK definitions for the 7 existing
-- tables were located and read directly from
-- /comprehensive-production-migration.sql (the tenant-scoped schema that
-- matches what the controllers query: tenant_id UUID NOT NULL DEFAULT
-- '00000000-0000-0000-0000-000000000001' on every hr.* table, plus
-- SERIAL/INTEGER PKs department_id, position_id, employee_id, period_id,
-- run_id, leave_type_id, request_id). All FKs below to existing hr.* tables
-- use INTEGER to match those confirmed PK types.
--
-- Referenced by:
--   backend/src/modules/hr/controllers/hr.controller.v2.ts (processPayroll,
--     getPayrollRunDetails, postPayrollToGL, createLeaveRequest,
--     processLeaveRequest, getLeaveBalances, recordAttendance,
--     getAttendanceRecords, getPayrollRuns)
--   backend/src/modules/hr/controllers/hr.compliance.controller.ts
--     (checkBCEACompliance, getComplianceReport)
--   backend/src/modules/hr/services/employee-documents.service.ts
--   backend/src/modules/hr/services/payslip.service.ts
--   backend/src/modules/hr/services/leave-accrual.service.ts
--   backend/src/modules/hr/services/tax-calculation.service.ts
--     (generateIRP5Data, generateEMP501Data)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. hr.payroll_components
-- ============================================================================
-- Column source map (hr.controller.v2.ts::processPayroll, joined as `pc`):
--   pc.component_name, pc.component_type ('Earning'|'Deduction'),
--   pc.calculation_type ('Fixed'|'Percentage', lower-cased in JS),
--   pc.amount, pc.percentage, pc.is_taxable
-- Also read (component_name only) by payslip.service.ts when building
-- earnings/deductions line descriptions.
-- component_id is the PK (FK target from employee_recurring_components and
-- payroll_run_lines below).
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.payroll_components (
  component_id     SERIAL PRIMARY KEY,
  tenant_id         UUID NOT NULL,

  component_name    VARCHAR(255) NOT NULL,
  component_type    VARCHAR(20) NOT NULL, -- 'Earning' | 'Deduction'
  calculation_type  VARCHAR(20) NOT NULL DEFAULT 'Fixed', -- 'Fixed' | 'Percentage'
  amount            NUMERIC(15,2) DEFAULT 0.00,
  percentage        NUMERIC(6,3) DEFAULT 0,
  is_taxable        BOOLEAN NOT NULL DEFAULT true,
  is_active         BOOLEAN NOT NULL DEFAULT true,

  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_components_tenant ON hr.payroll_components(tenant_id);

-- ============================================================================
-- 2. hr.employee_recurring_components
-- ============================================================================
-- Column source map (hr.controller.v2.ts::processPayroll, joined as `erc`):
--   erc.employee_id, erc.component_id, erc.employee_amount,
--   erc.employee_percentage, erc.effective_date, erc.end_date, erc.is_active
--   Query: WHERE erc.tenant_id = $1 AND erc.employee_id = $2 AND
--     erc.is_active = true AND (erc.effective_date IS NULL OR
--     erc.effective_date <= period.end_date) AND (erc.end_date IS NULL OR
--     erc.end_date >= period.end_date)
-- recurring_component_id is a surrogate PK (not referenced by name anywhere
-- in the controller -- only selected via erc.*).
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.employee_recurring_components (
  recurring_component_id  SERIAL PRIMARY KEY,
  tenant_id                UUID NOT NULL,

  employee_id              INTEGER NOT NULL REFERENCES hr.employees(employee_id),
  component_id             INTEGER NOT NULL REFERENCES hr.payroll_components(component_id),

  employee_amount          NUMERIC(15,2),
  employee_percentage      NUMERIC(6,3),
  effective_date           DATE,
  end_date                 DATE,
  is_active                BOOLEAN NOT NULL DEFAULT true,

  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hr_erc_tenant ON hr.employee_recurring_components(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_erc_employee ON hr.employee_recurring_components(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_erc_component ON hr.employee_recurring_components(component_id);

-- ============================================================================
-- 3. hr.payroll_run_details
-- ============================================================================
-- Column source map (hr.controller.v2.ts::processPayroll INSERT + RETURNING
-- detail_id; postPayrollToGL SUM(paye_tax)/SUM(uif_deduction);
-- getPayrollRuns LATERAL join reads prd.sdl_amount (column exists in the
-- query even though no INSERT in this codebase currently populates it --
-- kept nullable/defaulted so that read doesn't 500, flagged below);
-- payslip.service.ts / tax-calculation.service.ts also read
-- prd.gross_pay/paye_tax/uif_deduction/net_pay/basic_salary):
--   tenant_id, run_id, employee_id, basic_salary, gross_pay,
--   total_deductions, net_pay, paye_tax, uif_deduction, created_at
-- run_id FKs to hr.payroll_runs(run_id) -- confirmed INTEGER/SERIAL PK from
-- comprehensive-production-migration.sql.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.payroll_run_details (
  detail_id         SERIAL PRIMARY KEY,
  tenant_id          UUID NOT NULL,

  run_id             INTEGER NOT NULL REFERENCES hr.payroll_runs(run_id) ON DELETE CASCADE,
  employee_id        INTEGER NOT NULL REFERENCES hr.employees(employee_id),

  basic_salary       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  gross_pay          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_deductions   NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  net_pay            NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  paye_tax           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  uif_deduction      NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  sdl_amount         NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- read by getPayrollRuns LATERAL join; no current INSERT path populates it (see migration report)

  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hr_prd_tenant ON hr.payroll_run_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_prd_run ON hr.payroll_run_details(tenant_id, run_id);
CREATE INDEX IF NOT EXISTS idx_hr_prd_employee ON hr.payroll_run_details(tenant_id, employee_id);

-- ============================================================================
-- 4. hr.payroll_run_lines
-- ============================================================================
-- Column source map (hr.controller.v2.ts::processPayroll INSERTs one line
-- per earning/deduction; getPayrollRunDetails / payslip.service.ts SELECT
-- ordered by prl.line_id and filtered by prl.line_type):
--   tenant_id, detail_id, component_id (nullable -- Basic Salary/PAYE/UIF
--   lines are inserted with component_id = NULL), line_type
--   ('Earning'|'Deduction'), amount, description, created_at
-- detail_id FKs to hr.payroll_run_details(detail_id) created above.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.payroll_run_lines (
  line_id           SERIAL PRIMARY KEY,
  tenant_id          UUID NOT NULL,

  detail_id          INTEGER NOT NULL REFERENCES hr.payroll_run_details(detail_id) ON DELETE CASCADE,
  component_id       INTEGER REFERENCES hr.payroll_components(component_id),

  line_type          VARCHAR(20) NOT NULL, -- 'Earning' | 'Deduction'
  amount             NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  description        VARCHAR(255),

  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hr_prl_tenant ON hr.payroll_run_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_prl_detail ON hr.payroll_run_lines(tenant_id, detail_id);

-- ============================================================================
-- 5. hr.employee_leave_balances
-- ============================================================================
-- Column source map (hr.controller.v2.ts::createLeaveRequest reads
-- closing_balance; processLeaveRequest UPDATEs taken/closing_balance;
-- getLeaveBalances reads opening_balance/accrued/taken/pending/
-- closing_balance; leave-accrual.service.ts::processMonthlyAccruals reads/
-- writes accrued/closing_balance; processYearEndCarryover reads/writes
-- opening_balance/closing_balance/carryover_from_previous/forfeited;
-- hr.compliance.controller.ts::checkBCEACompliance reads closing_balance):
--   tenant_id, employee_id, leave_type_id, year, opening_balance, accrued,
--   taken, adjustment, pending, closing_balance, carryover_from_previous,
--   forfeited
-- Balance lookups are always scoped by (tenant_id, employee_id,
-- leave_type_id, year) so that's the natural uniqueness constraint.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.employee_leave_balances (
  balance_id                SERIAL PRIMARY KEY,
  tenant_id                  UUID NOT NULL,

  employee_id                INTEGER NOT NULL REFERENCES hr.employees(employee_id),
  leave_type_id               INTEGER NOT NULL REFERENCES hr.leave_types(leave_type_id),
  year                        INTEGER NOT NULL,

  opening_balance             NUMERIC(7,2) NOT NULL DEFAULT 0,
  accrued                     NUMERIC(7,2) NOT NULL DEFAULT 0,
  taken                       NUMERIC(7,2) NOT NULL DEFAULT 0,
  adjustment                  NUMERIC(7,2) NOT NULL DEFAULT 0,
  pending                     NUMERIC(7,2) NOT NULL DEFAULT 0,
  closing_balance             NUMERIC(7,2) NOT NULL DEFAULT 0,
  carryover_from_previous     NUMERIC(7,2) NOT NULL DEFAULT 0,
  forfeited                   NUMERIC(7,2) NOT NULL DEFAULT 0,

  created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (tenant_id, employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_hr_elb_tenant ON hr.employee_leave_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_elb_employee ON hr.employee_leave_balances(tenant_id, employee_id);

-- ============================================================================
-- 6. hr.leave_accrual_log
-- ============================================================================
-- Column source map (leave-accrual.service.ts::processMonthlyAccruals --
-- checked to skip employees already accrued this month, then INSERTed after
-- each successful accrual):
--   tenant_id, employee_id, leave_type_id, accrual_year, accrual_month,
--   accrual_amount, previous_balance, new_balance
-- Not one of the originally-flagged 8 missing tables -- found while reading
-- the accrual service, which both SELECTs and INSERTs it on every call to
-- POST /api/hr/leave/process-accruals. Included so that endpoint doesn't
-- also 500.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.leave_accrual_log (
  log_id             SERIAL PRIMARY KEY,
  tenant_id           UUID NOT NULL,

  employee_id         INTEGER NOT NULL REFERENCES hr.employees(employee_id),
  leave_type_id       INTEGER NOT NULL REFERENCES hr.leave_types(leave_type_id),

  accrual_year        INTEGER NOT NULL,
  accrual_month        INTEGER NOT NULL,
  accrual_amount       NUMERIC(7,2) NOT NULL DEFAULT 0,
  previous_balance    NUMERIC(7,2),
  new_balance          NUMERIC(7,2),

  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_accrual_log_tenant ON hr.leave_accrual_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_accrual_log_lookup
  ON hr.leave_accrual_log(tenant_id, employee_id, leave_type_id, accrual_year, accrual_month);

-- ============================================================================
-- 7. hr.employee_documents
-- ============================================================================
-- Column source map (employee-documents.service.ts createDocument /
-- getEmployeeDocuments / deleteDocument / getExpiringDocuments;
-- hr.compliance.controller.ts::getComplianceReport COUNT query):
--   tenant_id, employee_id, document_type, document_name, file_name,
--   file_path, file_size, mime_type, description, expiry_date,
--   is_confidential, uploaded_by, is_deleted, deleted_at, created_at
-- uploaded_by is joined against `users u ON d.uploaded_by = u.id` (INTEGER,
-- matching req.user?.id typed as number) -- no FK constraint added since
-- the users table's schema/ownership is outside this migration's scope.
-- document_id is the PK (FK target from hr.employee_contracts.document_id).
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.employee_documents (
  document_id       SERIAL PRIMARY KEY,
  tenant_id          UUID NOT NULL,

  employee_id        INTEGER NOT NULL REFERENCES hr.employees(employee_id),

  document_type      VARCHAR(50) NOT NULL,
  document_name      VARCHAR(255) NOT NULL,
  file_name          VARCHAR(255) NOT NULL,
  file_path          TEXT NOT NULL,
  file_size          BIGINT,
  mime_type          VARCHAR(100),
  description        TEXT,
  expiry_date        DATE,
  is_confidential    BOOLEAN NOT NULL DEFAULT false,

  uploaded_by        INTEGER,
  is_deleted         BOOLEAN NOT NULL DEFAULT false,
  deleted_at         TIMESTAMP,

  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hr_documents_tenant ON hr.employee_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_employee ON hr.employee_documents(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_expiry ON hr.employee_documents(tenant_id, expiry_date) WHERE is_deleted = false;

-- ============================================================================
-- 8. hr.employee_contracts
-- ============================================================================
-- Column source map (employee-documents.service.ts createContract /
-- getEmployeeContracts / terminateContract / getExpiringContracts;
-- hr.compliance.controller.ts::checkBCEACompliance JOIN reads
-- working_hours_per_week/notice_period_days/contract_type/
-- probation_period_months; getComplianceReport COUNT queries on
-- end_date/status):
--   tenant_id, employee_id, contract_type, contract_number, start_date,
--   end_date, job_title, department_id, reporting_to, basic_salary,
--   salary_frequency, working_hours_per_week, probation_period_months,
--   notice_period_days, benefits, special_conditions, status, document_id,
--   created_by, termination_reason, terminated_by, terminated_at
-- contract_number is generated as `CTR-<year>-<uuid8>` per creation call --
-- business-code uniqueness scoped per tenant per house rule.
-- department_id FKs to hr.departments(department_id); reporting_to FKs to
-- hr.employees(employee_id) (self-referential manager pattern, same as
-- hr.employees.manager_id); document_id FKs to hr.employee_documents
-- (document_id) created above.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.employee_contracts (
  contract_id             SERIAL PRIMARY KEY,
  tenant_id                 UUID NOT NULL,

  employee_id                INTEGER NOT NULL REFERENCES hr.employees(employee_id),

  contract_type              VARCHAR(30) NOT NULL,
  contract_number            VARCHAR(50) NOT NULL,
  start_date                 DATE NOT NULL,
  end_date                   DATE,
  job_title                  VARCHAR(255),
  department_id              INTEGER REFERENCES hr.departments(department_id),
  reporting_to                INTEGER REFERENCES hr.employees(employee_id),
  basic_salary                NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  salary_frequency            VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
  working_hours_per_week      NUMERIC(5,2) DEFAULT 40,
  probation_period_months     INTEGER DEFAULT 3,
  notice_period_days          INTEGER DEFAULT 30,
  benefits                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  special_conditions          TEXT,
  status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | SUPERSEDED | TERMINATED
  document_id                 INTEGER REFERENCES hr.employee_documents(document_id),

  created_by                  INTEGER,
  termination_reason          TEXT,
  terminated_by               INTEGER,
  terminated_at                TIMESTAMP,

  created_at                   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (tenant_id, contract_number)
);

CREATE INDEX IF NOT EXISTS idx_hr_contracts_tenant ON hr.employee_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON hr.employee_contracts(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_status ON hr.employee_contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_end_date ON hr.employee_contracts(tenant_id, end_date) WHERE status = 'ACTIVE';

-- ============================================================================
-- 9. hr.attendance_records
-- ============================================================================
-- Column source map (hr.controller.v2.ts::recordAttendance /
-- getAttendanceRecords):
--   tenant_id, employee_id, attendance_date, clock_in_time (compared with
--   CURRENT_TIME and used in
--   EXTRACT(EPOCH FROM (CURRENT_TIME - clock_in_time)) -> TIME, not
--   TIMESTAMP), clock_out_time (TIME), hours_worked, created_at, created_by
-- attendance_id is the PK (record.attendance_id used in UPDATE ... WHERE
-- attendance_id = $1). One row per employee per day is looked up via
-- `WHERE tenant_id = $1 AND employee_id = $2 AND attendance_date =
-- CURRENT_DATE LIMIT 1`, so UNIQUE(tenant_id, employee_id, attendance_date)
-- matches that access pattern and prevents duplicate clock-in rows.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr.attendance_records (
  attendance_id       SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL,

  employee_id           INTEGER NOT NULL REFERENCES hr.employees(employee_id),
  attendance_date       DATE NOT NULL,
  clock_in_time         TIME,
  clock_out_time        TIME,
  hours_worked          NUMERIC(5,2),

  created_by             INTEGER,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (tenant_id, employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_attendance_tenant ON hr.attendance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee ON hr.attendance_records(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_date ON hr.attendance_records(tenant_id, attendance_date);

COMMIT;
