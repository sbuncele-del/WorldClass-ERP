-- Take-on Balances Migration
-- Ensures opening_balance columns exist on all required tables

-- GL accounts
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(18,2) DEFAULT 0;

-- Customers (AR)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15,2) DEFAULT 0;

-- Vendors/Suppliers (AP)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15,2) DEFAULT 0;

-- Bank accounts already have opening_balance from cash-management-migration
-- Just ensure it exists
ALTER TABLE cash_bank_accounts ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15,2) DEFAULT 0;
ALTER TABLE cash_bank_accounts ADD COLUMN IF NOT EXISTS opening_balance_date DATE;

-- Ensure tenant_id exists (belt and braces)
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Vendor invoices: ensure amount_paid column exists for aging
ALTER TABLE vendor_invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15,2) DEFAULT 0;

-- Sales invoices: ensure amount_paid column exists for aging
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15,2) DEFAULT 0;
