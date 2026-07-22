-- 135_pf_engine_foundations.sql
-- ProjectFlow PM Engine — Phase 0 (Foundations)
--
-- New, dedicated pf_* schema for the PMBOK-aligned scheduling/EVA engine.
-- Deliberately does NOT touch the existing projects/project_tasks/project_milestones
-- tables (src/config/migrations/projects-module.sql) — the live ProjectsHub.tsx
-- experience is unaffected. The engine is additive and lives alongside it until
-- the Phase 6+ swap.
--
-- pf_wbs_element / pf_activity are keyed off the EXISTING public.projects(id),
-- so a project can carry both the old task list and the new engine data during
-- the transition period.

-- ============================================================
-- Lifecycle: add phase tracking to the existing projects table
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pf_lifecycle_phase VARCHAR(20)
    DEFAULT 'define'
    CHECK (pf_lifecycle_phase IN ('define', 'develop', 'plan', 'execute', 'monitor_control', 'close'));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pf_engine_enabled BOOLEAN DEFAULT false;
  -- true once a project has been switched onto the new engine (set in a later phase's
  -- migration path); lets old and new projects coexist in the same tenant.

-- ============================================================
-- Work Breakdown Structure
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_wbs_element (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES pf_wbs_element(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,          -- e.g. "1.2.3", auto-numbered by the app layer
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, code)
);
CREATE INDEX IF NOT EXISTS idx_pf_wbs_element_project ON pf_wbs_element(project_id);
CREATE INDEX IF NOT EXISTS idx_pf_wbs_element_parent ON pf_wbs_element(parent_id);

-- ============================================================
-- Activities (the schedulable unit — leaves of the WBS)
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  wbs_element_id UUID NOT NULL REFERENCES pf_wbs_element(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,

  -- PERT three-point estimate (days). duration_days is the PERT-weighted tE
  -- once optimistic/most-likely/pessimistic are all set; otherwise it's a
  -- plain estimate.
  optimistic_days NUMERIC(8,2),
  most_likely_days NUMERIC(8,2),
  pessimistic_days NUMERIC(8,2),
  duration_days NUMERIC(8,2) NOT NULL DEFAULT 1,

  -- Computed by the CPM service (Phase 2) — nullable until first computed.
  early_start DATE,
  early_finish DATE,
  late_start DATE,
  late_finish DATE,
  total_float NUMERIC(8,2),
  is_critical BOOLEAN DEFAULT false,

  status VARCHAR(20) DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'complete', 'on_hold')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_activity_project ON pf_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_pf_activity_wbs ON pf_activity(wbs_element_id);

-- ============================================================
-- Dependencies (the network graph)
-- Phase 0/2 ship Finish-to-Start only in the UI; the type column exists now
-- so SS/FF/SF + lag can layer in later without a migration.
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_dependency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  predecessor_id UUID NOT NULL REFERENCES pf_activity(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES pf_activity(id) ON DELETE CASCADE,
  dependency_type VARCHAR(2) NOT NULL DEFAULT 'FS'
    CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (predecessor_id, successor_id),
  CHECK (predecessor_id <> successor_id)
);
CREATE INDEX IF NOT EXISTS idx_pf_dependency_predecessor ON pf_dependency(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_pf_dependency_successor ON pf_dependency(successor_id);

-- ============================================================
-- Resources & assignments (Phase 3 uses these; table exists from Phase 0)
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_resource (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),   -- nullable: a resource may be a crew/plant, not a user
  name VARCHAR(255) NOT NULL,
  cost_per_hour NUMERIC(12,2) NOT NULL DEFAULT 0,
  productivity_factor NUMERIC(5,2) NOT NULL DEFAULT 1.0,  -- 1.0 = 100% of standard rate
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_resource_tenant ON pf_resource(tenant_id);

CREATE TABLE IF NOT EXISTS pf_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES pf_activity(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES pf_resource(id) ON DELETE CASCADE,
  planned_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (activity_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_pf_assignment_activity ON pf_assignment(activity_id);

-- ============================================================
-- Baseline (Phase 3 freezes one; Phase 4 measures variance against it)
-- Header + per-activity snapshot lines, same pattern as journal_entries/lines.
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  frozen_at TIMESTAMPTZ DEFAULT now(),
  frozen_by UUID REFERENCES users(id),
  UNIQUE (project_id, version)
);
CREATE INDEX IF NOT EXISTS idx_pf_baseline_project ON pf_baseline(project_id);

CREATE TABLE IF NOT EXISTS pf_baseline_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID NOT NULL REFERENCES pf_baseline(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES pf_activity(id) ON DELETE CASCADE,
  planned_start DATE NOT NULL,
  planned_finish DATE NOT NULL,
  planned_cost NUMERIC(15,2) NOT NULL DEFAULT 0,   -- feeds BCWS
  UNIQUE (baseline_id, activity_id)
);
CREATE INDEX IF NOT EXISTS idx_pf_baseline_snapshot_baseline ON pf_baseline_snapshot(baseline_id);

-- ============================================================
-- Progress (Phase 4 computes BCWP/ACWP from this; table exists from Phase 0)
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES pf_activity(id) ON DELETE CASCADE,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100),
  actual_cost NUMERIC(15,2) NOT NULL DEFAULT 0,     -- feeds ACWP
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (activity_id, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_pf_progress_activity ON pf_progress(activity_id);

-- ============================================================
-- Lifecycle transition log (soft-gate audit trail — who moved the project
-- from one phase to the next, and when)
-- ============================================================
CREATE TABLE IF NOT EXISTS pf_lifecycle_transition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_phase VARCHAR(20),
  to_phase VARCHAR(20) NOT NULL,
  transitioned_by UUID REFERENCES users(id),
  transitioned_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_lifecycle_transition_project ON pf_lifecycle_transition(project_id);
