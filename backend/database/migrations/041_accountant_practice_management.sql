-- ============================================================================
-- Migration 041: Accountant Practice Management
-- Xero/QuickBooks style: Jobs, Time Tracking, Compliance Calendar
-- ============================================================================

-- Jobs / Work items per client
CREATE TABLE IF NOT EXISTS accountant_jobs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID         NOT NULL REFERENCES accountant_firms(id) ON DELETE CASCADE,
  client_tenant_id  UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_to       UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_by        UUID         REFERENCES users(id) ON DELETE SET NULL,
  title             VARCHAR(255) NOT NULL,
  job_type          VARCHAR(100) NOT NULL DEFAULT 'other',
  -- tax_return | annual_accounts | vat_return | payroll | audit | bookkeeping | advisory | management_accounts | other
  description       TEXT,
  status            VARCHAR(50)  NOT NULL DEFAULT 'not_started',
  -- not_started | in_progress | review | completed | cancelled | on_hold
  priority          VARCHAR(20)  NOT NULL DEFAULT 'medium',
  -- low | medium | high | urgent
  due_date          DATE,
  start_date        DATE,
  period_start      DATE,
  period_end        DATE,
  estimated_hours   DECIMAL(8,2),
  billing_type      VARCHAR(30)  DEFAULT 'hourly',
  -- hourly | fixed | included | none
  billing_rate      DECIMAL(10,2),
  fixed_fee         DECIMAL(10,2),
  notes             TEXT,
  completed_at      TIMESTAMP,
  created_at        TIMESTAMP    DEFAULT NOW(),
  updated_at        TIMESTAMP    DEFAULT NOW()
);

-- Time entries (WIP - work in progress)
CREATE TABLE IF NOT EXISTS accountant_time_entries (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID         NOT NULL REFERENCES accountant_firms(id) ON DELETE CASCADE,
  job_id            UUID         REFERENCES accountant_jobs(id) ON DELETE SET NULL,
  client_tenant_id  UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE         NOT NULL DEFAULT CURRENT_DATE,
  hours             DECIMAL(8,2) NOT NULL,
  description       TEXT         NOT NULL,
  billable          BOOLEAN      DEFAULT TRUE,
  rate              DECIMAL(10,2),
  amount            DECIMAL(12,2),  -- stored as hours * rate, updated on insert/update
  invoiced          BOOLEAN      DEFAULT FALSE,
  created_at        TIMESTAMP    DEFAULT NOW(),
  updated_at        TIMESTAMP    DEFAULT NOW()
);

-- Compliance calendar items (SARS / statutory deadlines per client)
CREATE TABLE IF NOT EXISTS accountant_compliance_items (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id              UUID         NOT NULL REFERENCES accountant_firms(id) ON DELETE CASCADE,
  client_tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_to          UUID         REFERENCES users(id) ON DELETE SET NULL,
  compliance_type      VARCHAR(100) NOT NULL DEFAULT 'other',
  -- vat_201 | emp201 | emp501 | itr12 | itr14 | provisional_tax | cipc_annual | annual_return | other
  title                VARCHAR(255) NOT NULL,
  description          TEXT,
  due_date             DATE         NOT NULL,
  period_start         DATE,
  period_end           DATE,
  status               VARCHAR(50)  NOT NULL DEFAULT 'pending',
  -- pending | in_progress | submitted | completed | overdue | na
  submission_reference VARCHAR(255),
  notes                TEXT,
  job_id               UUID         REFERENCES accountant_jobs(id) ON DELETE SET NULL,
  created_at           TIMESTAMP    DEFAULT NOW(),
  updated_at           TIMESTAMP    DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acj_firm       ON accountant_jobs(firm_id);
CREATE INDEX IF NOT EXISTS idx_acj_client     ON accountant_jobs(client_tenant_id);
CREATE INDEX IF NOT EXISTS idx_acj_status     ON accountant_jobs(status);
CREATE INDEX IF NOT EXISTS idx_acj_due        ON accountant_jobs(due_date);
CREATE INDEX IF NOT EXISTS idx_acj_assigned   ON accountant_jobs(assigned_to);

CREATE INDEX IF NOT EXISTS idx_acte_firm      ON accountant_time_entries(firm_id);
CREATE INDEX IF NOT EXISTS idx_acte_job       ON accountant_time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_acte_client    ON accountant_time_entries(client_tenant_id);
CREATE INDEX IF NOT EXISTS idx_acte_user      ON accountant_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_acte_date      ON accountant_time_entries(date);
CREATE INDEX IF NOT EXISTS idx_acte_invoiced  ON accountant_time_entries(invoiced);

CREATE INDEX IF NOT EXISTS idx_acci_firm      ON accountant_compliance_items(firm_id);
CREATE INDEX IF NOT EXISTS idx_acci_client    ON accountant_compliance_items(client_tenant_id);
CREATE INDEX IF NOT EXISTS idx_acci_due       ON accountant_compliance_items(due_date);
CREATE INDEX IF NOT EXISTS idx_acci_status    ON accountant_compliance_items(status);
CREATE INDEX IF NOT EXISTS idx_acci_type      ON accountant_compliance_items(compliance_type);
