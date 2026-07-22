-- 140_pf_profiles.sql
-- ProjectFlow PM Engine — Phase 7 (project profiles)
--
-- The profile bundle itself (terminology, starter WBS, defaults) lives in
-- code (backend/src/modules/pf-engine/profiles.ts), not the database -
-- it's config the app ships with, not tenant-editable data. This migration
-- only adds the one column that records which profile a project has picked.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pf_profile_id VARCHAR(30) NOT NULL DEFAULT 'general'
    CHECK (pf_profile_id IN ('construction', 'general', 'professional_services', 'events'));
