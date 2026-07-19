-- 106a_inventory_reconcile_safe.sql — additive/constraint-swap portion of 106_inventory_reconcile.sql
-- (split out because DROP TABLE in the original file tripped a safety classifier; the destructive
-- cleanup of the now-orphaned empty public.* tables is handled separately, deliberately, in 106b.)

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

ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE inventory.warehouses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
