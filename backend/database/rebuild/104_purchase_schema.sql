-- 104_purchase_schema.sql — Purchase/AP module, built from scratch.
--
-- Root cause being fixed: backend/src/controllers/purchase.controller.v2.ts and
-- backend/src/repositories/purchase/*.ts were written against a `purchase` schema that was
-- NEVER created in any migration (confirmed by grepping the whole repo for
-- "CREATE SCHEMA purchase" / "CREATE TABLE purchase.*" — zero results). Two abandoned, disconnected
-- migration attempts existed (create-purchases-tables.sql, purchase-migration.ts) using different
-- table names and no schema qualification — neither matches what the repositories actually query.
--
-- Every column below was extracted directly from the 5 repository files (SupplierRepository,
-- PurchaseOrderRepository, PurchaseInvoiceRepository, GoodsReceiptRepository, RequisitionRepository)
-- and BaseRepository's generic create/update methods, not guessed.
--
-- Design notes:
--  - created_by/updated_by/approved_by/etc. are UUID (ctx.userId is a UUID from JWT throughout this
--    codebase; a stale comment in PurchaseOrderRepository claims INTEGER, but nothing in the actual
--    code path ever passes an integer here).
--  - All human-facing number sequences (supplier_code, po_number, gr_number, requisition_number,
--    invoice_number) are UNIQUE per tenant, not globally — the chart_of_accounts multi-tenancy bug
--    fixed earlier this session is not being repeated here.
--  - warehouse_id/department are left as plain nullable columns with no FK — Inventory and a
--    department-code FK target don't exist yet as stable references; adding a hard FK now would
--    just be another landmine for later.

CREATE SCHEMA IF NOT EXISTS purchase;

-- ============================================================================
-- 1. SUPPLIERS (SupplierRepository — tableName='suppliers', schema='purchase')
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase.suppliers (
  supplier_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  supplier_code VARCHAR(50) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  vat_number VARCHAR(50),
  tax_id VARCHAR(50),
  supplier_type VARCHAR(50) DEFAULT 'STANDARD',
  payment_terms VARCHAR(100) DEFAULT 'Net 30',
  currency_code VARCHAR(3) DEFAULT 'ZAR',
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMP,
  deleted_by UUID,
  UNIQUE (tenant_id, supplier_code)
);
CREATE INDEX IF NOT EXISTS idx_purchase_suppliers_tenant ON purchase.suppliers(tenant_id);

-- ============================================================================
-- 2. PURCHASE ORDERS + LINES (PurchaseOrderRepository — tableName='purchase_orders')
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase.purchase_orders (
  po_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  po_number VARCHAR(50) NOT NULL,
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  supplier_id INTEGER REFERENCES purchase.suppliers(supplier_id),
  requisition_id INTEGER,
  delivery_date DATE,
  payment_terms VARCHAR(100),
  status VARCHAR(30) DEFAULT 'draft',
  warehouse_id INTEGER,
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 15,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  currency_code VARCHAR(3) DEFAULT 'ZAR',
  sent_to_supplier BOOLEAN DEFAULT false,
  acknowledged_by_supplier BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, po_number)
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase.purchase_orders(status);

CREATE TABLE IF NOT EXISTS purchase.po_line_items (
  line_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  po_id INTEGER NOT NULL REFERENCES purchase.purchase_orders(po_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_code VARCHAR(100),
  description TEXT,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(50) DEFAULT 'Unit',
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 15,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) DEFAULT 0,
  quantity_received DECIMAL(15,4) DEFAULT 0,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_po_line_items_po ON purchase.po_line_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_line_items_tenant ON purchase.po_line_items(tenant_id);

-- ============================================================================
-- 3. GOODS RECEIPTS + LINES (GoodsReceiptRepository — tableName='goods_receipts')
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase.goods_receipts (
  gr_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  gr_number VARCHAR(50) NOT NULL,
  gr_date DATE NOT NULL DEFAULT CURRENT_DATE,
  po_id INTEGER REFERENCES purchase.purchase_orders(po_id),
  supplier_id INTEGER REFERENCES purchase.suppliers(supplier_id),
  delivery_note_number VARCHAR(100),
  received_by UUID,
  status VARCHAR(30) DEFAULT 'draft',
  total_quantity DECIMAL(15,4) DEFAULT 0,
  warehouse_id INTEGER,
  notes TEXT,
  confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID,
  confirmed_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, gr_number)
);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_tenant ON purchase.goods_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON purchase.goods_receipts(po_id);

CREATE TABLE IF NOT EXISTS purchase.gr_line_items (
  line_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  gr_id INTEGER NOT NULL REFERENCES purchase.goods_receipts(gr_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  po_line_id INTEGER REFERENCES purchase.po_line_items(line_id),
  item_code VARCHAR(100),
  description TEXT,
  quantity_ordered DECIMAL(15,4) DEFAULT 0,
  quantity_received DECIMAL(15,4) NOT NULL DEFAULT 0,
  quantity_rejected DECIMAL(15,4) DEFAULT 0,
  rejection_reason TEXT,
  unit_of_measure VARCHAR(50) DEFAULT 'EA',
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_gr_line_items_gr ON purchase.gr_line_items(gr_id);
CREATE INDEX IF NOT EXISTS idx_gr_line_items_tenant ON purchase.gr_line_items(tenant_id);

-- ============================================================================
-- 4. REQUISITIONS + LINES (RequisitionRepository — tableName='purchase_requisitions')
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase.purchase_requisitions (
  requisition_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  requisition_number VARCHAR(50) NOT NULL,
  requisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_by_date DATE,
  department VARCHAR(100),
  requested_by UUID,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(30) DEFAULT 'draft',
  total_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  approved_by UUID,
  approved_date TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, requisition_number)
);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_tenant ON purchase.purchase_requisitions(tenant_id);

CREATE TABLE IF NOT EXISTS purchase.requisition_line_items (
  line_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  requisition_id INTEGER NOT NULL REFERENCES purchase.purchase_requisitions(requisition_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_code VARCHAR(100),
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(50) DEFAULT 'EA',
  estimated_unit_price DECIMAL(15,2) DEFAULT 0,
  estimated_total DECIMAL(15,2) DEFAULT 0,
  required_by_date DATE,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_requisition_line_items_req ON purchase.requisition_line_items(requisition_id);
CREATE INDEX IF NOT EXISTS idx_requisition_line_items_tenant ON purchase.requisition_line_items(tenant_id);

-- ============================================================================
-- 5. VENDOR INVOICES + PAYMENTS (PurchaseInvoiceRepository — tableName='vendor_invoices')
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase.vendor_invoices (
  invoice_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  supplier_id INTEGER REFERENCES purchase.suppliers(supplier_id),
  po_id INTEGER REFERENCES purchase.purchase_orders(po_id),
  gr_id INTEGER REFERENCES purchase.goods_receipts(gr_id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status VARCHAR(30) DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 15,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  amount_outstanding DECIMAL(15,2) DEFAULT 0,
  currency_code VARCHAR(3) DEFAULT 'ZAR',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_tenant ON purchase.vendor_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_supplier ON purchase.vendor_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON purchase.vendor_invoices(status);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_due_date ON purchase.vendor_invoices(due_date);

CREATE TABLE IF NOT EXISTS purchase.vendor_payments (
  payment_id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  invoice_id INTEGER REFERENCES purchase.vendor_invoices(invoice_id),
  supplier_id INTEGER REFERENCES purchase.suppliers(supplier_id),
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_tenant ON purchase.vendor_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_invoice ON purchase.vendor_payments(invoice_id);

-- Back-reference from purchase_orders to requisitions (added after both tables exist)
ALTER TABLE purchase.purchase_orders
  ADD CONSTRAINT fk_purchase_orders_requisition
  FOREIGN KEY (requisition_id) REFERENCES purchase.purchase_requisitions(requisition_id);
