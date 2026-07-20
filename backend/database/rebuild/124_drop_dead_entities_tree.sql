-- 124_drop_dead_entities_tree.sql
--
-- public.entities and its entire dependent tree were confirmed 100% empty
-- and unused by any currently-mounted route (see 123_journal_entries_entity_fk_fix.sql
-- for the investigation). legal_entities is the real, live multi-entity table.
-- User explicitly authorized dropping this dead subsystem.

BEGIN;

DROP TABLE IF EXISTS public.entity_permissions CASCADE;
DROP TABLE IF EXISTS public.entity_relationships CASCADE;
DROP TABLE IF EXISTS public.entity_settings CASCADE;
DROP TABLE IF EXISTS public.healthcare_facilities CASCADE;
DROP TABLE IF EXISTS public.inter_entity_transactions CASCADE;
DROP TABLE IF EXISTS public.entities CASCADE;

COMMIT;
