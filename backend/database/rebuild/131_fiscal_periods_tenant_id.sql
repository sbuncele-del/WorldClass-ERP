-- fiscal_periods had no tenant_id column at all, unlike fiscal_years (its
-- parent table) which was correctly tenant-scoped from the start. Every
-- query in period.controller.v2.ts and period.service.ts filters by
-- tenant_id, so this table was completely unusable - closing/locking a
-- period, or even just reading the current one, always threw. The table
-- was empty (0 rows) at the time of this fix, so no backfill was needed.
-- Applied directly to the live Neon database; kept here for the rebuild kit.

ALTER TABLE fiscal_periods ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE fiscal_periods ALTER COLUMN tenant_id DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_tenant ON fiscal_periods(tenant_id);
