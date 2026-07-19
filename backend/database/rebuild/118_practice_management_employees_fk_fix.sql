-- 118_practice_management_employees_fk_fix.sql
--
-- 117_practice_management_schema.sql pointed every employee FK at
-- public.employees(employee_id) - but public.employees has ZERO rows in
-- production. The real, populated employee table is hr.employees (6 rows).
-- There are two parallel employees tables in this database (public.employees
-- used by Payroll/Leave/Attendance/Performance modules, hr.employees used by
-- the core HR module) - that split is a separate, bigger finding flagged
-- to the user. This migration only repoints the tables this module created.

BEGIN;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_relationship_manager_id_fkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_relationship_manager_id_fkey
  FOREIGN KEY (relationship_manager_id) REFERENCES hr.employees(employee_id);

ALTER TABLE public.client_projects DROP CONSTRAINT IF EXISTS client_projects_project_manager_id_fkey;
ALTER TABLE public.client_projects ADD CONSTRAINT client_projects_project_manager_id_fkey
  FOREIGN KEY (project_manager_id) REFERENCES hr.employees(employee_id);

ALTER TABLE public.client_projects DROP CONSTRAINT IF EXISTS client_projects_project_partner_id_fkey;
ALTER TABLE public.client_projects ADD CONSTRAINT client_projects_project_partner_id_fkey
  FOREIGN KEY (project_partner_id) REFERENCES hr.employees(employee_id);

ALTER TABLE public.client_projects DROP CONSTRAINT IF EXISTS client_projects_created_by_fkey;
ALTER TABLE public.client_projects ADD CONSTRAINT client_projects_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES hr.employees(employee_id);

ALTER TABLE public.client_projects DROP CONSTRAINT IF EXISTS client_projects_updated_by_fkey;
ALTER TABLE public.client_projects ADD CONSTRAINT client_projects_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES hr.employees(employee_id);

ALTER TABLE public.project_team_members DROP CONSTRAINT IF EXISTS project_team_members_employee_id_fkey;
ALTER TABLE public.project_team_members ADD CONSTRAINT project_team_members_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES hr.employees(employee_id);

ALTER TABLE public.practice_tasks DROP CONSTRAINT IF EXISTS practice_tasks_assigned_to_fkey;
ALTER TABLE public.practice_tasks ADD CONSTRAINT practice_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES hr.employees(employee_id);

ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES hr.employees(employee_id);

ALTER TABLE public.client_interactions DROP CONSTRAINT IF EXISTS client_interactions_employee_id_fkey;
ALTER TABLE public.client_interactions ADD CONSTRAINT client_interactions_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES hr.employees(employee_id);

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
LEFT JOIN hr.employees pm ON cp.project_manager_id = pm.employee_id AND pm.tenant_id = cp.tenant_id;

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
LEFT JOIN hr.employees rm ON c.relationship_manager_id = rm.employee_id AND rm.tenant_id = c.tenant_id
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
