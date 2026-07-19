-- 108_fixed_assets_reconcile.sql
--
-- fixed_assets/asset_categories/asset_disposals/asset_transfers/asset_maintenance/
-- asset_depreciation_schedule/asset_locations all already exist (public schema) — this is NOT
-- a from-scratch build like Purchase/Inventory. Verified row counts first: only
-- asset_categories has real data (9 rows); everything else is empty. Two classes of fix:
--
--  1. Same multi-tenancy bug as chart_of_accounts/inventory: asset_number, category_code,
--     disposal_number, transfer_number, maintenance_number, location_code were all globally
--     UNIQUE, not per-tenant. None are FK targets (only the surrogate integer PKs are
--     referenced elsewhere), so these are simple swaps.
--  2. asset_disposals, asset_transfers, asset_maintenance, asset_depreciation_schedule have
--     NO tenant_id column at all, despite the controller filtering/inserting on tenant_id for
--     all of them — every read on these tables was already failing before this fix.

-- --- Tenant-scope previously-global unique constraints ---
ALTER TABLE public.fixed_assets DROP CONSTRAINT fixed_assets_asset_number_key;
ALTER TABLE public.fixed_assets ADD CONSTRAINT fixed_assets_tenant_number_key UNIQUE (tenant_id, asset_number);

ALTER TABLE public.asset_categories DROP CONSTRAINT asset_categories_category_code_key;
ALTER TABLE public.asset_categories ADD CONSTRAINT asset_categories_tenant_code_key UNIQUE (tenant_id, category_code);

ALTER TABLE public.asset_locations DROP CONSTRAINT asset_locations_location_code_key;
ALTER TABLE public.asset_locations ADD CONSTRAINT asset_locations_tenant_code_key UNIQUE (tenant_id, location_code);

-- --- Missing columns on asset_categories (has real data — additive only) ---
ALTER TABLE public.asset_categories ADD COLUMN IF NOT EXISTS minimum_capitalization_amount DECIMAL(15,2) DEFAULT 0;

-- --- asset_disposals: add tenant_id + notes, then tenant-scope disposal_number ---
ALTER TABLE public.asset_disposals ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.asset_disposals ADD COLUMN IF NOT EXISTS notes TEXT;
UPDATE public.asset_disposals SET tenant_id = (SELECT tenant_id FROM public.fixed_assets fa WHERE fa.asset_id = asset_disposals.asset_id) WHERE tenant_id IS NULL;
ALTER TABLE public.asset_disposals ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.asset_disposals DROP CONSTRAINT asset_disposals_disposal_number_key;
ALTER TABLE public.asset_disposals ADD CONSTRAINT asset_disposals_tenant_number_key UNIQUE (tenant_id, disposal_number);

-- --- asset_transfers: add tenant_id + notes, then tenant-scope transfer_number ---
ALTER TABLE public.asset_transfers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.asset_transfers ADD COLUMN IF NOT EXISTS notes TEXT;
UPDATE public.asset_transfers SET tenant_id = (SELECT tenant_id FROM public.fixed_assets fa WHERE fa.asset_id = asset_transfers.asset_id) WHERE tenant_id IS NULL;
ALTER TABLE public.asset_transfers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.asset_transfers DROP CONSTRAINT asset_transfers_transfer_number_key;
ALTER TABLE public.asset_transfers ADD CONSTRAINT asset_transfers_tenant_number_key UNIQUE (tenant_id, transfer_number);

-- --- asset_maintenance: add tenant_id + notes + vendor_name, tenant-scope maintenance_number ---
ALTER TABLE public.asset_maintenance ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.asset_maintenance ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.asset_maintenance ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(200);
UPDATE public.asset_maintenance SET tenant_id = (SELECT tenant_id FROM public.fixed_assets fa WHERE fa.asset_id = asset_maintenance.asset_id) WHERE tenant_id IS NULL;
ALTER TABLE public.asset_maintenance ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.asset_maintenance DROP CONSTRAINT asset_maintenance_maintenance_number_key;
ALTER TABLE public.asset_maintenance ADD CONSTRAINT asset_maintenance_tenant_number_key UNIQUE (tenant_id, maintenance_number);

-- --- asset_depreciation_schedule: add tenant_id (getAssetById/getDepreciationSchedule filter on it) ---
ALTER TABLE public.asset_depreciation_schedule ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE public.asset_depreciation_schedule SET tenant_id = (SELECT tenant_id FROM public.fixed_assets fa WHERE fa.asset_id = asset_depreciation_schedule.asset_id) WHERE tenant_id IS NULL;
ALTER TABLE public.asset_depreciation_schedule ALTER COLUMN tenant_id SET NOT NULL;
