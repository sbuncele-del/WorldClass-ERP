-- 136_pf_scope_statement.sql
-- ProjectFlow PM Engine — Phase 1 (WBS & scope)
--
-- One field: the project's scope statement, answering "what must be done."
-- Additive, nullable, no default behaviour change.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pf_scope_statement TEXT;
