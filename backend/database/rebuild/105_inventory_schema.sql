-- 105_inventory_schema.sql — Inventory module, built from scratch.
--
-- Same root cause as Purchase/AP: no migration anywhere ever created these tables.
-- Every column below was extracted directly from the 4 repository files
-- (ItemCategoryRepository, InventoryItemRepository, WarehouseRepository, StockMovementRepository)
-- and backend/src/controllers/inventory.controller.v2.ts, not guessed.
--
-- This module actually has TWO parallel subsystems wired to different routes, both real:
--  1. Repository-pattern CRUD for items/categories/warehouses (public schema, matching each
--     repository class's own `schema` property) plus basic stock movements.
--  2. A more complete "V2 extended" system (inventory.stock_movements with a draft/post workflow,
--     inventory.stock_adjustments + lines) used by POST /stock-movements, /stock-movements/:id/post,
--     and the whole /stock-adjustments/* routes.
-- Both are built here since both are actually routed and reachable.
--
-- All tenant-facing sequences (item_code, category_code, warehouse code, movement/adjustment
-- numbers) are scoped UNIQUE(tenant_id, ...), not global.

CREATE SCHEMA IF NOT EXISTS inventory;

-- ============================================================================
-- 1. ITEM CATEGORIES (ItemCategoryRepository — tableName='item_categories', schema='public')
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.item_categories (
  category_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  category_code VARCHAR(50) NOT NULL,
  category_name VARCHAR(200) NOT NULL,
  description TEXT,
  parent_category_id INTEGER REFERENCES public.item_categories(category_id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMP,
  deleted_by UUID,
  UNIQUE (tenant_id, category_code)
);
CREATE INDEX IF NOT EXISTS idx_item_categories_tenant ON public.item_categories(tenant_id);

-- ============================================================================
-- 2. ITEMS (InventoryItemRepository — tableName='items', schema='public')
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.items (
  item_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(200),
  category_id INTEGER REFERENCES public.item_categories(category_id),
  unit_of_measure VARCHAR(50) DEFAULT 'each',
  sku VARCHAR(100),
  barcode VARCHAR(100),
  cost_price DECIMAL(15,2) DEFAULT 0,
  selling_price DECIMAL(15,2) DEFAULT 0,
  quantity_on_hand DECIMAL(15,4) DEFAULT 0,
  reorder_level DECIMAL(15,4) DEFAULT 0,
  reorder_quantity DECIMAL(15,4) DEFAULT 0,
  min_stock_level DECIMAL(15,4),
  max_stock_level DECIMAL(15,4),
  is_active BOOLEAN DEFAULT true,
  is_service BOOLEAN DEFAULT false,
  is_serialized BOOLEAN DEFAULT false,
  is_batch_tracked BOOLEAN DEFAULT false,
  weight DECIMAL(10,3),
  dimensions JSONB,
  tax_code VARCHAR(20),
  gl_account_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, item_code)
);
CREATE INDEX IF NOT EXISTS idx_items_tenant ON public.items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category_id);

-- ============================================================================
-- 3. WAREHOUSES (WarehouseRepository — tableName='inventory_warehouses', schema='public')
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_warehouses (
  warehouse_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'South Africa',
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  manager_id UUID,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouses_tenant ON public.inventory_warehouses(tenant_id);

-- ============================================================================
-- 4. BASIC STOCK MOVEMENTS (StockMovementRepository — tableName='inventory_transactions', schema='public')
--    Powers POST /stock-movements/receipt, /issue, /transfer and GET /stock-movements(?item_id=/warehouse_id=)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  item_id INTEGER REFERENCES public.items(item_id),
  warehouse_id INTEGER REFERENCES public.inventory_warehouses(warehouse_id),
  to_warehouse_id INTEGER REFERENCES public.inventory_warehouses(warehouse_id),
  quantity DECIMAL(15,4) NOT NULL,
  movement_type VARCHAR(20) NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  reason TEXT,
  notes TEXT,
  unit_cost DECIMAL(15,2),
  batch_number VARCHAR(100),
  serial_numbers TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant ON public.inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_warehouse ON public.inventory_transactions(warehouse_id);

-- ============================================================================
-- 5. STOCK LEVELS (per item/warehouse — read by InventoryItemRepository, written by both
--    subsystems: InventoryItemRepository.updateStockLevel AND the V2-extended post* functions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory.stock_levels (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  item_id INTEGER NOT NULL REFERENCES public.items(item_id),
  warehouse_id INTEGER NOT NULL REFERENCES public.inventory_warehouses(warehouse_id),
  quantity_on_hand DECIMAL(15,4) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(15,4) DEFAULT 0,
  quantity_available DECIMAL(15,4) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, item_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_levels_tenant ON inventory.stock_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_levels_item ON inventory.stock_levels(item_id);

-- ============================================================================
-- 6. STOCK MOVEMENTS — draft/post workflow (V2 extended: createStockMovement/postStockMovement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory.stock_movements (
  movement_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  movement_number VARCHAR(50) NOT NULL,
  item_id INTEGER REFERENCES public.items(item_id),
  warehouse_id INTEGER REFERENCES public.inventory_warehouses(warehouse_id),
  movement_type VARCHAR(30) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  posted_at TIMESTAMP,
  posted_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  UNIQUE (tenant_id, movement_number)
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_movements_tenant ON inventory.stock_movements(tenant_id);

-- ============================================================================
-- 7. STOCK ADJUSTMENTS + LINES (getStockAdjustments/createStockAdjustment/postStockAdjustment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory.stock_adjustments (
  adjustment_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  adjustment_number VARCHAR(50) NOT NULL,
  warehouse_id INTEGER REFERENCES public.inventory_warehouses(warehouse_id),
  adjustment_type VARCHAR(30) DEFAULT 'ADJUSTMENT',
  reason TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  UNIQUE (tenant_id, adjustment_number)
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_adjustments_tenant ON inventory.stock_adjustments(tenant_id);

CREATE TABLE IF NOT EXISTS inventory.stock_adjustment_lines (
  line_id SERIAL PRIMARY KEY,
  adjustment_id INTEGER NOT NULL REFERENCES inventory.stock_adjustments(adjustment_id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES public.items(item_id),
  quantity_before DECIMAL(15,4) DEFAULT 0,
  quantity_adjustment DECIMAL(15,4) NOT NULL,
  quantity_after DECIMAL(15,4),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_adjustment_lines_adj ON inventory.stock_adjustment_lines(adjustment_id);
