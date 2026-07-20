-- 128_migration_history_schema.sql
-- migration_history never existed, so every /api/v1/migration/import call
-- failed at the final audit-log INSERT regardless of whether the underlying
-- importer succeeded (masking the real error as "current transaction is
-- aborted"). Built from migration.controller.v2.ts's actual usage.
CREATE TABLE IF NOT EXISTS public.migration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  data_type VARCHAR(50) NOT NULL,
  source_platform VARCHAR(50),
  file_name VARCHAR(255),
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  imported_by UUID,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_history_tenant ON public.migration_history(tenant_id, created_at DESC);
