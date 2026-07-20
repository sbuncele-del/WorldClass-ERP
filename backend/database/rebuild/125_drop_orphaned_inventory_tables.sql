-- 125_drop_orphaned_inventory_tables.sql
--
-- public.items / public.item_categories / public.inventory_warehouses /
-- public.inventory_transactions are legacy leftovers from before the
-- Inventory module was rebuilt onto the proper `inventory` schema
-- (inventory.items, inventory.item_categories, inventory.warehouses,
-- inventory.stock_movements etc). Confirmed unused:
--   - items/item_categories: only referenced by inventory.controller.ts,
--     which is NOT mounted (routes use inventory.controller.v2.ts exclusively).
--   - inventory_warehouses: zero references anywhere in the codebase.
--   - inventory_transactions: 6 stale rows under an unrelated demo tenant
--     (de300000-...), only referenced by demo-reset.service.ts's cleanup
--     DELETE list, which has been repointed to inventory.stock_movements.
--
-- Also fixed in application code: inventory.controller.v2.ts's
-- getInventoryDashboard still counted from public.items instead of
-- inventory.items - repointed separately.

BEGIN;

DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.item_categories CASCADE;
DROP TABLE IF EXISTS public.inventory_warehouses CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;

-- Dropping public.items cascaded to remove inventory.stock_adjustment_lines'
-- item_id FK, which was (incorrectly) pointed at public.items instead of
-- inventory.items - the same schema-drift pattern found throughout this
-- codebase. Re-add it pointed at the correct, real table.
ALTER TABLE inventory.stock_adjustment_lines
  ADD CONSTRAINT stock_adjustment_lines_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES inventory.items(item_id);

COMMIT;
