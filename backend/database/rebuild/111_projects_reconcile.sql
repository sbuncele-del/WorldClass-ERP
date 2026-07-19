-- 111_projects_reconcile.sql
-- projects/project_tasks already existed (public schema, both empty) but under different
-- column names/naming (project_id not id, name not project_name/task_name, actual_cost not
-- spent, progress_percentage not progress, no project_code/client_name/is_active at all).

ALTER TABLE public.projects RENAME COLUMN project_id TO id;
ALTER TABLE public.projects RENAME COLUMN name TO project_name;
ALTER TABLE public.projects RENAME COLUMN actual_cost TO spent;
ALTER TABLE public.projects RENAME COLUMN progress_percentage TO progress;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_code VARCHAR(50);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.projects ADD CONSTRAINT projects_tenant_code_key UNIQUE (tenant_id, project_code);

ALTER TABLE public.project_tasks RENAME COLUMN task_id TO id;
ALTER TABLE public.project_tasks RENAME COLUMN name TO task_name;
