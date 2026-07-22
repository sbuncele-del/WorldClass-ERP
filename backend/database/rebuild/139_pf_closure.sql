-- 139_pf_closure.sql
-- ProjectFlow PM Engine — Phase 6 (reviews & closure)
--
-- Fills in lifecycle.ts's second soft gate (closureChecklistComplete),
-- which has been hard-coded false since Phase 0. A project must close
-- whichever way it ends - completed, terminated, or cancelled - so the
-- outcome is captured as data, not inferred from "did it finish".

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pf_closure_outcome VARCHAR(20) CHECK (pf_closure_outcome IN ('completed', 'terminated', 'cancelled')),
  ADD COLUMN IF NOT EXISTS pf_closed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS pf_closure_checklist_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  category VARCHAR(30) NOT NULL CHECK (category IN ('contractual', 'administrative', 'financial', 'documentation', 'lessons_learned')),
  label VARCHAR(255) NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_closure_checklist_item_project ON pf_closure_checklist_item(project_id);

-- No file-upload infra involved yet: a document is a reference (title +
-- external link/location), not a stored binary.
CREATE TABLE IF NOT EXISTS pf_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_document_project ON pf_document(project_id);

CREATE TABLE IF NOT EXISTS pf_lessons_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  category VARCHAR(50),
  observation TEXT NOT NULL,
  recommendation TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_lessons_learned_project ON pf_lessons_learned(project_id);
