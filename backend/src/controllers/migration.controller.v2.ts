/**
 * Migration Controller V2 — Tenant-Hardened
 *
 * Handles data import from external accounting platforms
 * (QuickBooks, Xero, Sage, Pastel) via CSV file upload.
 *
 * Supports: Chart of Accounts, Customers, Suppliers, Invoices,
 * Bills, Products, Bank Transactions, Employees, Fixed Assets.
 */

import { Response } from 'express';
import pool from '../config/database';
import { TenantRequest } from '../types';
import { parse } from 'csv-parse/sync';

function getTenantContext(req: TenantRequest): { tenantId: string; userId?: string; entityId?: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: req.user?.id, entityId: req.entity?.id || req.entityId };
}

type DataType = 'chart-of-accounts' | 'customers' | 'suppliers' | 'invoices' | 'bills' | 'products' | 'bank-transactions' | 'employees' | 'assets' | 'opening-balances';

const VALID_DATA_TYPES: DataType[] = ['chart-of-accounts', 'customers', 'suppliers', 'invoices', 'bills', 'products', 'bank-transactions', 'employees', 'assets', 'opening-balances'];

function parseCSVBuffer(buffer: Buffer): Record<string, string>[] {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
}

function applyMappings(records: Record<string, string>[], mappings: Array<{ source: string; target: string }>): Record<string, string>[] {
  return records.map(record => {
    const mapped: Record<string, string> = {};
    for (const m of mappings) {
      if (m.source && m.target && record[m.source] !== undefined) {
        mapped[m.target] = record[m.source];
      }
    }
    return mapped;
  });
}

export class MigrationController {

  /**
   * POST /api/v1/migration/import
   * Import a CSV file with column mappings for a given data type.
   */
  static async importData(req: TenantRequest, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const { tenantId, userId, entityId } = getTenantContext(req);
      const file = req.file;
      const dataType = req.body.dataType as DataType;
      const sourcePlatform = req.body.sourcePlatform || 'csv';
      const mappingsRaw = req.body.mappings;

      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      if (!dataType || !VALID_DATA_TYPES.includes(dataType)) {
        res.status(400).json({ success: false, message: `Invalid data type. Must be one of: ${VALID_DATA_TYPES.join(', ')}` });
        return;
      }

      let mappings: Array<{ source: string; target: string }>;
      try {
        mappings = typeof mappingsRaw === 'string' ? JSON.parse(mappingsRaw) : mappingsRaw;
      } catch {
        res.status(400).json({ success: false, message: 'Invalid mappings format' });
        return;
      }

      if (!Array.isArray(mappings) || mappings.length === 0) {
        res.status(400).json({ success: false, message: 'Column mappings are required' });
        return;
      }

      // Parse CSV
      const records = parseCSVBuffer(file.buffer);
      if (records.length === 0) {
        res.status(400).json({ success: false, message: 'File contains no data rows' });
        return;
      }

      // Apply column mappings
      const mappedRecords = applyMappings(records, mappings);

      await client.query('BEGIN');

      let imported = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      // Route to the appropriate importer
      switch (dataType) {
        case 'chart-of-accounts':
          ({ imported, errors } = await importChartOfAccounts(client, tenantId, entityId, mappedRecords, errorDetails));
          break;
        case 'customers':
          ({ imported, errors } = await importContacts(client, tenantId, entityId, mappedRecords, 'customer', errorDetails));
          break;
        case 'suppliers':
          ({ imported, errors } = await importContacts(client, tenantId, entityId, mappedRecords, 'supplier', errorDetails));
          break;
        case 'invoices':
          ({ imported, errors } = await importInvoices(client, tenantId, entityId, mappedRecords, 'invoice', errorDetails));
          break;
        case 'bills':
          ({ imported, errors } = await importInvoices(client, tenantId, entityId, mappedRecords, 'bill', errorDetails));
          break;
        case 'products':
          ({ imported, errors } = await importProducts(client, tenantId, entityId, mappedRecords, errorDetails));
          break;
        case 'bank-transactions':
          ({ imported, errors } = await importBankTransactions(client, tenantId, entityId, mappedRecords, errorDetails));
          break;
        case 'employees':
          ({ imported, errors } = await importEmployees(client, tenantId, entityId, mappedRecords, errorDetails));
          break;
        case 'assets':
          ({ imported, errors } = await importAssets(client, tenantId, entityId, mappedRecords, errorDetails));
          break;
        case 'opening-balances':
          ({ imported, errors } = await importOpeningBalances(client, tenantId, entityId, userId, mappedRecords, errorDetails));
          break;
      }

      // Record migration history
      await client.query(`
        INSERT INTO migration_history (tenant_id, data_type, source_platform, file_name, total_rows, imported_rows, error_rows, error_details, imported_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [tenantId, dataType, sourcePlatform, file.originalname, records.length, imported, errors, JSON.stringify(errorDetails.slice(0, 50)), userId || null]);

      await client.query('COMMIT');

      res.json({
        success: true,
        dataType,
        total: records.length,
        imported,
        errors,
        errorDetails: errorDetails.slice(0, 20),
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration import error:', error);
      res.status(500).json({
        success: false,
        message: 'Import failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      client.release();
    }
  }

  /**
   * POST /api/v1/migration/validate
   * Validate a file without importing.
   */
  static async validateData(req: TenantRequest, res: Response): Promise<void> {
    try {
      getTenantContext(req);
      const file = req.file;
      const dataType = req.body.dataType as DataType;

      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const records = parseCSVBuffer(file.buffer);
      const columns = records.length > 0 ? Object.keys(records[0]) : [];
      const preview = records.slice(0, 5);

      res.json({
        success: true,
        dataType,
        totalRows: records.length,
        columns,
        preview,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Validation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/migration/history
   */
  static async getHistory(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const result = await pool.query(
        `SELECT * FROM migration_history WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [tenantId]
      );
      res.json({ success: true, history: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
  }

  /**
   * GET /api/v1/migration/templates/:dataType
   */
  static async getTemplate(req: TenantRequest, res: Response): Promise<void> {
    try {
      const dataType = req.params.dataType as DataType;
      const templates: Record<string, string> = {
        'chart-of-accounts': 'Account Code,Account Name,Account Type,Parent Code,Tax Code,Currency,Description\n1000,Cash at Bank,Asset,,ST,ZAR,Main bank account\n2000,Accounts Payable,Liability,,,ZAR,Trade creditors',
        customers: 'Name,Contact Name,Email,Phone,VAT Number,Address,City,Payment Terms\nABC Supplies,John Smith,john@abc.co.za,011-555-0100,4200123456,10 Main Rd,Johannesburg,30',
        suppliers: 'Name,Contact Name,Email,Phone,VAT Number,Address,City,Payment Terms\nXYZ Materials,Jane Doe,jane@xyz.co.za,012-555-0200,4200234567,25 Oak Ave,Pretoria,60',
        invoices: 'Invoice Number,Customer Name,Date,Due Date,Description,Amount,VAT Amount,Status,Account Code\nINV-001,ABC Supplies,2025-01-15,2025-02-14,Consulting services,10000.00,1500.00,unpaid,4000',
        bills: 'Bill Number,Supplier Name,Date,Due Date,Description,Amount,VAT Amount,Status,Account Code\nBILL-001,XYZ Materials,2025-01-10,2025-02-09,Raw materials,5000.00,750.00,paid,5000',
        products: 'SKU,Name,Description,Category,Selling Price,Cost Price,Stock on Hand,Tax Code\nPROD-001,Widget A,Standard widget,Parts,150.00,80.00,250,ST',
        'bank-transactions': 'Date,Description,Amount,Reference,Type,Bank Account,Category\n2025-01-15,FNB Debit Order - Insurance,-1500.00,REF001,debit,FNB Cheque,Insurance',
        employees: 'Employee Number,First Name,Last Name,Email,ID Number,Tax Reference,Department,Basic Salary,Start Date\nEMP001,Thabo,Mokoena,thabo@company.co.za,9001015800081,1234567890,Engineering,35000.00,2024-01-15',
        assets: 'Asset Code,Name,Category,Purchase Date,Purchase Cost,Accumulated Depreciation,Useful Life,Method,Location\nAST-001,Dell Laptop,Computer Equipment,2024-06-01,18000.00,3000.00,3,straight-line,Head Office',
      };

      const csv = templates[dataType];
      if (!csv) {
        res.status(404).json({ success: false, message: 'Unknown data type' });
        return;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dataType}-template.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to generate template' });
    }
  }

  /**
   * GET /api/v1/migration/status
   */
  static async getStatus(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const result = await pool.query(
        `SELECT data_type, SUM(imported_rows) as total_imported, MAX(created_at) as last_import
         FROM migration_history WHERE tenant_id = $1
         GROUP BY data_type ORDER BY last_import DESC`,
        [tenantId]
      );
      res.json({ success: true, status: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch status' });
    }
  }
}

// ─── Import Helpers ─────────────────────────────────────────────

async function importChartOfAccounts(
  client: any, tenantId: string, entityId: string | undefined,
  records: Record<string, string>[], errorDetails: string[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0, errors = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.account_code || !r.account_name) {
      errorDetails.push(`Row ${i + 1}: Missing account_code or account_name`);
      errors++;
      continue;
    }
    // account_type CHECK constraint only allows these five, uppercase
    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    const accountType = validTypes.includes((r.account_type || '').toUpperCase())
      ? r.account_type.toUpperCase()
      : 'ASSET';
    try {
      await client.query(`
        INSERT INTO chart_of_accounts (tenant_id, account_code, account_name, account_type, parent_code, default_tax_code, currency, description, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        ON CONFLICT (tenant_id, account_code) DO UPDATE SET
          account_name = EXCLUDED.account_name,
          account_type = COALESCE(EXCLUDED.account_type, chart_of_accounts.account_type),
          description = COALESCE(EXCLUDED.description, chart_of_accounts.description)
      `, [tenantId, r.account_code, r.account_name, accountType, r.parent_code || null, r.tax_code || null, r.currency || 'ZAR', r.description || null]);
      imported++;
    } catch (e: any) {
      errorDetails.push(`Row ${i + 1}: ${e.message}`);
      errors++;
    }
  }
  return { imported, errors };
}

async function importContacts(
  client: any, tenantId: string, entityId: string | undefined,
  records: Record<string, string>[], contactType: 'customer' | 'supplier', errorDetails: string[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0, errors = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.name) {
      errorDetails.push(`Row ${i + 1}: Missing name`);
      errors++;
      continue;
    }
    try {
      await client.query(`
        INSERT INTO contacts (tenant_id, contact_type, name, contact_name, email, phone, tax_number, address_line1, city, payment_terms_days, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        ON CONFLICT (tenant_id, contact_type, name) DO UPDATE SET
          contact_name = COALESCE(EXCLUDED.contact_name, contacts.contact_name),
          email = COALESCE(EXCLUDED.email, contacts.email),
          phone = COALESCE(EXCLUDED.phone, contacts.phone),
          tax_number = COALESCE(EXCLUDED.tax_number, contacts.tax_number)
      `, [tenantId, contactType, r.name, r.contact_name || null, r.email || null, r.phone || null, r.tax_number || null, r.address_line1 || null, r.city || null, r.payment_terms ? parseInt(r.payment_terms, 10) : 30]);
      imported++;
    } catch (e: any) {
      errorDetails.push(`Row ${i + 1}: ${e.message}`);
      errors++;
    }
  }
  return { imported, errors };
}

async function importInvoices(
  client: any, tenantId: string, entityId: string | undefined,
  records: Record<string, string>[], docType: 'invoice' | 'bill', errorDetails: string[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0, errors = 0;
  const numberField = docType === 'invoice' ? 'invoice_number' : 'bill_number';
  const contactField = docType === 'invoice' ? 'customer_name' : 'supplier_name';
  
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const docNumber = r[numberField] || r.invoice_number || r.bill_number;
    const contactName = r[contactField] || r.customer_name || r.supplier_name;
    
    if (!docNumber || !r.amount) {
      errorDetails.push(`Row ${i + 1}: Missing ${numberField} or amount`);
      errors++;
      continue;
    }
    try {
      await client.query(`
        INSERT INTO ${docType === 'invoice' ? 'invoices' : 'bills'} 
        (tenant_id, ${numberField}, ${contactField.replace('_name', '')}_name, date, due_date, description, amount, tax_amount, status, account_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, [
        tenantId, docNumber, contactName || null,
        r.date || new Date().toISOString().slice(0, 10),
        r.due_date || null, r.description || null,
        parseFloat(r.amount) || 0, parseFloat(r.tax_amount || '0'),
        r.status || 'unpaid', r.account_code || null
      ]);
      imported++;
    } catch (e: any) {
      errorDetails.push(`Row ${i + 1}: ${e.message}`);
      errors++;
    }
  }
  return { imported, errors };
}

async function importProducts(
  client: any, tenantId: string, entityId: string | undefined,
  records: Record<string, string>[], errorDetails: string[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0, errors = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.sku && !r.name) {
      errorDetails.push(`Row ${i + 1}: Missing sku or name`);
      errors++;
      continue;
    }
    try {
      await client.query(`
        INSERT INTO products (tenant_id, sku, name, description, category, unit_price, cost_price, quantity_on_hand, tax_code, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        ON CONFLICT (tenant_id, sku) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, products.name),
          unit_price = COALESCE(EXCLUDED.unit_price, products.unit_price),
          cost_price = COALESCE(EXCLUDED.cost_price, products.cost_price),
          quantity_on_hand = COALESCE(EXCLUDED.quantity_on_hand, products.quantity_on_hand)
      `, [
        tenantId, r.sku || `IMPORT-${i+1}`, r.name || r.sku,
        r.description || null, r.category || null,
        r.unit_price ? parseFloat(r.unit_price) : null,
        r.cost_price ? parseFloat(r.cost_price) : null,
        r.quantity_on_hand ? parseInt(r.quantity_on_hand, 10) : 0,
        r.tax_code || null
      ]);
      imported++;
    } catch (e: any) {
      errorDetails.push(`Row ${i + 1}: ${e.message}`);
      errors++;
    }
  }
  return { imported, errors };
}

async function importBankTransactions(
  client: any, tenantId: string, entityId: string | undefined,
  records: Record<string, string>[], errorDetails: string[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0, errors = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.date || !r.amount) {
      errorDetails.push(`Row ${i + 1}: Missing date or amount`);
      errors++;
      continue;
    }
    try {
      await client.query(`
        INSERT INTO cash_bank_statement_lines (tenant_id, transaction_date, description, amount, reference, transaction_type, bank_account_name, category, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'migration')
      `, [
        tenantId, r.date,
        r.description || 'Imported transaction',
        parseFloat(r.amount) || 0, r.reference || null,
        r.type || (parseFloat(r.amount) < 0 ? 'debit' : 'credit'),
        r.bank_account || null, r.category || null
      ]);
      imported++;
    } catch (e: any) {
      errorDetails.push(`Row ${i + 1}: ${e.message}`);
      errors++;
    }
  }
  return { imported, errors };
}

async function importEmployees(
  client: any, tenantId: string, entityId: string | undefined,
  records: Record<string, string>[], errorDetails: string[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0, errors = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.first_name || !r.last_name) {
      errorDetails.push(`Row ${i + 1}: Missing first_name or last_name`);
      errors++;
      continue;
    }
    try {
      await client.query(`
        INSERT INTO employees (tenant_id, employee_number, first_name, last_name, email, id_number, tax_number, department, basic_salary, start_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
        ON CONFLICT (tenant_id, employee_number) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = COALESCE(EXCLUDED.email, employees.email),
          department = COALESCE(EXCLUDED.department, employees.department),
          basic_salary = COALESCE(EXCLUDED.basic_salary, employees.basic_salary)
      `, [
        tenantId, r.employee_id || `EMP-${i+1}`,
        r.first_name, r.last_name, r.email || null,
        r.id_number || null, r.tax_number || null,
        r.department || null,
        r.basic_salary ? parseFloat(r.basic_salary) : null,
        r.start_date || null
      ]);
      imported++;
    } catch (e: any) {
      errorDetails.push(`Row ${i + 1}: ${e.message}`);
      errors++;
    }
  }
  return { imported, errors };
}

async function importAssets(
  client: any, tenantId: string, entityId: string | undefined,
  records: Record<string, string>[], errorDetails: string[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0, errors = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.name || !r.purchase_cost) {
      errorDetails.push(`Row ${i + 1}: Missing name or purchase_cost`);
      errors++;
      continue;
    }
    try {
      await client.query(`
        INSERT INTO assets (tenant_id, asset_code, name, category, purchase_date, purchase_cost, accumulated_depreciation, useful_life_years, depreciation_method, location, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
        ON CONFLICT (tenant_id, asset_code) DO UPDATE SET
          name = EXCLUDED.name,
          purchase_cost = EXCLUDED.purchase_cost,
          accumulated_depreciation = COALESCE(EXCLUDED.accumulated_depreciation, assets.accumulated_depreciation)
      `, [
        tenantId, r.asset_code || `AST-${i+1}`,
        r.name, r.category || 'General',
        r.purchase_date || new Date().toISOString().slice(0, 10),
        parseFloat(r.purchase_cost) || 0,
        r.accumulated_depreciation ? parseFloat(r.accumulated_depreciation) : 0,
        r.useful_life_years ? parseInt(r.useful_life_years, 10) : 5,
        r.depreciation_method || 'straight-line',
        r.location || null
      ]);
      imported++;
    } catch (e: any) {
      errorDetails.push(`Row ${i + 1}: ${e.message}`);
      errors++;
    }
  }
  return { imported, errors };
}

async function importOpeningBalances(
  client: any, tenantId: string, entityId: string | undefined, userId: string | undefined,
  records: Record<string, string>[], errorDetails: string[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0, errors = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.account_code) {
      errorDetails.push(`Row ${i + 1}: Missing account_code`);
      errors++;
      continue;
    }
    const debit = r.debit ? parseFloat(r.debit) : 0;
    const credit = r.credit ? parseFloat(r.credit) : 0;
    // Signed balance: debit positive, credit negative
    const balance = r.balance !== undefined ? parseFloat(r.balance) : (debit - credit);
    const balanceDate = r.date || new Date().toISOString().slice(0, 10);
    const lineDebit = balance >= 0 ? Math.abs(balance) : 0;
    const lineCredit = balance < 0 ? Math.abs(balance) : 0;
    try {
      // One journal entry header per opening-balance line, matching the real
      // journal_entries/journal_entry_lines split (journal_entries has no
      // account_code/debit/credit columns - those live on journal_entry_lines).
      const jeResult = await client.query(`
        INSERT INTO journal_entries
          (tenant_id, entity_id, journal_number, journal_date, description, reference, source, source_document_type, total_debit, total_credit, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'MIGRATION', 'opening_balance_import', $7, $7, 'POSTED', $8)
        RETURNING journal_entry_id
      `, [
        tenantId, entityId || null,
        `OB-${r.account_code}-${Date.now()}-${i}`,
        balanceDate,
        r.description || 'Opening Balance',
        `OB-${r.account_code}`,
        Math.abs(balance),
        userId ?? null,
      ]);

      const journalEntryId = jeResult.rows[0].journal_entry_id;

      await client.query(`
        INSERT INTO journal_entry_lines
          (journal_entry_id, tenant_id, line_number, account_code, description, debit_amount, credit_amount, currency)
        VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
      `, [
        journalEntryId, tenantId,
        r.account_code,
        r.account_name || r.description || 'Opening Balance',
        lineDebit, lineCredit,
        r.currency || 'ZAR',
      ]);
      imported++;
    } catch (e: any) {
      errorDetails.push(`Row ${i + 1}: ${e.message}`);
      errors++;
    }
  }
  return { imported, errors };
}

export default MigrationController;
