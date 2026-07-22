-- 137_pf_change_control.sql
-- ProjectFlow PM Engine — Phase 4 (Earned Value & change control)
--
-- Earned Value itself needs no new tables - it's computed on read from
-- pf_baseline_snapshot (BCWS), pf_progress (BCWP/ACWP) and pf_activity,
-- all of which already exist. This migration is only for change control,
-- which has no home yet.
--
-- The brief's 6-step process (log -> screen -> approve -> update plan ->
-- distribute -> track) is represented here as a practical 3-state machine
-- (logged -> approved/rejected -> implemented) rather than 6 literal
-- database states: steps 4-6 (update the plan, distribute it, track it)
-- happen together as one action - "implement" - when a lightweight tool
-- approves a change, not as separately-gated stages. The UI still walks
-- the user through all six as a labelled sequence.

CREATE TABLE IF NOT EXISTS pf_change_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_number INTEGER NOT NULL,      -- auto-numbered per project by the app layer

  source VARCHAR(20) NOT NULL CHECK (source IN ('scope', 'schedule', 'budget')),
  description TEXT NOT NULL,
  reason TEXT,

  -- Impact, captured at logging time so approval is an informed decision.
  schedule_impact_days NUMERIC(8,2) DEFAULT 0,
  budget_impact NUMERIC(15,2) DEFAULT 0,
  affected_activity_id UUID REFERENCES pf_activity(id) ON DELETE SET NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'logged'
    CHECK (status IN ('logged', 'approved', 'rejected', 'implemented')),

  spin_off_project_id UUID REFERENCES public.projects(id),

  requested_by UUID REFERENCES users(id),
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, change_number)
);
CREATE INDEX IF NOT EXISTS idx_pf_change_request_project ON pf_change_request(project_id);
