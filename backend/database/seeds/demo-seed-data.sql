-- ============================================================
-- DEMO TENANT SEED DATA
-- Realistic South African business data for SiyaBusa ERP Demo
-- Tenant: 00000000-0000-0000-0000-000000000001 (Default/Demo)
-- ============================================================

BEGIN;

-- Clean existing demo data (preserve users) - order matters for FK constraints
-- Use DO block to safely delete from tables that may or may not exist
DO $$
BEGIN
  -- Sales child tables
  DELETE FROM sales_invoice_lines WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM sales_invoices WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM sales_quotes WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM sales_customers WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM purchase_order_lines WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DELETE FROM purchase_orders WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM purchase_suppliers WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  DELETE FROM hr_payslips WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DELETE FROM hr_payroll_runs WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM hr_leave_requests WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM hr_employees WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM hr_departments WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  DELETE FROM inventory_stock_levels WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM inventory_transactions WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DELETE FROM inventory_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM inventory_warehouses WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  DELETE FROM journal_entry_lines WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DELETE FROM journal_entries WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM chart_of_accounts WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM bank_transactions WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM bank_accounts WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- Cash management (child tables first)
DO $$
BEGIN
  DELETE FROM cash_bank_statement_lines WHERE statement_id IN (SELECT statement_id FROM cash_bank_statements WHERE tenant_id = '00000000-0000-0000-0000-000000000001');
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM cash_bank_statements WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM cash_transactions WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM cash_petty_cash_transactions WHERE float_id IN (SELECT float_id FROM cash_petty_cash_floats WHERE tenant_id = '00000000-0000-0000-0000-000000000001');
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM cash_petty_cash_floats WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM cash_flow_forecasts WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM cash_flow_categories WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  DELETE FROM cash_reconciliation_rules WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DELETE FROM cash_bank_accounts WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  DELETE FROM asset_depreciation WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DELETE FROM assets WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  DELETE FROM project_tasks WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DELETE FROM projects WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM products WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM departments WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM fiscal_periods WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM fiscal_years WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- 1. TENANT SETTINGS - Update demo tenant name
-- ============================================================
UPDATE tenants SET name = 'Nkosi Construction Group (Demo)', subscription_plan = 'enterprise' 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- 2. DEPARTMENTS
-- ============================================================
INSERT INTO departments (id, tenant_id, code, name, description, is_active) VALUES
('d0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'EXEC', 'Executive Management', 'C-Suite and Directors', true),
('d0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'FIN', 'Finance & Accounting', 'Financial operations, reporting, compliance', true),
('d0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'HR', 'Human Resources', 'People management, payroll, recruitment', true),
('d0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'OPS', 'Operations', 'Project delivery, site management', true),
('d0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'SALES', 'Sales & Business Dev', 'Client acquisition, proposals, tenders', true),
('d0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'PROC', 'Procurement', 'Supplier management, purchasing', true),
('d0000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'IT', 'Information Technology', 'Systems, infrastructure, support', true),
('d0000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'FLEET', 'Fleet & Logistics', 'Vehicle management, deliveries', true);

-- ============================================================
-- 3. HR DEPARTMENTS
-- ============================================================
INSERT INTO hr_departments (id, tenant_id, department_code, department_name, description, is_active) VALUES
('a1000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'EXEC', 'Executive Management', 'C-Suite and Directors', true),
('a1000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'FIN', 'Finance & Accounting', 'Financial operations', true),
('a1000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'HR', 'Human Resources', 'HR and payroll', true),
('a1000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'OPS', 'Operations', 'Construction operations', true),
('a1000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'SALES', 'Sales & BD', 'Sales and business development', true),
('a1000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'PROC', 'Procurement', 'Purchasing and supply chain', true),
('a1000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'IT', 'IT Department', 'Technology and systems', true),
('a1000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'FLEET', 'Fleet & Logistics', 'Transport and fleet', true);

-- ============================================================
-- 4. FISCAL YEARS & PERIODS
-- ============================================================
INSERT INTO fiscal_years (tenant_id, year_code, year_name, start_date, end_date, status, is_current) VALUES
('00000000-0000-0000-0000-000000000001', 'FY2025', 'Financial Year 2025/2026', '2025-03-01', '2026-02-28', 'open', true),
('00000000-0000-0000-0000-000000000001', 'FY2024', 'Financial Year 2024/2025', '2024-03-01', '2025-02-28', 'closed', false);

INSERT INTO fiscal_periods (tenant_id, period_code, period_name, period_number, start_date, end_date, status) VALUES
('00000000-0000-0000-0000-000000000001', 'FY2025-P01', 'March 2025', 1, '2025-03-01', '2025-03-31', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P02', 'April 2025', 2, '2025-04-01', '2025-04-30', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P03', 'May 2025', 3, '2025-05-01', '2025-05-31', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P04', 'June 2025', 4, '2025-06-01', '2025-06-30', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P05', 'July 2025', 5, '2025-07-01', '2025-07-31', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P06', 'August 2025', 6, '2025-08-01', '2025-08-31', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P07', 'September 2025', 7, '2025-09-01', '2025-09-30', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P08', 'October 2025', 8, '2025-10-01', '2025-10-31', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P09', 'November 2025', 9, '2025-11-01', '2025-11-30', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P10', 'December 2025', 10, '2025-12-01', '2025-12-31', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P11', 'January 2026', 11, '2026-01-01', '2026-01-31', 'CLOSED'),
('00000000-0000-0000-0000-000000000001', 'FY2025-P12', 'February 2026', 12, '2026-02-01', '2026-02-28', 'OPEN');

-- ============================================================
-- 5. CHART OF ACCOUNTS (SA IFRS-aligned)
-- ============================================================
INSERT INTO chart_of_accounts (id, tenant_id, code, name, account_type, account_category, normal_balance, is_header, is_active, current_balance, level) VALUES
-- ASSETS
('ca000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '1000', 'Assets', 'asset', 'asset', 'debit', true, true, 0, 1),
('ca000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '1100', 'Current Assets', 'asset', 'current_asset', 'debit', true, true, 0, 2),
('ca000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '1110', 'Bank - FNB Cheque Account', 'asset', 'current_asset', 'debit', false, true, 2847500.00, 3),
('ca000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '1120', 'Bank - Nedbank Savings', 'asset', 'current_asset', 'debit', false, true, 1250000.00, 3),
('ca000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '1130', 'Petty Cash', 'asset', 'current_asset', 'debit', false, true, 5000.00, 3),
('ca000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '1200', 'Accounts Receivable', 'asset', 'current_asset', 'debit', false, true, 3456780.50, 3),
('ca000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '1300', 'Inventory', 'asset', 'current_asset', 'debit', false, true, 1890345.00, 3),
('ca000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '1400', 'VAT Input', 'asset', 'current_asset', 'debit', false, true, 234500.00, 3),
('ca000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '1500', 'Non-Current Assets', 'asset', 'non_current_asset', 'debit', true, true, 0, 2),
('ca000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '1510', 'Property, Plant & Equipment', 'asset', 'non_current_asset', 'debit', false, true, 8750000.00, 3),
('ca000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '1520', 'Accumulated Depreciation', 'asset', 'non_current_asset', 'credit', false, true, -1245000.00, 3),
('ca000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '1530', 'Motor Vehicles', 'asset', 'non_current_asset', 'debit', false, true, 3200000.00, 3),
('ca000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '1540', 'Office Equipment', 'asset', 'non_current_asset', 'debit', false, true, 450000.00, 3),
-- LIABILITIES
('ca000001-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '2000', 'Liabilities', 'liability', 'liability', 'credit', true, true, 0, 1),
('ca000001-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', '2100', 'Current Liabilities', 'liability', 'current_liability', 'credit', true, true, 0, 2),
('ca000001-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', '2110', 'Accounts Payable', 'liability', 'current_liability', 'credit', false, true, 2145670.00, 3),
('ca000001-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', '2120', 'VAT Output', 'liability', 'current_liability', 'credit', false, true, 567890.00, 3),
('ca000001-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', '2130', 'PAYE Payable', 'liability', 'current_liability', 'credit', false, true, 289500.00, 3),
('ca000001-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', '2140', 'UIF Payable', 'liability', 'current_liability', 'credit', false, true, 34200.00, 3),
('ca000001-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', '2150', 'SDL Payable', 'liability', 'current_liability', 'credit', false, true, 28500.00, 3),
('ca000001-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', '2200', 'Non-Current Liabilities', 'liability', 'non_current_liability', 'credit', true, true, 0, 2),
('ca000001-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', '2210', 'Vehicle Finance - Wesbank', 'liability', 'non_current_liability', 'credit', false, true, 1890000.00, 3),
('ca000001-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', '2220', 'Business Loan - FNB', 'liability', 'non_current_liability', 'credit', false, true, 2500000.00, 3),
-- EQUITY
('ca000001-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', '3000', 'Equity', 'equity', 'equity', 'credit', true, true, 0, 1),
('ca000001-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', '3100', 'Share Capital', 'equity', 'equity', 'credit', false, true, 1000000.00, 2),
('ca000001-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', '3200', 'Retained Earnings', 'equity', 'equity', 'credit', false, true, 4567890.00, 2),
('ca000001-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000001', '3300', 'Current Year Earnings', 'equity', 'equity', 'credit', false, true, 2345670.50, 2),
-- REVENUE
('ca000001-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', '4000', 'Revenue', 'revenue', 'revenue', 'credit', true, true, 0, 1),
('ca000001-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', '4100', 'Construction Revenue', 'revenue', 'revenue', 'credit', false, true, 18750000.00, 2),
('ca000001-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001', '4200', 'Consulting Revenue', 'revenue', 'revenue', 'credit', false, true, 2340000.00, 2),
('ca000001-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000001', '4300', 'Project Management Fees', 'revenue', 'revenue', 'credit', false, true, 1560000.00, 2),
('ca000001-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000001', '4400', 'Rental Income', 'revenue', 'revenue', 'credit', false, true, 780000.00, 2),
-- EXPENSES
('ca000001-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000001', '5000', 'Cost of Sales', 'expense', 'expense', 'debit', true, true, 0, 1),
('ca000001-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000001', '5100', 'Materials & Supplies', 'expense', 'cogs', 'debit', false, true, 6780000.00, 2),
('ca000001-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000001', '5200', 'Subcontractor Costs', 'expense', 'cogs', 'debit', false, true, 4560000.00, 2),
('ca000001-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000001', '5300', 'Direct Labour', 'expense', 'cogs', 'debit', false, true, 3450000.00, 2),
('ca000001-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000001', '6000', 'Operating Expenses', 'expense', 'expense', 'debit', true, true, 0, 1),
('ca000001-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000001', '6100', 'Salaries & Wages', 'expense', 'expense', 'debit', false, true, 2850000.00, 2),
('ca000001-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000001', '6200', 'Rent & Utilities', 'expense', 'expense', 'debit', false, true, 456000.00, 2),
('ca000001-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000001', '6300', 'Vehicle Expenses', 'expense', 'expense', 'debit', false, true, 345000.00, 2),
('ca000001-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000001', '6400', 'Insurance', 'expense', 'expense', 'debit', false, true, 234000.00, 2),
('ca000001-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000001', '6500', 'Professional Fees', 'expense', 'expense', 'debit', false, true, 189000.00, 2),
('ca000001-0000-0000-0000-000000000066', '00000000-0000-0000-0000-000000000001', '6600', 'Depreciation', 'expense', 'expense', 'debit', false, true, 1245000.00, 2),
('ca000001-0000-0000-0000-000000000067', '00000000-0000-0000-0000-000000000001', '6700', 'Bank Charges', 'expense', 'expense', 'debit', false, true, 67800.00, 2),
('ca000001-0000-0000-0000-000000000068', '00000000-0000-0000-0000-000000000001', '6800', 'Marketing & Advertising', 'expense', 'expense', 'debit', false, true, 123000.00, 2),
('ca000001-0000-0000-0000-000000000069', '00000000-0000-0000-0000-000000000001', '6900', 'Training & Development', 'expense', 'expense', 'debit', false, true, 78000.00, 2);

-- ============================================================
-- 6. BANK ACCOUNTS
-- ============================================================
INSERT INTO bank_accounts (id, tenant_id, account_code, account_name, bank_name, account_number, branch_code, account_type, currency, current_balance, gl_account_code, is_active) VALUES
('ba000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'FNB-CHQ', 'FNB Business Cheque', 'First National Bank', '62845917203', '250655', 'cheque', 'ZAR', 2847500.00, '1110', true),
('ba000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'NDB-SAV', 'Nedbank Business Savings', 'Nedbank', '1048392756', '198765', 'savings', 'ZAR', 1250000.00, '1120', true),
('ba000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'STD-USD', 'Standard Bank USD Account', 'Standard Bank', '270148395', '051001', 'cheque', 'USD', 45230.00, '1110', true);

-- ============================================================
-- 7. BANK TRANSACTIONS (Recent 3 months)
-- Schema: bank_account_id (UUID FK), transaction_type, debit_amount, credit_amount, balance
-- ============================================================
INSERT INTO bank_transactions (id, tenant_id, bank_account_id, transaction_date, transaction_type, description, reference, debit_amount, credit_amount, balance, is_reconciled, created_at) VALUES
-- January 2026
('bf000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-01-05', 'credit', 'Payment from Moyo Mining - Phase 2', 'PMT-2026-001', 0.00, 1250000.00, 2350000.00, true, '2026-01-05'),
('bf000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-01-08', 'debit', 'Salaries - January', 'SAL-2026-01', 456780.00, 0.00, 1893220.00, true, '2026-01-08'),
('bf000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-01-10', 'debit', 'BuildIt - Materials Purchase', 'PO-2026-003', 234500.00, 0.00, 1658720.00, true, '2026-01-10'),
('bf000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-01-15', 'debit', 'Eskom - Electricity', 'ESK-JAN-26', 34500.00, 0.00, 1624220.00, true, '2026-01-15'),
('bf000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-01-18', 'credit', 'Nkosi Shopping Centre Progress Claim 4', 'INV-2026-012', 0.00, 890000.00, 2514220.00, true, '2026-01-18'),
('bf000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-01-20', 'debit', 'SARS PAYE - January', 'PAYE-2026-01', 289500.00, 0.00, 2224720.00, true, '2026-01-20'),
('bf000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-01-22', 'debit', 'Wesbank Vehicle Finance', 'WB-2026-01', 45670.00, 0.00, 2179050.00, true, '2026-01-22'),
('bf000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-01-25', 'debit', 'FNB Bank Charges', 'FNB-CHG-JAN', 5670.00, 0.00, 2173380.00, true, '2026-01-25'),
-- February 2026
('bf000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-02-03', 'credit', 'Gauteng Dept of Public Works - Payment', 'GDPW-2026-FEB', 0.00, 1560000.00, 3733380.00, true, '2026-02-03'),
('bf000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-02-05', 'debit', 'Salaries - February', 'SAL-2026-02', 478900.00, 0.00, 3254480.00, true, '2026-02-05'),
('bf000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-02-07', 'debit', 'Cement SA - Bulk Order', 'PO-2026-008', 345600.00, 0.00, 2908880.00, true, '2026-02-07'),
('bf000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-02-10', 'debit', 'Shell Fleet Card - January', 'FUEL-2026-01', 67890.00, 0.00, 2840990.00, false, '2026-02-10'),
('bf000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-02-12', 'debit', 'Old Mutual Insurance Premium', 'INS-2026-02', 23450.00, 0.00, 2817540.00, false, '2026-02-12'),
('bf000001-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'ba000001-0000-0000-0000-000000000001', '2026-02-13', 'credit', 'Dlamini Architects - Management Fee', 'INV-2026-019', 0.00, 78500.00, 2896040.00, false, '2026-02-13');

-- ============================================================
-- 8. CUSTOMERS (SA Companies)
-- ============================================================
INSERT INTO sales_customers (id, tenant_id, customer_code, customer_name, contact_person, email, phone, billing_address, city, province, postal_code, tax_number, payment_terms, credit_limit, current_balance) VALUES
('ab000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CUST-001', 'Moyo Mining (Pty) Ltd', 'Themba Moyo', 'themba@moyomining.co.za', '011-456-7890', '45 Commissioner St', 'Johannesburg', 'Gauteng', '2001', '4567890123', 30, 5000000.00, 1250000.00),
('ab000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CUST-002', 'Gauteng Dept of Public Works', 'Nomsa Khumalo', 'n.khumalo@gpw.gov.za', '012-345-6789', '30 Union Buildings', 'Pretoria', 'Gauteng', '0002', 'GOV4567890', 60, 10000000.00, 2340000.00),
('ab000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'CUST-003', 'Zulu Properties Holdings', 'Mandla Zulu', 'mandla@zuluproperties.co.za', '031-234-5678', '12 Umhlanga Ridge Blvd', 'Durban', 'KwaZulu-Natal', '4319', '9876543210', 30, 3000000.00, 567000.00),
('ab000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'CUST-004', 'Dlamini Development Group', 'Sipho Dlamini', 'sipho@dlaminidev.co.za', '011-789-0123', '8 Sandton Drive', 'Sandton', 'Gauteng', '2196', '1234509876', 30, 4000000.00, 890000.00),
('ab000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'CUST-005', 'Cape Town Metro Housing', 'Ayanda Mthembu', 'ayanda@ctmetro.gov.za', '021-567-8901', '1 Civic Centre', 'Cape Town', 'Western Cape', '8001', 'GOV7654321', 45, 8000000.00, 1560000.00),
('ab000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'CUST-006', 'Mahlangu Steel Fabrication', 'Peter Mahlangu', 'peter@mahlangusteel.co.za', '013-456-7890', '23 Industrial Rd', 'Middelburg', 'Mpumalanga', '1050', '6543210987', 30, 2000000.00, 345000.00),
('ab000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'CUST-007', 'Ndaba Healthcare Trust', 'Dr Lindiwe Ndaba', 'lindiwe@ndabatrust.org.za', '011-234-5678', '56 Hospital Hill', 'Parktown', 'Gauteng', '2193', '3456789012', 30, 6000000.00, 780000.00),
('ab000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'CUST-008', 'Sisulu Education Foundation', 'Thandiwe Sisulu', 'thandiwe@sisulufoundation.org.za', '012-678-9012', '90 Government Ave', 'Pretoria', 'Gauteng', '0001', '7890123456', 60, 5000000.00, 456000.00);

-- ============================================================
-- 9. SUPPLIERS (SA Companies)
-- ============================================================
INSERT INTO purchase_suppliers (id, tenant_id, supplier_code, supplier_name, contact_person, email, phone, address, city, province, postal_code, tax_number, payment_terms, bank_name, bank_account, is_active) VALUES
('a9000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'SUP-001', 'Cement SA (Pty) Ltd', 'Johan van der Merwe', 'johan@cementsa.co.za', '011-345-6789', '100 Cement Drive', 'Johannesburg', 'Gauteng', '2001', '1111234567', 30, 'ABSA', '4089123456', true),
('a9000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SUP-002', 'BuildIt Wholesale', 'Kagiso Motaung', 'kagiso@buildit.co.za', '011-456-7891', '25 Builder Ave', 'Kempton Park', 'Gauteng', '1619', '2222345678', 30, 'FNB', '6201234567', true),
('a9000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'SUP-003', 'SA Steel & Iron', 'Pieter Botha', 'pieter@sasteel.co.za', '016-456-7890', '5 Steel Works Rd', 'Vanderbijlpark', 'Gauteng', '1900', '3333456789', 45, 'Standard Bank', '2701234567', true),
('a9000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'SUP-004', 'Shell SA - Fleet Services', 'Mark Thompson', 'fleet@shell.co.za', '011-567-8901', '1 Shell Place', 'Rosebank', 'Gauteng', '2196', '4444567890', 30, 'Nedbank', '1071234567', true),
('a9000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'SUP-005', 'Mbeki Plant Hire', 'Thabo Mbeki Jr', 'thabo@mbekiplant.co.za', '011-678-9012', '78 Industrial Park', 'Midrand', 'Gauteng', '1685', '5555678901', 30, 'FNB', '6209876543', true),
('a9000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'SUP-006', 'Makhadzi Electrical Supplies', 'Vhutali Makhadzi', 'vhutali@makhadzi-elec.co.za', '015-234-5678', '12 Power Lane', 'Polokwane', 'Limpopo', '0699', '6666789012', 30, 'Capitec', '1234567890', true),
('a9000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'SUP-007', 'PPE Direct SA', 'Gerhard Smit', 'gerhard@ppedirect.co.za', '021-345-6789', '34 Safety Way', 'Cape Town', 'Western Cape', '7441', '7777890123', 30, 'ABSA', '4051234567', true),
('a9000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'SUP-008', 'Old Mutual Business Insurance', 'Sarah Naidoo', 'sarah.naidoo@oldmutual.co.za', '011-789-0123', '1 Mutual Place', 'Sandton', 'Gauteng', '2196', '8888901234', 30, 'Nedbank', '1081234567', true);

-- ============================================================
-- 10. HR EMPLOYEES (Diverse SA workforce)
-- ============================================================
INSERT INTO hr_employees (id, tenant_id, employee_number, first_name, last_name, email, phone, id_number, date_of_birth, gender, department, position, job_title, employment_type, hire_date, basic_salary, tax_number, bank_name, bank_account, bank_branch, is_active) VALUES
('ae000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'EMP001', 'Sibusiso', 'Nkosi', 'sibusiso@nkosiconstruction.co.za', '082-345-6789', '8501015800081', '1985-01-01', 'Male', 'EXEC', 'Managing Director', 'CEO & Managing Director', 'permanent', '2015-03-01', 125000.00, '1234567890', 'FNB', '62845000001', '250655', true),
('ae000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'EMP002', 'Nomvula', 'Mthembu', 'nomvula@nkosiconstruction.co.za', '083-456-7890', '8706150200083', '1987-06-15', 'Female', 'FIN', 'Financial Director', 'CFO & Financial Director', 'permanent', '2016-06-01', 95000.00, '2345678901', 'Nedbank', '10483000001', '198765', true),
('ae000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'EMP003', 'Thabo', 'Molefe', 'thabo@nkosiconstruction.co.za', '084-567-8901', '9003205800082', '1990-03-20', 'Male', 'OPS', 'Operations Manager', 'Head of Operations', 'permanent', '2017-01-15', 78000.00, '3456789012', 'ABSA', '40512000001', '632005', true),
('ae000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'EMP004', 'Lindiwe', 'Dube', 'lindiwe@nkosiconstruction.co.za', '072-678-9012', '9208100200085', '1992-08-10', 'Female', 'HR', 'HR Manager', 'Human Resources Manager', 'permanent', '2018-04-01', 65000.00, '4567890123', 'Standard Bank', '27012000001', '051001', true),
('ae000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'EMP005', 'Bongani', 'Sithole', 'bongani@nkosiconstruction.co.za', '073-789-0123', '8804125800084', '1988-04-12', 'Male', 'OPS', 'Site Manager', 'Senior Site Manager', 'permanent', '2017-08-01', 62000.00, '5678901234', 'FNB', '62845000002', '250655', true),
('ae000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'EMP006', 'Zanele', 'Khumalo', 'zanele@nkosiconstruction.co.za', '082-890-1234', '9505200200086', '1995-05-20', 'Female', 'SALES', 'Business Dev Manager', 'Business Development Manager', 'permanent', '2019-02-01', 58000.00, '6789012345', 'Capitec', '12345000002', '470010', true),
('ae000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'EMP007', 'Andile', 'Ncube', 'andile@nkosiconstruction.co.za', '084-901-2345', '9107185800083', '1991-07-18', 'Male', 'OPS', 'Quantity Surveyor', 'Senior Quantity Surveyor', 'permanent', '2018-09-01', 68000.00, '7890123456', 'ABSA', '40512000002', '632005', true),
('ae000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'EMP008', 'Palesa', 'Mogale', 'palesa@nkosiconstruction.co.za', '071-012-3456', '9309250200087', '1993-09-25', 'Female', 'FIN', 'Accountant', 'Senior Accountant', 'permanent', '2019-06-01', 52000.00, '8901234567', 'Nedbank', '10483000002', '198765', true),
('ae000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'EMP009', 'Siyabonga', 'Mkhize', 'siyabonga@nkosiconstruction.co.za', '083-123-4567', '8811305800085', '1988-11-30', 'Male', 'FLEET', 'Fleet Manager', 'Fleet & Logistics Manager', 'permanent', '2018-01-15', 55000.00, '9012345678', 'Standard Bank', '27012000002', '051001', true),
('ae000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'EMP010', 'Nokuthula', 'Shabalala', 'nokuthula@nkosiconstruction.co.za', '072-234-5678', '9602140200088', '1996-02-14', 'Female', 'PROC', 'Procurement Officer', 'Senior Procurement Officer', 'permanent', '2020-03-01', 48000.00, '0123456789', 'FNB', '62845000003', '250655', true),
('ae000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'EMP011', 'Mpho', 'Letseka', 'mpho@nkosiconstruction.co.za', '074-345-6789', '9404105800086', '1994-04-10', 'Male', 'OPS', 'Foreman', 'Senior Construction Foreman', 'permanent', '2019-11-01', 42000.00, '1234509876', 'Capitec', '12345000003', '470010', true),
('ae000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'EMP012', 'Thandeka', 'Ndlovu', 'thandeka@nkosiconstruction.co.za', '082-456-7891', '9710200200089', '1997-10-20', 'Female', 'FIN', 'Accounts Clerk', 'Accounts Payable Clerk', 'permanent', '2021-01-15', 28000.00, '2345609876', 'ABSA', '40512000003', '632005', true),
('ae000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'EMP013', 'Vuyo', 'Radebe', 'vuyo@nkosiconstruction.co.za', '073-567-8902', '9206085800087', '1992-06-08', 'Male', 'IT', 'IT Administrator', 'IT Systems Administrator', 'permanent', '2020-07-01', 45000.00, '3456709876', 'Standard Bank', '27012000003', '051001', true),
('ae000001-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'EMP014', 'Lerato', 'Modise', 'lerato@nkosiconstruction.co.za', '084-678-9013', '9812150200090', '1998-12-15', 'Female', 'HR', 'HR Administrator', 'HR & Payroll Administrator', 'permanent', '2021-06-01', 32000.00, '4567809876', 'Nedbank', '10483000003', '198765', true),
('ae000001-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'EMP015', 'Johannes', 'van Wyk', 'johannes@nkosiconstruction.co.za', '082-789-0124', '8509225800088', '1985-09-22', 'Male', 'OPS', 'Health & Safety Officer', 'SHEQ Manager', 'permanent', '2017-05-01', 56000.00, '5678909876', 'FNB', '62845000004', '250655', true);

-- ============================================================
-- 11. PAYROLL RUNS (Last 3 months)
-- ============================================================
INSERT INTO hr_payroll_runs (id, tenant_id, payroll_number, period_start, period_end, pay_date, status, total_gross, total_deductions, total_net, employee_count, notes) VALUES
('a8000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'PAY-2025-12', '2025-12-01', '2025-12-31', '2025-12-25', 'completed', 1029000.00, 308700.00, 720300.00, 15, 'December 2025 payroll - includes 13th cheque'),
('a8000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'PAY-2026-01', '2026-01-01', '2026-01-31', '2026-01-25', 'completed', 929000.00, 278700.00, 650300.00, 15, 'January 2026 payroll'),
('a8000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'PAY-2026-02', '2026-02-01', '2026-02-28', '2026-02-25', 'processing', 929000.00, 278700.00, 650300.00, 15, 'February 2026 payroll - in progress');

-- ============================================================
-- 12. INVENTORY WAREHOUSES
-- ============================================================
INSERT INTO inventory_warehouses (id, tenant_id, warehouse_code, warehouse_name, address, city, province, postal_code, is_active, is_default) VALUES
('a4000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'WH-JHB', 'Johannesburg Main Yard', '234 Industrial Road, Booysens', 'Johannesburg', 'Gauteng', '2091', true, true),
('a4000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'WH-PTA', 'Pretoria Storage Yard', '89 Depot Street, Silverton', 'Pretoria', 'Gauteng', '0184', true, false),
('a4000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'WH-DBN', 'Durban Regional Store', '45 Harbour Drive, Maydon Wharf', 'Durban', 'KwaZulu-Natal', '4057', true, false);

-- ============================================================
-- 13. INVENTORY ITEMS (Construction materials)
-- ============================================================
INSERT INTO inventory_items (id, tenant_id, item_code, item_name, description, category, unit_of_measure, cost_price, selling_price, quantity_on_hand, reorder_level, reorder_quantity, is_active) VALUES
('a3000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'MAT-001', 'Portland Cement 50kg', 'CEM I 42.5N Portland Cement - 50kg bag', 'Building Materials', 'bag', 89.50, 115.00, 2450, 500, 1000, true),
('a3000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'MAT-002', 'River Sand - per cubic metre', 'Washed river sand for concrete and plaster', 'Aggregates', 'm³', 350.00, 480.00, 180, 50, 100, true),
('a3000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'MAT-003', 'Crushed Stone 19mm', '19mm crushed stone for concrete mix', 'Aggregates', 'm³', 380.00, 520.00, 145, 40, 80, true),
('a3000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'MAT-004', 'Steel Rebar Y12', 'Y12 reinforcement bar - 12mm x 6m', 'Steel', 'length', 145.00, 195.00, 3200, 800, 1500, true),
('a3000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'MAT-005', 'Steel Rebar Y16', 'Y16 reinforcement bar - 16mm x 6m', 'Steel', 'length', 256.00, 340.00, 1800, 500, 1000, true),
('a3000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'MAT-006', 'Building Bricks - NFP', 'Non-face plaster bricks (per 1000)', 'Bricks & Blocks', 'thousand', 2100.00, 2850.00, 85, 20, 50, true),
('a3000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'MAT-007', 'Concrete Blocks 190mm', '190mm x 190mm x 390mm concrete blocks', 'Bricks & Blocks', 'each', 12.50, 18.00, 15000, 3000, 5000, true),
('a3000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'MAT-008', 'Roof Sheeting IBR 0.47mm', 'IBR profile roof sheet - 0.47mm galvanized', 'Roofing', 'sheet', 189.00, 265.00, 420, 100, 200, true),
('a3000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'MAT-009', 'PVC Pipe 110mm x 6m', '110mm PVC sewer pipe - 6m length', 'Plumbing', 'length', 178.00, 245.00, 340, 80, 150, true),
('a3000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'MAT-010', 'Electrical Cable 2.5mm Twin', '2.5mm² twin & earth cable - 100m roll', 'Electrical', 'roll', 890.00, 1250.00, 45, 10, 20, true),
('a3000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'MAT-011', 'Plaster of Paris 40kg', '40kg bag plaster of paris', 'Building Materials', 'bag', 75.00, 105.00, 890, 200, 400, true),
('a3000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'MAT-012', 'Timber 38x114mm SAP', 'SAP treated timber 38x114mm - per linear metre', 'Timber', 'lm', 45.00, 68.00, 2800, 500, 1000, true),
('a3000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'PPE-001', 'Hard Hat - Yellow', 'SABS-approved yellow safety hard hat', 'PPE', 'each', 85.00, 120.00, 120, 30, 50, true),
('a3000001-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'PPE-002', 'Safety Boots Size Range', 'Steel-toe safety boots - various sizes', 'PPE', 'pair', 450.00, 650.00, 65, 20, 30, true),
('a3000001-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'PPE-003', 'Hi-Vis Safety Vest', 'High-visibility reflective vest', 'PPE', 'each', 65.00, 95.00, 200, 50, 100, true);

-- ============================================================
-- 14. PRODUCTS / SERVICES
-- ============================================================
INSERT INTO products (id, tenant_id, code, name, description, category, is_active) VALUES
('ad000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'SVC-001', 'New Build Construction', 'Turnkey new building construction services', 'Construction', true),
('ad000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SVC-002', 'Renovation & Refurbishment', 'Building renovation and refurbishment services', 'Construction', true),
('ad000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'SVC-003', 'Project Management', 'Construction project management services', 'Professional Services', true),
('ad000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'SVC-004', 'Quantity Surveying', 'Bill of quantities and cost estimation', 'Professional Services', true),
('ad000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'SVC-005', 'Civil Works', 'Roads, drainage, earthworks', 'Civil Engineering', true),
('ad000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'SVC-006', 'Structural Steel', 'Steel structure fabrication and erection', 'Structural', true),
('ad000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'SVC-007', 'Electrical Installations', 'Commercial & industrial electrical work', 'Electrical', true),
('ad000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'SVC-008', 'Plumbing & Drainage', 'Plumbing installations and drainage systems', 'Plumbing', true);

-- ============================================================
-- 15. SALES INVOICES (Recent activity)
-- Note: customer_id is INTEGER type (no FK constraint), using sequential IDs matching customer insert order
-- ============================================================
INSERT INTO sales_invoices (id, tenant_id, invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, amount_paid, currency, notes, reference) VALUES
('ac000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'INV-2026-001', 1, '2026-01-05', '2026-02-04', 'paid', 1086956.52, 163043.48, 1250000.00, 1250000.00, 'ZAR', 'Moyo Mining Phase 2 - Progress Claim 3', 'MM-PC3'),
('ac000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'INV-2026-002', 4, '2026-01-10', '2026-03-10', 'paid', 773913.04, 116086.96, 890000.00, 890000.00, 'ZAR', 'Nkosi Shopping Centre - Progress Claim 4', 'NSC-PC4'),
('ac000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'INV-2026-003', 2, '2026-01-15', '2026-03-15', 'paid', 1356521.74, 203478.26, 1560000.00, 1560000.00, 'ZAR', 'Gauteng DPW - Thembisa School Block D', 'GDPW-TSB-D'),
('ac000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'INV-2026-004', 3, '2026-01-20', '2026-02-19', 'overdue', 491304.35, 73695.65, 565000.00, 0.00, 'ZAR', 'Zulu Properties - Umhlanga Complex Phase 1', 'ZP-UCP1'),
('ac000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'INV-2026-005', 4, '2026-01-28', '2026-02-27', 'sent', 773913.04, 116086.96, 890000.00, 0.00, 'ZAR', 'Dlamini Dev - Sandton Office Park', 'DD-SOP'),
('ac000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'INV-2026-006', 5, '2026-02-01', '2026-03-02', 'sent', 1356521.74, 203478.26, 1560000.00, 0.00, 'ZAR', 'Cape Town Metro - Khayelitsha Housing Phase 5', 'CTM-KH5'),
('ac000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'INV-2026-007', 6, '2026-02-05', '2026-03-06', 'sent', 300000.00, 45000.00, 345000.00, 0.00, 'ZAR', 'Mahlangu Steel - Fabrication Workshop Extension', 'MS-FWE'),
('ac000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'INV-2026-008', 7, '2026-02-08', '2026-03-09', 'sent', 678260.87, 101739.13, 780000.00, 0.00, 'ZAR', 'Ndaba Healthcare Trust - Parktown Clinic', 'NHT-PC'),
('ac000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'INV-2026-009', 8, '2026-02-10', '2026-04-10', 'draft', 396521.74, 59478.26, 456000.00, 0.00, 'ZAR', 'Sisulu Education - Soweto Library Extension', 'SEF-SLE'),
('ac000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'INV-2026-010', 4, '2026-02-12', '2026-03-13', 'draft', 68260.87, 10239.13, 78500.00, 0.00, 'ZAR', 'Dlamini Architects - PM Fee February', 'DA-PMF-FEB');

-- ============================================================
-- 16. PURCHASE ORDERS
-- ============================================================
INSERT INTO purchase_orders (id, tenant_id, po_number, supplier_id, order_date, expected_date, status, subtotal, tax_amount, total_amount, currency, notes) VALUES
('a7000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'PO-2026-001', 'a9000001-0000-0000-0000-000000000001', '2026-01-08', '2026-01-15', 'received', 203913.04, 30586.96, 234500.00, 'ZAR', 'Cement bulk order - Moyo Mining site'),
('a7000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'PO-2026-002', 'a9000001-0000-0000-0000-000000000003', '2026-01-12', '2026-01-25', 'received', 417391.30, 62608.70, 480000.00, 'ZAR', 'Rebar order - Thembisa School project'),
('a7000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'PO-2026-003', 'a9000001-0000-0000-0000-000000000002', '2026-01-20', '2026-02-03', 'received', 204347.83, 30652.17, 235000.00, 'ZAR', 'General building materials - multiple sites'),
('a7000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'PO-2026-004', 'a9000001-0000-0000-0000-000000000001', '2026-02-05', '2026-02-12', 'received', 300521.74, 45078.26, 345600.00, 'ZAR', 'Cement - Khayelitsha Housing project'),
('a7000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'PO-2026-005', 'a9000001-0000-0000-0000-000000000005', '2026-02-08', '2026-02-15', 'approved', 347826.09, 52173.91, 400000.00, 'ZAR', 'TLB and excavator hire - Umhlanga site'),
('a7000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'PO-2026-006', 'a9000001-0000-0000-0000-000000000006', '2026-02-10', '2026-02-20', 'ordered', 130434.78, 19565.22, 150000.00, 'ZAR', 'Electrical supplies - Sandton Office Park'),
('a7000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'PO-2026-007', 'a9000001-0000-0000-0000-000000000007', '2026-02-11', '2026-02-18', 'ordered', 52173.91, 7826.09, 60000.00, 'ZAR', 'PPE replenishment - all sites'),
('a7000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'PO-2026-008', 'a9000001-0000-0000-0000-000000000004', '2026-02-12', '2026-02-28', 'draft', 59043.48, 8856.52, 67900.00, 'ZAR', 'Fleet fuel card top-up - February');

-- ============================================================
-- 17. PROJECTS (Active construction projects)
-- ============================================================
INSERT INTO projects (id, tenant_id, project_code, project_name, description, start_date, end_date, status, budget, actual_cost, progress, priority, project_type, client_name) VALUES
('a6000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'PRJ-001', 'Moyo Mining Admin Complex', 'New admin building and workshop for Moyo Mining in Rustenburg', '2025-06-01', '2026-06-30', 'active', 8500000.00, 5670000.00, 67, 'high', 'Commercial', 'Moyo Mining (Pty) Ltd'),
('a6000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'PRJ-002', 'Nkosi Shopping Centre', 'Mixed-use retail and office development - Soweto', '2025-03-15', '2026-09-30', 'active', 25000000.00, 14500000.00, 58, 'high', 'Commercial', 'Dlamini Development Group'),
('a6000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'PRJ-003', 'Thembisa School Block D', 'Government school classroom block - 12 classrooms', '2025-09-01', '2026-04-30', 'active', 6200000.00, 4890000.00, 79, 'high', 'Government', 'Gauteng Dept of Public Works'),
('a6000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'PRJ-004', 'Umhlanga Residential Complex', 'Luxury apartment complex - 48 units', '2025-11-01', '2027-02-28', 'active', 45000000.00, 8900000.00, 20, 'medium', 'Residential', 'Zulu Properties Holdings'),
('a6000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'PRJ-005', 'Khayelitsha Housing Phase 5', 'Low-cost housing development - 200 units', '2025-10-15', '2026-12-31', 'active', 32000000.00, 12400000.00, 39, 'high', 'Government', 'Cape Town Metro Housing'),
('a6000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'PRJ-006', 'Sandton Office Park', 'Premium office park renovation - 3 buildings', '2026-01-15', '2026-10-31', 'active', 12000000.00, 1890000.00, 16, 'medium', 'Commercial', 'Dlamini Development Group'),
('a6000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'PRJ-007', 'Parktown Clinic Extension', 'Medical clinic extension - consultation rooms and pharmacy', '2026-01-01', '2026-07-31', 'active', 5600000.00, 780000.00, 14, 'medium', 'Healthcare', 'Ndaba Healthcare Trust'),
('a6000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'PRJ-008', 'Soweto Library Extension', 'Community library extension and digital hub', '2026-02-01', '2026-08-31', 'planning', 3800000.00, 0.00, 0, 'low', 'Government', 'Sisulu Education Foundation');

-- ============================================================
-- 18. ASSETS (Company equipment & vehicles)
-- ============================================================
INSERT INTO assets (id, tenant_id, asset_code, asset_name, description, category, location, purchase_date, purchase_price, current_value, accumulated_depreciation, depreciation_method, useful_life_years, salvage_value, status) VALUES
('aa000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'VEH-001', 'Toyota Hilux 2.8 GD-6 4x4', 'Double cab bakkie - Site Manager vehicle', 'Motor Vehicles', 'Johannesburg Yard', '2023-06-15', 720000.00, 504000.00, 216000.00, 'straight-line', 5, 120000.00, 'active'),
('aa000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'VEH-002', 'Toyota Hilux 2.4 GD-6', 'Single cab bakkie - Foreman vehicle', 'Motor Vehicles', 'Pretoria Yard', '2023-09-01', 580000.00, 429200.00, 150800.00, 'straight-line', 5, 95000.00, 'active'),
('aa000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'VEH-003', 'Isuzu FTR 850 Truck', '8-ton truck for material transport', 'Motor Vehicles', 'Johannesburg Yard', '2022-03-01', 890000.00, 534000.00, 356000.00, 'straight-line', 5, 150000.00, 'active'),
('aa000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'VEH-004', 'Mercedes Vito Panel Van', 'Panel van - delivery and transport', 'Motor Vehicles', 'Johannesburg Yard', '2024-01-15', 650000.00, 520000.00, 130000.00, 'straight-line', 5, 100000.00, 'active'),
('aa000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'EQP-001', 'CAT 428F2 Backhoe Loader', 'Backhoe loader for earthworks', 'Plant & Equipment', 'Moyo Mining Site', '2021-06-01', 1450000.00, 725000.00, 725000.00, 'straight-line', 8, 200000.00, 'active'),
('aa000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'EQP-002', 'Concrete Mixer - 350L', 'Electric concrete mixer', 'Plant & Equipment', 'Johannesburg Yard', '2023-01-10', 45000.00, 30000.00, 15000.00, 'straight-line', 5, 5000.00, 'active'),
('aa000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'EQP-003', 'Scaffolding Set (50 bays)', 'Complete scaffolding set with platforms and guardrails', 'Plant & Equipment', 'Nkosi Shopping Centre', '2022-03-15', 280000.00, 175000.00, 105000.00, 'straight-line', 8, 40000.00, 'active'),
('aa000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'EQP-004', 'Survey Equipment - Total Station', 'Leica TS06 Total Station', 'Plant & Equipment', 'Head Office', '2023-08-01', 185000.00, 138750.00, 46250.00, 'straight-line', 8, 20000.00, 'active'),
('aa000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'OFF-001', 'Dell Latitude Laptops (x10)', '10x Dell Latitude 5540 laptops', 'Office Equipment', 'Head Office', '2024-06-01', 220000.00, 176000.00, 44000.00, 'straight-line', 3, 22000.00, 'active'),
('aa000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'OFF-002', 'Office Furniture Set', 'Desks, chairs, cabinets for head office', 'Office Equipment', 'Head Office', '2022-01-15', 180000.00, 108000.00, 72000.00, 'straight-line', 10, 18000.00, 'active'),
('aa000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'EQP-005', 'Generator - 100kVA', 'Diesel generator for site power', 'Plant & Equipment', 'Khayelitsha Site', '2023-11-01', 345000.00, 258750.00, 86250.00, 'straight-line', 8, 45000.00, 'active'),
('aa000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'EQP-006', 'Tower Crane - Liebherr 81K', 'Tower crane for multi-storey work', 'Plant & Equipment', 'Umhlanga Site', '2024-11-01', 3500000.00, 3062500.00, 437500.00, 'straight-line', 10, 500000.00, 'active');

-- ============================================================
-- 19. SALES QUOTES
-- ============================================================
INSERT INTO sales_quotes (id, tenant_id, quote_number, customer_id, quote_date, valid_until, status, subtotal, tax_amount, total_amount, currency, notes) VALUES
('ae200001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'QTE-2026-001', 'ab000001-0000-0000-0000-000000000004', '2026-02-01', '2026-03-03', 'sent', 6956521.74, 1043478.26, 8000000.00, 'ZAR', 'Dlamini Group - Roodepoort Warehouse Complex'),
('ae200001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'QTE-2026-002', 'ab000001-0000-0000-0000-000000000001', '2026-02-05', '2026-03-07', 'sent', 2608695.65, 391304.35, 3000000.00, 'ZAR', 'Moyo Mining - Phase 3 Workshop Extension'),
('ae200001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'QTE-2026-003', 'ab000001-0000-0000-0000-000000000007', '2026-02-10', '2026-03-12', 'draft', 4347826.09, 652173.91, 5000000.00, 'ZAR', 'Ndaba Trust - Diepkloof Community Health Centre'),
('ae200001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'QTE-2026-004', 'ab000001-0000-0000-0000-000000000005', '2026-02-12', '2026-03-14', 'draft', 17391304.35, 2608695.65, 20000000.00, 'ZAR', 'CT Metro - Mitchells Plain Secondary School');

-- ============================================================
-- 20. LEAVE REQUESTS
-- leave_type_id references hr_leave_types (already seeded in production):
--   ANNUAL: de068af5-b4d3-48f4-baed-a9a3e7d34be8
--   SICK:   67d263be-a0ba-45e1-aef8-076a8279f692
--   STUDY:  7c64f1d2-2e85-41ab-8b26-44c217276ae7
-- ============================================================
INSERT INTO hr_leave_requests (id, tenant_id, employee_id, leave_type_id, start_date, end_date, days_requested, status, reason) VALUES
('a5000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ae000001-0000-0000-0000-000000000006', 'de068af5-b4d3-48f4-baed-a9a3e7d34be8', '2026-02-14', '2026-02-21', 5, 'approved', 'Family holiday - Drakensberg'),
('a5000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ae000001-0000-0000-0000-000000000011', '67d263be-a0ba-45e1-aef8-076a8279f692', '2026-02-10', '2026-02-11', 2, 'approved', 'Medical appointment'),
('a5000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ae000001-0000-0000-0000-000000000004', 'de068af5-b4d3-48f4-baed-a9a3e7d34be8', '2026-03-17', '2026-03-28', 10, 'pending', 'Annual leave - Easter break'),
('a5000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ae000001-0000-0000-0000-000000000008', '7c64f1d2-2e85-41ab-8b26-44c217276ae7', '2026-03-01', '2026-03-05', 5, 'approved', 'CIMA exam preparation');

-- ============================================================
-- 21. JOURNAL ENTRIES (Key GL transactions)
-- source_type is NOT NULL with no default - must provide
-- ============================================================
INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, description, reference, source_type, status, total_debit, total_credit, created_at) VALUES
('ae100001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'JE-2026-001', '2026-01-31', 'January 2026 Salary Accrual', 'PAY-2026-01', 'MANUAL', 'posted', 929000.00, 929000.00, '2026-01-31'),
('ae100001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'JE-2026-002', '2026-01-31', 'January 2026 Depreciation', 'DEP-2026-01', 'MANUAL', 'posted', 103750.00, 103750.00, '2026-01-31'),
('ae100001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'JE-2026-003', '2026-01-31', 'VAT Return - January 2026', 'VAT-2026-01', 'MANUAL', 'posted', 333390.00, 333390.00, '2026-01-31'),
('ae100001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'JE-2026-004', '2026-02-28', 'February 2026 Salary Accrual', 'PAY-2026-02', 'MANUAL', 'draft', 929000.00, 929000.00, '2026-02-13'),
('ae100001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'JE-2026-005', '2026-02-28', 'February 2026 Depreciation', 'DEP-2026-02', 'MANUAL', 'draft', 103750.00, 103750.00, '2026-02-13');

-- ============================================================
-- 22. CASH BANK ACCOUNTS (for Cash Management module)
-- ============================================================
INSERT INTO cash_bank_accounts (tenant_id, bank_code, account_name, account_number, account_type, branch_code, currency, opening_balance, current_balance, available_balance, gl_account_code, is_primary, is_active, created_by) VALUES
('00000000-0000-0000-0000-000000000001', 'FNB', 'FNB Business Cheque Account', '62845917203', 'CURRENT', '250655', 'ZAR', 500000.00, 2847500.00, 2847500.00, '1110', true, true, '00000000-0000-0000-0000-000000000000'),
('00000000-0000-0000-0000-000000000001', 'NDB', 'Nedbank Business Savings', '1048392756', 'SAVINGS', '198765', 'ZAR', 250000.00, 1250000.00, 1250000.00, '1120', false, true, '00000000-0000-0000-0000-000000000000'),
('00000000-0000-0000-0000-000000000001', 'STD', 'Standard Bank USD Account', '270148395', 'CURRENT', '051001', 'USD', 10000.00, 45230.00, 45230.00, '1110', false, true, '00000000-0000-0000-0000-000000000000');

-- ============================================================
-- DONE! Verify counts
-- ============================================================
SELECT 'departments' as entity, COUNT(*) as count FROM departments WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'hr_departments', COUNT(*) FROM hr_departments WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'hr_employees', COUNT(*) FROM hr_employees WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'hr_payroll_runs', COUNT(*) FROM hr_payroll_runs WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'chart_of_accounts', COUNT(*) FROM chart_of_accounts WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'bank_accounts', COUNT(*) FROM bank_accounts WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'bank_transactions', COUNT(*) FROM bank_transactions WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'sales_customers', COUNT(*) FROM sales_customers WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'sales_invoices', COUNT(*) FROM sales_invoices WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'sales_quotes', COUNT(*) FROM sales_quotes WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'purchase_suppliers', COUNT(*) FROM purchase_suppliers WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'purchase_orders', COUNT(*) FROM purchase_orders WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'inventory_warehouses', COUNT(*) FROM inventory_warehouses WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'inventory_items', COUNT(*) FROM inventory_items WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'products', COUNT(*) FROM products WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'projects', COUNT(*) FROM projects WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'assets', COUNT(*) FROM assets WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'journal_entries', COUNT(*) FROM journal_entries WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'cash_bank_accounts', COUNT(*) FROM cash_bank_accounts WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY entity;

COMMIT;
