-- Phase 1: Entity scoping plumbing
-- Adds entity_id columns to core financial, sales, purchase, and inventory tables
-- Includes lightweight indexing and FK constraints (nullable to allow gradual backfill)

-- =========================
-- Financials & Approvals
-- =========================
ALTER TABLE IF EXISTS journal_entries ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS journal_entry_lines ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS chart_of_accounts ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS approval_workflows ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS approval_levels ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS approval_history ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_entity ON journal_entries(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_tenant_entity ON journal_entry_lines(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant_entity ON chart_of_accounts(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_tenant_entity ON approval_workflows(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_levels_tenant_entity ON approval_levels(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_tenant_entity ON approval_history(tenant_id, entity_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'journal_entries_entity_id_fkey' AND table_name = 'journal_entries'
  ) THEN
    ALTER TABLE journal_entries
      ADD CONSTRAINT journal_entries_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

-- =========================
-- Backfill entity_id using tenant's primary legal entity (fallback only)
-- =========================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT t.id AS tenant_id,
           (SELECT id FROM legal_entities WHERE tenant_id = t.id ORDER BY created_at LIMIT 1) AS entity_id
    FROM tenants t
  ) LOOP
    IF r.entity_id IS NOT NULL THEN
      UPDATE journal_entries SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE journal_entry_lines SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE chart_of_accounts SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE approval_workflows SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE approval_levels SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE approval_history SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;

      UPDATE sales.orders SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE sales.quotations SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE sales_invoices SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;

      UPDATE purchase.purchase_orders SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE purchase.vendor_invoices SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE purchase.goods_receipts SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE purchase.purchase_requisitions SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE purchase.suppliers SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;

      UPDATE inventory.items SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE inventory.warehouses SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE inventory.stock_movements SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
      UPDATE inventory.item_categories SET entity_id = COALESCE(entity_id, r.entity_id) WHERE tenant_id = r.tenant_id;
    END IF;
  END LOOP;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'journal_entry_lines_entity_id_fkey' AND table_name = 'journal_entry_lines'
  ) THEN
    ALTER TABLE journal_entry_lines
      ADD CONSTRAINT journal_entry_lines_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chart_of_accounts_entity_id_fkey' AND table_name = 'chart_of_accounts'
  ) THEN
    ALTER TABLE chart_of_accounts
      ADD CONSTRAINT chart_of_accounts_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'approval_workflows_entity_id_fkey' AND table_name = 'approval_workflows'
  ) THEN
    ALTER TABLE approval_workflows
      ADD CONSTRAINT approval_workflows_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'approval_levels_entity_id_fkey' AND table_name = 'approval_levels'
  ) THEN
    ALTER TABLE approval_levels
      ADD CONSTRAINT approval_levels_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'approval_history_entity_id_fkey' AND table_name = 'approval_history'
  ) THEN
    ALTER TABLE approval_history
      ADD CONSTRAINT approval_history_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

-- =========================
-- Sales
-- =========================
ALTER TABLE IF EXISTS sales.orders ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS public.sales_invoices ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS sales.quotations ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_entity ON sales.orders(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant_entity ON sales_invoices(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_tenant_entity ON sales.quotations(tenant_id, entity_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_orders_entity_id_fkey' AND table_name = 'orders' AND table_schema = 'sales'
  ) THEN
    ALTER TABLE sales.orders
      ADD CONSTRAINT sales_orders_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_invoices_entity_id_fkey' AND table_name = 'sales_invoices'
  ) THEN
    ALTER TABLE sales_invoices
      ADD CONSTRAINT sales_invoices_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_quotations_entity_id_fkey' AND table_name = 'quotations' AND table_schema = 'sales'
  ) THEN
    ALTER TABLE sales.quotations
      ADD CONSTRAINT sales_quotations_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

-- =========================
-- Purchase
-- =========================
ALTER TABLE IF EXISTS purchase.purchase_orders ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS purchase.vendor_invoices ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS purchase.goods_receipts ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS purchase.purchase_requisitions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS purchase.suppliers ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_entity ON purchase.purchase_orders(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant_entity ON purchase.vendor_invoices(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_tenant_entity ON purchase.goods_receipts(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_tenant_entity ON purchase.purchase_requisitions(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_entity ON purchase.suppliers(tenant_id, entity_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_orders_entity_id_fkey' AND table_name = 'purchase_orders' AND table_schema = 'purchase'
  ) THEN
    ALTER TABLE purchase.purchase_orders
      ADD CONSTRAINT purchase_orders_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_vendor_invoices_entity_id_fkey' AND table_name = 'vendor_invoices' AND table_schema = 'purchase'
  ) THEN
    ALTER TABLE purchase.vendor_invoices
      ADD CONSTRAINT purchase_vendor_invoices_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'goods_receipts_entity_id_fkey' AND table_name = 'goods_receipts' AND table_schema = 'purchase'
  ) THEN
    ALTER TABLE purchase.goods_receipts
      ADD CONSTRAINT goods_receipts_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_requisitions_entity_id_fkey' AND table_name = 'purchase_requisitions' AND table_schema = 'purchase'
  ) THEN
    ALTER TABLE purchase.purchase_requisitions
      ADD CONSTRAINT purchase_requisitions_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_suppliers_entity_id_fkey' AND table_name = 'suppliers' AND table_schema = 'purchase'
  ) THEN
    ALTER TABLE purchase.suppliers
      ADD CONSTRAINT purchase_suppliers_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

-- =========================
-- Inventory
-- =========================
ALTER TABLE IF EXISTS inventory.items ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS inventory.warehouses ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS inventory.stock_movements ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS inventory.item_categories ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_entity ON inventory.items(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouses_tenant_entity ON inventory.warehouses(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_movements_tenant_entity ON inventory.stock_movements(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_categories_tenant_entity ON inventory.item_categories(tenant_id, entity_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_items_entity_id_fkey' AND table_name = 'items' AND table_schema = 'inventory'
  ) THEN
    ALTER TABLE inventory.items
      ADD CONSTRAINT inventory_items_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_warehouses_entity_id_fkey' AND table_name = 'warehouses' AND table_schema = 'inventory'
  ) THEN
    ALTER TABLE inventory.warehouses
      ADD CONSTRAINT inventory_warehouses_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_stock_movements_entity_id_fkey' AND table_name = 'stock_movements' AND table_schema = 'inventory'
  ) THEN
    ALTER TABLE inventory.stock_movements
      ADD CONSTRAINT inventory_stock_movements_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_item_categories_entity_id_fkey' AND table_name = 'item_categories' AND table_schema = 'inventory'
  ) THEN
    ALTER TABLE inventory.item_categories
      ADD CONSTRAINT inventory_item_categories_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES legal_entities(id) ON DELETE SET NULL;
  END IF;
END$$;
