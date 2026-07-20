-- ============================================================================
-- 122_recurring_import_entries_schema.sql
-- ============================================================================
-- WHY: Live production testing of the tenant-hardened V2 controllers
--   - src/controllers/recurring-entries.controller.v2.ts
--   - src/controllers/import-entries.controller.v2.ts
-- failed with relations not existing:
--   - recurring_journal_entries
--   - recurring_journal_entry_lines
--   - recurring_entry_history
--   - import_templates
--   - import_history
--
-- ROOT CAUSE: src/config/recurring-entries-migration.ts and
-- src/config/import-history-migration.ts contain draft schemas that predate
-- the tenant-scoped V2 controllers. Neither draft was ever applied to
-- production, and both are missing tenant_id (recurring-entries-migration.ts
-- has none at all; import-history-migration.ts only creates
-- journal_entry_imports, a table name the V2 controller never queries -- it
-- queries import_history and import_templates instead). This migration
-- reconstructs the schema tenant-scoped and column-aligned to the actual V2
-- controller queries, ignoring the stale drafts' table/column choices.
--
-- SCOPE NOTE: journal_entries / journal_entry_lines / chart_of_accounts are
-- NOT touched here -- they are assumed to already exist in production (the
-- V2 controllers read/write them successfully for other modules). However,
-- see the AMBIGUITY note below: this codebase has at least THREE mutually
-- inconsistent column conventions for journal_entries across controllers:
--   1. recurring-entries.controller.v2.ts / import-entries.controller.v2.ts
--      (this migration's scope): id, journal_date, source_type, source_id,
--      total_debit, total_credit, entity_id
--   2. take-on-balances.controller.v2.ts: entry_date (not journal_date),
--      source (not source_type), no entity_id
--   3. migration.controller.v2.ts importOpeningBalances(): entry_date,
--      reference, account_code/account_name/debit/credit written directly
--      onto journal_entries (no journal_entry_lines at all), source,
--      no created_by
--   4. logistics-fuel.controller.v2.ts: entry_id (not id) as PK, entry_date,
--      source_module (not source_type), no status/total_debit/total_credit
--      in the INSERT, and journal_entry_lines keyed on entry_id (not
--      journal_entry_id) with NO tenant_id/account_code/entity_id columns.
-- These four modules cannot all be querying the same physical table without
-- three of them failing at runtime. This is flagged for separate
-- investigation -- out of scope for this migration, which only covers the
-- recurring/import tables confirmed missing.
--
-- Referenced by:
--   backend/src/controllers/recurring-entries.controller.v2.ts
--   backend/src/controllers/import-entries.controller.v2.ts
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. recurring_journal_entries
-- ============================================================================
-- Column source map:
--   id                - PK, UUID (compared as UUID via req.params id against
--                       tenant_id UUID; RETURNING * used as journal id source)
--   tenant_id          - hard rule: every table tenant-scoped
--   template_name      - createRecurringEntry INSERT / updateRecurringEntry
--   description        - createRecurringEntry INSERT; copied onto generated
--                       journal_entries.description in generateEntry()
--   frequency          - 'daily'|'weekly'|'monthly'|'quarterly'|'annual'
--                       (calculateNextOccurrence switch)
--   frequency_config   - JSON.stringify(frequency_config || {}) -> JSONB
--   start_date         - createRecurringEntry INSERT
--   end_date           - createRecurringEntry INSERT/UPDATE; getPendingEntries
--                       filters end_date IS NULL OR end_date >= CURRENT_DATE
--   auto_post          - boolean; determines DRAFT vs POSTED status on generate
--   next_occurrence    - DATE; getPendingEntries filters <= CURRENT_DATE,
--                       getRecurringEntries orders by next_run_date (legacy
--                       alias not used elsewhere -- controller consistently
--                       uses next_occurrence in v2 code paths that touch this
--                       table directly)
--   is_active          - boolean, default true on create; generateEntry
--                       requires is_active = true
--   last_generated     - TIMESTAMP, set NOW() after generateEntry
--   created_by         - UUID, userId from tenant context
--   updated_by         - UUID, set on updateRecurringEntry
--   created_at/updated_at - standard audit columns
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recurring_journal_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,

  template_name     VARCHAR(255) NOT NULL,
  description       TEXT,

  frequency         VARCHAR(20) NOT NULL, -- daily|weekly|monthly|quarterly|annual
  frequency_config  JSONB NOT NULL DEFAULT '{}'::jsonb,

  start_date        DATE NOT NULL,
  end_date          DATE,

  auto_post         BOOLEAN NOT NULL DEFAULT false,
  next_occurrence   DATE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_generated    TIMESTAMP,

  created_by        UUID,
  updated_by        UUID,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recurring_journal_entries
  ADD COLUMN IF NOT EXISTS template_name    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS frequency        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS frequency_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS start_date       DATE,
  ADD COLUMN IF NOT EXISTS end_date         DATE,
  ADD COLUMN IF NOT EXISTS auto_post        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_occurrence  DATE,
  ADD COLUMN IF NOT EXISTS is_active        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_generated   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_by       UUID,
  ADD COLUMN IF NOT EXISTS updated_by       UUID,
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_recurring_journal_entries_tenant
  ON public.recurring_journal_entries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_journal_entries_next_occurrence
  ON public.recurring_journal_entries (tenant_id, next_occurrence)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_journal_entries_status
  ON public.recurring_journal_entries (tenant_id, is_active);

-- ============================================================================
-- 2. recurring_journal_entry_lines
-- ============================================================================
-- Column source map (createRecurringEntry / updateRecurringEntry / generateEntry):
--   id                  - PK, SERIAL/BIGSERIAL (no UUID comparisons on this PK
--                         anywhere in the controller; only ordered/deleted by
--                         recurring_entry_id, so a simple surrogate key suffices)
--   recurring_entry_id  - FK -> recurring_journal_entries(id)
--   account_code        - matched against chart_of_accounts.account_code in
--                         generateEntry()
--   description          - per-line description
--   debit_amount/credit_amount - NUMERIC, default 0
--   cost_center/project_code/department - optional dimension tags
--   line_order          - INTEGER, ORDER BY line_order
-- NOTE: no tenant_id column is denormalized onto this child table in the
-- controller's own queries (it always joins via recurring_entry_id), but the
-- hard tenant-scoping rule for this codebase still applies -- added here and
-- backfilled via join so cross-tenant row leakage isn't possible even if a
-- future query forgets to join.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recurring_journal_entry_lines (
  id                  BIGSERIAL PRIMARY KEY,
  tenant_id           UUID NOT NULL,
  recurring_entry_id  UUID NOT NULL REFERENCES public.recurring_journal_entries(id) ON DELETE CASCADE,

  account_code        VARCHAR(50) NOT NULL,
  description          TEXT,
  debit_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  credit_amount       NUMERIC(14, 2) NOT NULL DEFAULT 0,

  cost_center         VARCHAR(50),
  project_code        VARCHAR(50),
  department          VARCHAR(50),
  line_order          INTEGER NOT NULL DEFAULT 1,

  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recurring_journal_entry_lines
  ADD COLUMN IF NOT EXISTS tenant_id     UUID,
  ADD COLUMN IF NOT EXISTS account_code  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS debit_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_center   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS project_code  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS department    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS line_order    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP NOT NULL DEFAULT NOW();

-- Backfill tenant_id for any pre-existing rows from the parent (safe no-op if empty)
UPDATE public.recurring_journal_entry_lines l
  SET tenant_id = r.tenant_id
  FROM public.recurring_journal_entries r
  WHERE l.recurring_entry_id = r.id AND l.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_journal_entry_lines_entry
  ON public.recurring_journal_entry_lines (recurring_entry_id, line_order);
CREATE INDEX IF NOT EXISTS idx_recurring_journal_entry_lines_tenant
  ON public.recurring_journal_entry_lines (tenant_id);

-- ============================================================================
-- 3. recurring_entry_history
-- ============================================================================
-- Column source map (generateEntry / getRecurringEntryById):
--   id                  - PK, SERIAL/BIGSERIAL
--   recurring_entry_id  - FK -> recurring_journal_entries(id)
--   journal_entry_id    - FK -> journal_entries(id), the entry that was
--                         actually generated
--   generated_date       - TIMESTAMP, NOW() at generation time; ORDER BY
--                         generated_date DESC
--   generated_by        - UUID, userId from tenant context
-- tenant_id added per hard rule (denormalized from parent, same reasoning
-- as recurring_journal_entry_lines).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recurring_entry_history (
  id                  BIGSERIAL PRIMARY KEY,
  tenant_id           UUID NOT NULL,
  recurring_entry_id  UUID NOT NULL REFERENCES public.recurring_journal_entries(id) ON DELETE CASCADE,
  journal_entry_id    UUID,

  generated_date      TIMESTAMP NOT NULL DEFAULT NOW(),
  generated_by        UUID,

  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recurring_entry_history
  ADD COLUMN IF NOT EXISTS tenant_id        UUID,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID,
  ADD COLUMN IF NOT EXISTS generated_date   TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS generated_by     UUID,
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMP NOT NULL DEFAULT NOW();

UPDATE public.recurring_entry_history h
  SET tenant_id = r.tenant_id
  FROM public.recurring_journal_entries r
  WHERE h.recurring_entry_id = r.id AND h.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_entry_history_entry
  ON public.recurring_entry_history (recurring_entry_id, generated_date DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_entry_history_tenant
  ON public.recurring_entry_history (tenant_id);

-- ============================================================================
-- 4. import_templates
-- ============================================================================
-- Column source map (getImportTemplates / saveImportTemplate):
--   id                - PK, UUID
--   tenant_id         - hard rule; also part of UNIQUE(tenant_id, name) --
--                       ON CONFLICT (tenant_id, name) in saveImportTemplate
--                       means the uniqueness constraint MUST be composite,
--                       not a bare UNIQUE(name)
--   name              - template name; conflict target together with tenant_id
--   description       - optional
--   column_mapping    - JSON.stringify(column_mapping) -> JSONB
--   is_system         - boolean; getImportTemplates selects
--                       WHERE tenant_id = $1 OR is_system = true (system
--                       templates are shared across tenants, so tenant_id is
--                       nullable here specifically for is_system rows)
--   created_by        - UUID
--   created_at/updated_at
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.import_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID, -- nullable only for shared is_system = true rows

  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  column_mapping  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system       BOOLEAN NOT NULL DEFAULT false,

  created_by      UUID,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE public.import_templates
  ADD COLUMN IF NOT EXISTS name           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_system      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by     UUID,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'import_templates_tenant_name_key'
  ) THEN
    ALTER TABLE public.import_templates
      ADD CONSTRAINT import_templates_tenant_name_key UNIQUE (tenant_id, name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_templates_tenant
  ON public.import_templates (tenant_id);

-- ============================================================================
-- 5. import_history
-- ============================================================================
-- Column source map (getImportHistory):
--   id             - PK, UUID
--   tenant_id      - hard rule
--   imported_by    - UUID; JOIN users u ON ih.imported_by = u.user_id
--   created_at     - ORDER BY ih.created_at DESC
-- AMBIGUITY: executeImport() (the only place that actually creates journal
-- entries from an import) never INSERTs into import_history or any other
-- audit table -- there is no code path in this controller that writes a
-- history row. getImportHistory() only SELECTs. Columns beyond the ones
-- above (id, tenant_id, imported_by, created_at) are not constrained by any
-- query in this controller. The columns below (file_name, total/valid/
-- invalid line counts, status, entries_created) are inferred from the
-- shape of executeImport()'s response payload and validateImport()'s
-- ValidationResult, as the most likely intended audit fields for a future
-- INSERT INTO import_history that hasn't been wired up yet. Flagged as a
-- functional gap, not a schema-derivation certainty.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.import_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,

  file_name        VARCHAR(255),
  total_lines      INTEGER,
  valid_lines      INTEGER,
  invalid_lines    INTEGER,
  entries_created  INTEGER,
  status           VARCHAR(30) DEFAULT 'completed',

  imported_by      UUID,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE public.import_history
  ADD COLUMN IF NOT EXISTS file_name       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS total_lines     INTEGER,
  ADD COLUMN IF NOT EXISTS valid_lines     INTEGER,
  ADD COLUMN IF NOT EXISTS invalid_lines   INTEGER,
  ADD COLUMN IF NOT EXISTS entries_created INTEGER,
  ADD COLUMN IF NOT EXISTS status          VARCHAR(30) DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS imported_by     UUID,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_import_history_tenant
  ON public.import_history (tenant_id, created_at DESC);

COMMIT;
