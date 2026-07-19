-- ============================================================================
-- 117_practice_management_schema.sql
-- ============================================================================
-- WHY: Live production testing of the Practice Management v2 controllers
-- (src/controllers/v2/practice-projects.controller.v2.ts,
--  practice-time-tracking.controller.v2.ts, practice-client-health.controller.v2.ts,
--  practice-tasks.controller.v2.ts) and the workspace dashboard controller
-- (src/modules/practice/controllers/practice.workspace.controller.ts) failed with:
--   - relation "client_projects" does not exist
--   - relation "time_entries" does not exist
--   - relation "client_interactions" does not exist
--   - relation "appointments" does not exist
--   - column c.relationship_manager_id does not exist (customers table)
--
-- ROOT CAUSE: src/config/practice-integration-migration.ts contains the
-- original (never fully applied, or partially applied) schema for this
-- module, but it predates the tenant_id-scoped v2 controllers and is missing
-- tenant_id on every table, plus several columns the v2 controllers added
-- later (task_id on time_entries, task_title/blockers on practice_tasks,
-- financial_health_score/notes on client_health_log, follow_up_required on
-- client_interactions, assignment_start_date/allocation_percentage on
-- project_team_members, etc). This migration reconstructs that schema,
-- tenant-scoped and column-aligned to the actual v2 controller queries.
--
-- SCOPE NOTE (read before running): the workspace controller
-- (practice.workspace.controller.ts) queries tables named `clients`,
-- `staff`, `invoices`, and a bare `projects` table, and a `time_entries`
-- variant keyed on staff_id/client_id -- a COMPLETELY DIFFERENT naming
-- convention from `customers`/`employees`/`sales_invoices`/`client_projects`/
-- `time_entries(employee_id)` used by every other practice controller in
-- this codebase. Those tables do not exist anywhere in this repo's migration
-- history. This file creates `appointments` (the table explicitly confirmed
-- missing) but deliberately does NOT create `clients`/`staff`/`invoices`/a
-- second `projects` table, to avoid permanently forking the client/employee
-- data model. See the report notes for what to do about this instead.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EXTEND EXISTING customers TABLE
-- ============================================================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS practice_client_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS relationship_manager_id INTEGER,
  ADD COLUMN IF NOT EXISTS service_tier VARCHAR(20) DEFAULT 'Standard',
  ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 75,
  ADD COLUMN IF NOT EXISTS churn_risk VARCHAR(10) DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS last_health_check_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS primary_service_line VARCHAR(50);

-- FK added separately (IF NOT EXISTS pattern via DO block) so re-running is safe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_relationship_manager_id_fkey'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_relationship_manager_id_fkey
      FOREIGN KEY (relationship_manager_id) REFERENCES public.employees(employee_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_relationship_manager ON public.customers(relationship_manager_id);
CREATE INDEX IF NOT EXISTS idx_customers_practice_client ON public.customers(practice_client_id);

-- ============================================================================
-- 2. client_projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.client_projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES public.customers(customer_id),
  project_number VARCHAR(50) NOT NULL,
  project_name VARCHAR(200) NOT NULL,
  project_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'Planning',
  priority VARCHAR(10) DEFAULT 'Medium',

  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,

  budget_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2) DEFAULT 0,
  budget_amount DECIMAL(15,2),
  actual_cost DECIMAL(15,2) DEFAULT 0,
  billed_amount DECIMAL(15,2) DEFAULT 0,

  project_manager_id INTEGER REFERENCES public.employees(employee_id),
  project_partner_id INTEGER REFERENCES public.employees(employee_id),

  description TEXT,
  deliverables TEXT[],
  risks TEXT[],
  notes TEXT,

  completion_percentage INTEGER DEFAULT 0,
  profitability_status VARCHAR(20),
  last_status_update TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES public.employees(employee_id),
  updated_by INTEGER REFERENCES public.employees(employee_id),

  CONSTRAINT uq_client_projects_tenant_number UNIQUE (tenant_id, project_number)
);

CREATE INDEX IF NOT EXISTS idx_client_projects_tenant ON public.client_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_customer ON public.client_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON public.client_projects(status);
CREATE INDEX IF NOT EXISTS idx_client_projects_manager ON public.client_projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_dates ON public.client_projects(start_date, target_end_date);
CREATE INDEX IF NOT EXISTS idx_client_projects_type ON public.client_projects(project_type);

-- ============================================================================
-- 3. project_team_members
-- ============================================================================
-- NOTE (judgment call): practice-projects.controller.v2.ts reads/writes this
-- table using ptm.assignment_id (in SELECT COUNT/ORDER BY) AND `id` (in
-- removeTeamMember's WHERE id = $2) interchangeably -- an inconsistency in
-- the controller itself. Both column names are provided below (`id` is a
-- generated mirror of assignment_id) so every existing query works as written.
CREATE TABLE IF NOT EXISTS public.project_team_members (
  assignment_id SERIAL PRIMARY KEY,
  id INTEGER GENERATED ALWAYS AS (assignment_id) STORED,
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.client_projects(project_id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES public.employees(employee_id),
  role VARCHAR(50) NOT NULL DEFAULT 'Team Member',

  hourly_cost_rate DECIMAL(10,2) DEFAULT 0,
  hourly_billing_rate DECIMAL(10,2) DEFAULT 0,
  allocation_percentage INTEGER DEFAULT 100,

  assignment_start_date DATE DEFAULT CURRENT_DATE,
  assignment_end_date DATE,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_project_team_members_tenant_project_employee_role UNIQUE (tenant_id, project_id, employee_id, role)
);

CREATE INDEX IF NOT EXISTS idx_project_team_tenant ON public.project_team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_team_project ON public.project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_employee ON public.project_team_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_team_active ON public.project_team_members(is_active);

-- ============================================================================
-- 4. practice_tasks
-- ============================================================================
-- NOTE (judgment call): createTask/getAllTasks use `task_name`, but
-- updateTask's allowedFields list uses `task_title`. Both columns are
-- created; application code should be fixed to use one consistently.
-- Similarly updateTask allows `blockers` (not `blocking_issues`).
CREATE TABLE IF NOT EXISTS public.practice_tasks (
  task_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.client_projects(project_id) ON DELETE CASCADE,
  parent_task_id INTEGER REFERENCES public.practice_tasks(task_id),

  task_name VARCHAR(200) NOT NULL,
  task_title VARCHAR(200),
  description TEXT,

  assigned_to INTEGER REFERENCES public.employees(employee_id),

  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,

  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2) DEFAULT 0,

  status VARCHAR(20) DEFAULT 'Not Started',
  completion_percentage INTEGER DEFAULT 0,
  priority VARCHAR(10) DEFAULT 'Medium',

  dependencies INTEGER[],
  blockers TEXT[],
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_practice_tasks_tenant ON public.practice_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_practice_tasks_project ON public.practice_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_practice_tasks_assigned ON public.practice_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_practice_tasks_status ON public.practice_tasks(status);

-- ============================================================================
-- 5. time_entries
-- ============================================================================
-- NOTE (judgment call): createTimeEntry/getAllTimeEntries write/read
-- `task_description`, but rejectTimeEntries updates a column literally named
-- `description`. Both are created so existing queries succeed.
-- NOTE (judgment call): `approved_by` (set from req.body.approved_by in
-- approveTimeEntries) is typed as UUID here on the assumption it holds a
-- users.id (auth user), matching getTenantContext()'s userId. If it is
-- actually meant to be an employees.employee_id (INTEGER), change this.
CREATE TABLE IF NOT EXISTS public.time_entries (
  entry_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.client_projects(project_id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES public.employees(employee_id),
  task_id INTEGER REFERENCES public.practice_tasks(task_id),

  entry_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  billable BOOLEAN DEFAULT true,

  task_description TEXT,
  description TEXT,

  status VARCHAR(20) DEFAULT 'Pending',
  approved_by UUID,
  approved_at TIMESTAMP,

  suggested_by_ai BOOLEAN DEFAULT false,
  ai_confidence_score DECIMAL(3,2),
  ai_evidence JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON public.time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON public.time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON public.time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_billable ON public.time_entries(billable);

-- ============================================================================
-- 6. client_interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.client_interactions (
  interaction_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES public.customers(customer_id),
  project_id UUID REFERENCES public.client_projects(project_id),
  employee_id INTEGER REFERENCES public.employees(employee_id),

  interaction_type VARCHAR(50) NOT NULL,
  interaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  summary TEXT,
  notes TEXT,

  sentiment_score DECIMAL(3,2),
  key_topics VARCHAR(100)[],
  action_items TEXT[],

  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_interactions_tenant ON public.client_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_customer ON public.client_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_project ON public.client_interactions(project_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_date ON public.client_interactions(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_interactions_type ON public.client_interactions(interaction_type);

-- ============================================================================
-- 7. client_health_log
-- ============================================================================
-- NOTE: column names aligned to practice-client-health.controller.v2.ts
-- (financial_health_score, not financial_score as in the original
-- practice-integration-migration.ts draft), and `notes` added since it's
-- written both by createProject (practice-projects.controller.v2.ts) and
-- calculateHealthScore.
CREATE TABLE IF NOT EXISTS public.client_health_log (
  log_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES public.customers(customer_id),
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,

  health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  financial_health_score INTEGER,
  engagement_score INTEGER,
  operational_score INTEGER,

  churn_risk VARCHAR(10),
  churn_probability DECIMAL(5,4),
  recommendations TEXT[],
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_health_tenant ON public.client_health_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_health_customer ON public.client_health_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_health_date ON public.client_health_log(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_health_score ON public.client_health_log(health_score);
CREATE INDEX IF NOT EXISTS idx_client_health_risk ON public.client_health_log(churn_risk);

-- ============================================================================
-- 8. appointments
-- ============================================================================
-- Referenced only by practice.workspace.controller.ts (getClientAppointments,
-- getClientPortfolio, getPracticeSummary). That controller joins to tables
-- named `clients` and `staff`, which do not exist anywhere in this codebase
-- (the rest of the app uses `customers` / `employees`). We create
-- `appointments` itself (the table Postgres reported missing) with plain,
-- unconstrained client_id/staff_id columns rather than inventing a second,
-- competing client/employee schema. See report notes: the workspace
-- controller's `clients`, `staff`, `invoices`, and bare `projects` queries
-- will still fail until that controller is rewritten to use
-- customers/employees/sales_invoices/client_projects like its siblings.
CREATE TABLE IF NOT EXISTS public.appointments (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  client_id INTEGER,
  staff_id INTEGER,

  appointment_date DATE NOT NULL,
  appointment_time TIME,
  duration_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled',

  subject VARCHAR(200),
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON public.appointments(staff_id);

-- ============================================================================
-- 9. VIEWS (queried directly: `SELECT * FROM v_project_health WHERE tenant_id = $1 ...`
--    and `SELECT * FROM v_client_360 WHERE tenant_id = $1 ...`)
-- ============================================================================
-- Both views are rebuilt from src/config/practice-integration-migration.ts
-- with tenant_id exposed and every join tenant-scoped (the original draft
-- had no tenant_id at all, which would both break the controllers' WHERE
-- clauses and leak data across tenants once client_projects/time_entries/
-- client_interactions became tenant-scoped tables).

CREATE OR REPLACE VIEW public.v_project_health AS
SELECT
  cp.tenant_id,
  cp.project_id,
  cp.project_number,
  cp.project_name,
  cp.customer_id,
  c.customer_name,
  cp.project_type,
  cp.status,
  cp.budget_hours,
  cp.actual_hours,
  CASE
    WHEN cp.budget_hours > 0 THEN ROUND((cp.actual_hours / cp.budget_hours * 100)::numeric, 1)
    ELSE 0
  END AS hours_utilization_percentage,
  cp.budget_amount,
  cp.actual_cost,
  cp.billed_amount,
  CASE
    WHEN cp.billed_amount > 0 THEN ROUND(((cp.billed_amount - cp.actual_cost) / cp.billed_amount * 100)::numeric, 1)
    ELSE 0
  END AS profit_margin_percentage,
  cp.completion_percentage,
  cp.target_end_date,
  CASE
    WHEN cp.target_end_date < CURRENT_DATE AND cp.status NOT IN ('Completed', 'Cancelled')
    THEN 'Overdue'
    WHEN cp.actual_hours > cp.budget_hours * 0.9 AND cp.completion_percentage < 90
    THEN 'At Risk'
    ELSE 'On Track'
  END AS health_status,
  pm.first_name || ' ' || pm.last_name AS project_manager,
  (
    SELECT COUNT(*) FROM public.project_team_members ptm
    WHERE ptm.project_id = cp.project_id AND ptm.tenant_id = cp.tenant_id AND ptm.is_active = true
  ) AS team_size
FROM public.client_projects cp
JOIN public.customers c ON cp.customer_id = c.customer_id AND c.tenant_id = cp.tenant_id
LEFT JOIN public.employees pm ON cp.project_manager_id = pm.employee_id AND pm.tenant_id = cp.tenant_id;

CREATE OR REPLACE VIEW public.v_client_360 AS
SELECT
  c.tenant_id,
  c.customer_id,
  c.customer_name,
  c.health_score,
  c.churn_risk,
  c.service_tier,
  rm.first_name || ' ' || rm.last_name AS relationship_manager,

  COALESCE(SUM(si.total_amount), 0) AS total_revenue_ytd,
  COALESCE(SUM(si.amount_due), 0) AS outstanding_amount,
  COALESCE(SUM(si.total_amount), 0) AS lifetime_value,

  COUNT(DISTINCT cp.project_id) AS total_projects,
  COUNT(DISTINCT CASE WHEN cp.status = 'Active' THEN cp.project_id END) AS active_projects,
  COUNT(DISTINCT CASE WHEN cp.status = 'Completed' THEN cp.project_id END) AS completed_projects,

  COUNT(DISTINCT ci.interaction_id) AS recent_interactions,
  MAX(ci.interaction_date) AS last_interaction_date,
  AVG(ci.sentiment_score) AS avg_sentiment,

  COALESCE(SUM(te.hours), 0) AS total_hours_worked,
  COALESCE(AVG(CURRENT_DATE - si.due_date), 0) AS avg_days_overdue

FROM public.customers c
LEFT JOIN public.employees rm ON c.relationship_manager_id = rm.employee_id AND rm.tenant_id = c.tenant_id
LEFT JOIN public.sales_invoices si ON c.customer_id = si.customer_id AND si.tenant_id = c.tenant_id
  AND si.invoice_date >= DATE_TRUNC('year', CURRENT_DATE)
LEFT JOIN public.client_projects cp ON c.customer_id = cp.customer_id AND cp.tenant_id = c.tenant_id
LEFT JOIN public.client_interactions ci ON c.customer_id = ci.customer_id AND ci.tenant_id = c.tenant_id
  AND ci.interaction_date >= CURRENT_DATE - INTERVAL '90 days'
LEFT JOIN public.time_entries te ON cp.project_id = te.project_id AND te.tenant_id = c.tenant_id
  AND te.entry_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY c.tenant_id, c.customer_id, c.customer_name, c.health_score, c.churn_risk, c.service_tier,
         rm.first_name, rm.last_name;

COMMIT;

-- ============================================================================
-- NOT created by this migration (see scope note above / report to user):
--   clients, staff, invoices, a second `projects` table, and a
--   staff_id/client_id-keyed `time_entries` variant -- all referenced only by
--   practice.workspace.controller.ts, using a naming convention inconsistent
--   with the rest of the codebase (customers/employees/sales_invoices/
--   client_projects/time_entries(employee_id)).
-- ============================================================================
