-- 106_inventory_reconcile.sql
--
-- After building 105_inventory_schema.sql, discovered a pre-existing, POPULATED inventory schema
-- (inventory.items: 5 rows, inventory.warehouses: 3 rows, inventory.stock_levels: 3 rows) that
-- SalesOrderRepository/QuotationRepository already depend on. That's the real, load-bearing
-- schema — not the empty public.items/public.item_categories/public.inventory_warehouses this
-- migration created. Pivoting the inventory repositories to point at inventory.* instead (done in
-- application code), and fixing this schema up to match what the code needs:
--
--  1. Same multi-tenancy bug as chart_of_accounts (fixed earlier this session): item_code,
--     warehouse_code, category_code, movement_number, adjustment_number were all globally
--     UNIQUE, not per-tenant. None of these are FK targets from other tables (verified via
--     pg_constraint), so this is a simple swap, not the multi-table FK surgery chart_of_accounts
--     needed.
--  2. inventory.warehouses is missing is_default/manager_id (needed by setDefaultWarehouse/
--     getDefaultWarehouse) and description/city/state/country/postal_code (declared on the
--     Warehouse interface, harmless to add defensively).
--  3. stock_levels' unique constraint was (item_id, warehouse_id) without tenant_id — same class
--     of bug, and it's also the ON CONFLICT target in InventoryItemRepository.updateStockLevel.
--  4. The now-orphaned, empty public.items/public.item_categories/public.inventory_warehouses/
--     public.inventory_transactions tables from 105 are dropped — nothing ever wrote to them.

-- --- 1. Tenant-scope the previously-global unique constraints ---
ALTER TABLE inventory.item_categories DROP CONSTRAINT item_categories_category_code_key;
ALTER TABLE inventory.item_categories ADD CONSTRAINT item_categories_tenant_code_key UNIQUE (tenant_id, category_code);

ALTER TABLE inventory.warehouses DROP CONSTRAINT warehouses_warehouse_code_key;
ALTER TABLE inventory.warehouses ADD CONSTRAINT warehouses_tenant_code_key UNIQUE (tenant_id, warehouse_code);

ALTER TABLE inventory.items DROP CONSTRAINT items_item_code_key;
ALTER TABLE inventory.items ADD CONSTRAINT items_tenant_code_key UNIQUE (tenant_id, item_code);

ALTER TABLE inventory.stock_movements DROP CONSTRAINT stock_movements_movement_number_key;
ALTER TABLE inventory.stock_movements ADD CONSTRAINT stock_movements_tenant_number_key UNIQUE (tenant_id, movement_number);

ALTER TABLE inventory.stock_adjustments DROP CONSTRAINT stock_adjustments_adjustment_number_key;
ALTER TABLE inventory.stock_adjustments ADD CONSTRAINT stock_adjustments_tenant_number_key UNIQUE (tenant_id, adjustment_number);

ALTER TABLE inventory.stock_levels DROP CONSTRAINT stock_levels_item_id_warehouse_id_key;
ALTER TABLE inventory.stock_levels ADD CONSTRAINT stock_levels_tenant_item_warehouse_key UNIQUE (tenant_id, item_id, warehouse_id);

-- --- 2. Missing warehouse columns ---
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- --- 3. Drop the now-orphaned, empty tables from the superseded public-schema attempt ---
DROP TABLE IF EXISTS public.inventory_transactions;
DROP TABLE IF EXISTS public.items;
DROP TABLE IF EXISTS public.item_categories;
DROP TABLE IF EXISTS public.inventory_warehouses;
