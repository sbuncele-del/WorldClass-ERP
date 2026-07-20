-- 123_journal_entries_entity_fk_fix.sql
--
-- journal_entries.entity_id had a FK to public.entities, a fully dead table -
-- entities and its entire dependent ecosystem (entity_permissions,
-- entity_relationships, entity_settings, healthcare_facilities,
-- inter_entity_transactions) are 100% empty and are not queried by any
-- currently-mounted route (multi-entity.routes.ts uses multi-entity.controller.v2.ts,
-- which exclusively uses legal_entities; the one other reference, in
-- compliance.workspace.controller.ts, already correctly prefers legal_entities
-- and only falls back to entities if legal_entities doesn't exist, which it does).
--
-- legal_entities is the real, live, populated multi-entity table (5 rows).
-- journal_entry_lines.entity_id already correctly FKs to legal_entities(id) -
-- journal_entries.entity_id was the only inconsistent one, and it meant this
-- FK could never be satisfied by any real entity id, breaking any code path
-- that tried to set an entity-scoped journal entry (found via
-- recurring-entries.controller.v2.ts / import-entries.controller.v2.ts).
--
-- This migration repoints journal_entries.entity_id at legal_entities(id) to
-- match journal_entry_lines. It does NOT drop entities or its dependent
-- tables - they're unused dead weight, not touched here since dropping
-- tables is a separate, more destructive decision.

BEGIN;

ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_entity_id_fkey;
ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_entity_id_fkey
  FOREIGN KEY (entity_id) REFERENCES public.legal_entities(id);

COMMIT;
