-- 107_inventory_extended_subsystems.sql
-- Fixes/additions found while verifying the remaining routed inventory.controller.v2.ts endpoints
-- beyond the core categories/items/warehouses/stock-movements loop (already fixed in
-- 106/106a). Covers: stock adjustments, stock takes, stock batches, serial numbers.

-- created_by/approved_by were INTEGER on the pre-existing inventory.stock_movements/
-- stock_adjustments tables; ctx.userId is a UUID everywhere in this codebase. Both tables
-- were confirmed empty before converting.
ALTER TABLE inventory.stock_movements ALTER COLUMN created_by TYPE UUID USING NULL;
ALTER TABLE inventory.stock_adjustments ALTER COLUMN created_by TYPE UUID USING NULL;
ALTER TABLE inventory.stock_adjustments ALTER COLUMN approved_by TYPE UUID USING NULL;

-- postStockTake needs this to record when a stock take's variances were applied.
ALTER TABLE inventory.stock_levels ADD COLUMN IF NOT EXISTS last_count_date TIMESTAMP;

-- inventory.stock_takes / stock_take_lines — createStockTake/postStockTake query these;
-- never existed at all.
CREATE TABLE IF NOT EXISTS inventory.stock_takes (
  stock_take_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  stock_take_number VARCHAR(50) NOT NULL,
  warehouse_id INTEGER REFERENCES inventory.warehouses(warehouse_id),
  stock_take_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  posted BOOLEAN DEFAULT false,
  posted_date TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, stock_take_number)
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_takes_tenant ON inventory.stock_takes(tenant_id);

CREATE TABLE IF NOT EXISTS inventory.stock_take_lines (
  line_id SERIAL PRIMARY KEY,
  stock_take_id INTEGER NOT NULL REFERENCES inventory.stock_takes(stock_take_id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory.items(item_id),
  system_quantity DECIMAL(15,4) DEFAULT 0,
  counted_quantity DECIMAL(15,4),
  variance DECIMAL(15,4)
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_take_lines_take ON inventory.stock_take_lines(stock_take_id);

-- inventory.stock_batches / serial_numbers — GET /batches, GET /serials query these; never
-- existed. No POST/create route exists for either (read-only reports today), so these are
-- built minimally to match what getStockBatches/getSerialNumbers actually SELECT — not a full
-- batch/serial-tracking feature, since nothing in the app currently writes to them.
CREATE TABLE IF NOT EXISTS inventory.stock_batches (
  batch_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  item_id INTEGER REFERENCES inventory.items(item_id),
  warehouse_id INTEGER REFERENCES inventory.warehouses(warehouse_id),
  batch_number VARCHAR(100) NOT NULL,
  quantity DECIMAL(15,4) DEFAULT 0,
  manufactured_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_batches_tenant ON inventory.stock_batches(tenant_id);

CREATE TABLE IF NOT EXISTS inventory.serial_numbers (
  serial_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  item_id INTEGER REFERENCES inventory.items(item_id),
  warehouse_id INTEGER REFERENCES inventory.warehouses(warehouse_id),
  serial_number VARCHAR(100) NOT NULL,
  status VARCHAR(30) DEFAULT 'in_stock',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_serial_numbers_tenant ON inventory.serial_numbers(tenant_id);
