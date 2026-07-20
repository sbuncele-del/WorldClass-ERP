/**
 * Xero Sync Service
 *
 * Pulls Chart of Accounts, Contacts (customers + suppliers), Invoices
 * (sales + bills), and Bank Transactions from a tenant's connected Xero
 * org into this platform's real tables. Each sync function is idempotent
 * (upsert via ON CONFLICT on a tenant_id + xero_*_id crosswalk) and
 * tolerates per-row errors without aborting the whole run, matching the
 * convention already established in migration.controller.v2.ts.
 *
 * Sync order matters: accounts -> contacts -> invoices -> bank transactions.
 * Invoices resolve their customer/supplier via the xero_contact_id
 * crosswalk populated by the contacts sync, so contacts must run first.
 *
 * No journal entries are posted from invoices/bank transactions here -
 * Xero already keeps its own GL; double-posting into journal_entries
 * would be wrong. That's a deliberate v1 scope decision, not an oversight.
 */

import pool from '../config/database';
import XeroClientService from './xero-client.service';

export interface SyncResult {
  dataType: string;
  totalRows: number;
  imported: number;
  errors: number;
  errorDetails: string[];
}

const ACCOUNT_TYPE_MAP: Record<string, { accountType: string; normalBalance: 'DEBIT' | 'CREDIT' }> = {
  BANK: { accountType: 'ASSET', normalBalance: 'DEBIT' },
  CURRENT: { accountType: 'ASSET', normalBalance: 'DEBIT' },
  FIXED: { accountType: 'ASSET', normalBalance: 'DEBIT' },
  INVENTORY: { accountType: 'ASSET', normalBalance: 'DEBIT' },
  NONCURRENT: { accountType: 'ASSET', normalBalance: 'DEBIT' },
  PREPAYMENT: { accountType: 'ASSET', normalBalance: 'DEBIT' },
  TERMLIAB: { accountType: 'LIABILITY', normalBalance: 'CREDIT' },
  CURRLIAB: { accountType: 'LIABILITY', normalBalance: 'CREDIT' },
  PAYG: { accountType: 'LIABILITY', normalBalance: 'CREDIT' },
  SUPERANNUATIONLIABILITY: { accountType: 'LIABILITY', normalBalance: 'CREDIT' },
  EQUITY: { accountType: 'EQUITY', normalBalance: 'CREDIT' },
  REVENUE: { accountType: 'REVENUE', normalBalance: 'CREDIT' },
  SALES: { accountType: 'REVENUE', normalBalance: 'CREDIT' },
  OTHERINCOME: { accountType: 'REVENUE', normalBalance: 'CREDIT' },
  EXPENSE: { accountType: 'EXPENSE', normalBalance: 'DEBIT' },
  OVERHEADS: { accountType: 'EXPENSE', normalBalance: 'DEBIT' },
  DIRECTCOSTS: { accountType: 'EXPENSE', normalBalance: 'DEBIT' },
  DEPRECIATN: { accountType: 'EXPENSE', normalBalance: 'DEBIT' },
  SUPERANNUATIONEXPENSE: { accountType: 'EXPENSE', normalBalance: 'DEBIT' },
};

async function logSyncRun(
  tenantId: string,
  dataType: string,
  imported: number,
  errors: number,
  errorDetails: string[],
  importedBy: string
): Promise<void> {
  await pool.query(
    `INSERT INTO migration_history (tenant_id, data_type, source_platform, file_name, total_rows, imported_rows, error_rows, error_details, imported_by)
     VALUES ($1, $2, 'xero', NULL, $3, $4, $5, $6, $7)`,
    [tenantId, dataType, imported + errors, imported, errors, JSON.stringify(errorDetails.slice(0, 50)), importedBy]
  );
}

async function syncAccounts(tenantId: string, userId: string): Promise<SyncResult> {
  const client = await XeroClientService.getXeroClientForTenant(tenantId);
  const response = await client.get('/Accounts');
  const accounts = response.data.Accounts || [];

  const errorDetails: string[] = [];
  let imported = 0;

  for (const account of accounts) {
    try {
      const mapping = ACCOUNT_TYPE_MAP[account.Type] || { accountType: 'ASSET', normalBalance: 'DEBIT' };
      await pool.query(
        `INSERT INTO chart_of_accounts (tenant_id, account_code, account_name, account_type, normal_balance, description, is_active, xero_account_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tenant_id, xero_account_id) WHERE xero_account_id IS NOT NULL DO UPDATE SET
           account_name = EXCLUDED.account_name,
           account_type = EXCLUDED.account_type,
           normal_balance = EXCLUDED.normal_balance,
           description = EXCLUDED.description,
           is_active = EXCLUDED.is_active`,
        [
          tenantId,
          account.Code || account.AccountID,
          account.Name,
          mapping.accountType,
          mapping.normalBalance,
          account.Description || null,
          account.Status === 'ACTIVE',
          account.AccountID,
        ]
      );
      imported++;
    } catch (e: any) {
      errorDetails.push(`Account ${account.Code || account.AccountID}: ${e.message}`);
    }
  }

  await logSyncRun(tenantId, 'chart_of_accounts', imported, errorDetails.length, errorDetails, userId);
  return { dataType: 'chart_of_accounts', totalRows: accounts.length, imported, errors: errorDetails.length, errorDetails };
}

async function syncContacts(tenantId: string, userId: string): Promise<SyncResult> {
  const client = await XeroClientService.getXeroClientForTenant(tenantId);
  const response = await client.get('/Contacts');
  const contacts = response.data.Contacts || [];

  const errorDetails: string[] = [];
  let imported = 0;

  for (const contact of contacts) {
    const shortId = String(contact.ContactID).slice(0, 8);
    const address = (contact.Addresses || [])[0] || {};

    if (contact.IsCustomer) {
      try {
        await pool.query(
          `INSERT INTO customers (tenant_id, customer_code, customer_name, email, phone, address_line1, address_line2, city, province, postal_code, vat_number, xero_contact_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (tenant_id, xero_contact_id) WHERE xero_contact_id IS NOT NULL DO UPDATE SET
             customer_name = EXCLUDED.customer_name,
             email = EXCLUDED.email,
             phone = EXCLUDED.phone,
             address_line1 = EXCLUDED.address_line1,
             address_line2 = EXCLUDED.address_line2,
             city = EXCLUDED.city,
             province = EXCLUDED.province,
             postal_code = EXCLUDED.postal_code,
             vat_number = EXCLUDED.vat_number`,
          [
            tenantId,
            `XERO-${shortId}`,
            contact.Name,
            contact.EmailAddress || null,
            (contact.Phones || [])[0]?.PhoneNumber || null,
            address.AddressLine1 || null,
            address.AddressLine2 || null,
            address.City || null,
            address.Region || null,
            address.PostalCode || null,
            contact.TaxNumber || null,
            contact.ContactID,
          ]
        );
        imported++;
      } catch (e: any) {
        errorDetails.push(`Customer ${contact.Name}: ${e.message}`);
      }
    }

    if (contact.IsSupplier) {
      try {
        await pool.query(
          `INSERT INTO purchase.suppliers (tenant_id, supplier_code, company_name, contact_person, email, phone, vat_number, xero_contact_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (tenant_id, xero_contact_id) WHERE xero_contact_id IS NOT NULL DO UPDATE SET
             company_name = EXCLUDED.company_name,
             email = EXCLUDED.email,
             phone = EXCLUDED.phone,
             vat_number = EXCLUDED.vat_number`,
          [
            tenantId,
            `XERO-${shortId}`,
            contact.Name,
            (contact.ContactPersons || [])[0]?.FirstName || null,
            contact.EmailAddress || null,
            (contact.Phones || [])[0]?.PhoneNumber || null,
            contact.TaxNumber || null,
            contact.ContactID,
          ]
        );
        imported++;
      } catch (e: any) {
        errorDetails.push(`Supplier ${contact.Name}: ${e.message}`);
      }
    }
  }

  await logSyncRun(tenantId, 'contacts', imported, errorDetails.length, errorDetails, userId);
  return { dataType: 'contacts', totalRows: contacts.length, imported, errors: errorDetails.length, errorDetails };
}

async function syncInvoices(tenantId: string, userId: string): Promise<SyncResult> {
  const client = await XeroClientService.getXeroClientForTenant(tenantId);
  const response = await client.get('/Invoices');
  const invoices = response.data.Invoices || [];

  const errorDetails: string[] = [];
  let imported = 0;

  for (const invoice of invoices) {
    try {
      if (invoice.Type === 'ACCREC') {
        const customerResult = await pool.query(
          `SELECT customer_id FROM customers WHERE tenant_id = $1 AND xero_contact_id = $2`,
          [tenantId, invoice.Contact?.ContactID]
        );
        if (customerResult.rows.length === 0) {
          errorDetails.push(`Invoice ${invoice.InvoiceNumber}: customer not yet synced (${invoice.Contact?.Name})`);
          continue;
        }
        await pool.query(
          `INSERT INTO sales_invoices (tenant_id, invoice_number, customer_id, invoice_date, due_date, reference, status, subtotal, vat_amount, total_amount, amount_paid, amount_due, xero_invoice_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (tenant_id, xero_invoice_id) WHERE xero_invoice_id IS NOT NULL DO UPDATE SET
             status = EXCLUDED.status,
             subtotal = EXCLUDED.subtotal,
             vat_amount = EXCLUDED.vat_amount,
             total_amount = EXCLUDED.total_amount,
             amount_paid = EXCLUDED.amount_paid,
             amount_due = EXCLUDED.amount_due`,
          [
            tenantId,
            invoice.InvoiceNumber || invoice.InvoiceID,
            customerResult.rows[0].customer_id,
            invoice.DateString?.split('T')[0] || invoice.Date?.split('T')[0],
            invoice.DueDateString?.split('T')[0] || invoice.DueDate?.split('T')[0],
            invoice.Reference || null,
            invoice.Status || 'DRAFT',
            invoice.SubTotal || 0,
            invoice.TotalTax || 0,
            invoice.Total || 0,
            (invoice.Total || 0) - (invoice.AmountDue || 0),
            invoice.AmountDue || 0,
            invoice.InvoiceID,
          ]
        );
        imported++;
      } else if (invoice.Type === 'ACCPAY') {
        const supplierResult = await pool.query(
          `SELECT supplier_id FROM purchase.suppliers WHERE tenant_id = $1 AND xero_contact_id = $2`,
          [tenantId, invoice.Contact?.ContactID]
        );
        if (supplierResult.rows.length === 0) {
          errorDetails.push(`Bill ${invoice.InvoiceNumber}: supplier not yet synced (${invoice.Contact?.Name})`);
          continue;
        }
        await pool.query(
          `INSERT INTO purchase.vendor_invoices (tenant_id, invoice_number, supplier_id, invoice_date, due_date, status, subtotal, vat_amount, total_amount, amount_paid, amount_outstanding, xero_invoice_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (tenant_id, xero_invoice_id) WHERE xero_invoice_id IS NOT NULL DO UPDATE SET
             status = EXCLUDED.status,
             subtotal = EXCLUDED.subtotal,
             vat_amount = EXCLUDED.vat_amount,
             total_amount = EXCLUDED.total_amount,
             amount_paid = EXCLUDED.amount_paid,
             amount_outstanding = EXCLUDED.amount_outstanding`,
          [
            tenantId,
            invoice.InvoiceNumber || invoice.InvoiceID,
            supplierResult.rows[0].supplier_id,
            invoice.DateString?.split('T')[0] || invoice.Date?.split('T')[0],
            invoice.DueDateString?.split('T')[0] || invoice.DueDate?.split('T')[0],
            (invoice.Status || 'DRAFT').toLowerCase(),
            invoice.SubTotal || 0,
            invoice.TotalTax || 0,
            invoice.Total || 0,
            (invoice.Total || 0) - (invoice.AmountDue || 0),
            invoice.AmountDue || 0,
            invoice.InvoiceID,
          ]
        );
        imported++;
      }
    } catch (e: any) {
      errorDetails.push(`Invoice ${invoice.InvoiceNumber || invoice.InvoiceID}: ${e.message}`);
    }
  }

  await logSyncRun(tenantId, 'invoices', imported, errorDetails.length, errorDetails, userId);
  return { dataType: 'invoices', totalRows: invoices.length, imported, errors: errorDetails.length, errorDetails };
}

async function getOrCreateBankAccount(tenantId: string, userId: string, xeroAccount: any): Promise<number> {
  const existing = await pool.query(
    `SELECT account_id FROM cash_bank_accounts WHERE tenant_id = $1 AND account_number = $2`,
    [tenantId, xeroAccount.BankAccountNumber || xeroAccount.AccountID]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].account_id;
  }
  const created = await pool.query(
    `INSERT INTO cash_bank_accounts (tenant_id, account_name, account_number, account_type, currency, is_active, created_by)
     VALUES ($1, $2, $3, 'CURRENT', $4, true, $5)
     RETURNING account_id`,
    [tenantId, xeroAccount.Name, xeroAccount.BankAccountNumber || xeroAccount.AccountID, xeroAccount.CurrencyCode || 'ZAR', userId]
  );
  return created.rows[0].account_id;
}

async function getOrCreateSyncStatement(tenantId: string, userId: string, accountId: number): Promise<number> {
  const existing = await pool.query(
    `SELECT statement_id FROM cash_bank_statements WHERE tenant_id = $1 AND account_id = $2 AND import_source = 'xero' AND status != 'RECONCILED'`,
    [tenantId, accountId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].statement_id;
  }
  const today = new Date().toISOString().split('T')[0];
  const created = await pool.query(
    `INSERT INTO cash_bank_statements (tenant_id, account_id, statement_date, period_from, period_to, opening_balance, closing_balance, status, imported_by, import_source)
     VALUES ($1, $2, $3, $3, $3, 0, 0, 'IMPORTED', $4, 'xero')
     RETURNING statement_id`,
    [tenantId, accountId, today, userId]
  );
  return created.rows[0].statement_id;
}

async function syncBankTransactions(tenantId: string, userId: string): Promise<SyncResult> {
  const client = await XeroClientService.getXeroClientForTenant(tenantId);
  const response = await client.get('/BankTransactions');
  const transactions = response.data.BankTransactions || [];

  const errorDetails: string[] = [];
  let imported = 0;
  const statementIdCache = new Map<string, number>();

  for (const txn of transactions) {
    try {
      const bankAccountId = txn.BankAccount?.AccountID;
      if (!bankAccountId) {
        errorDetails.push(`Bank transaction ${txn.BankTransactionID}: no bank account reference`);
        continue;
      }

      let statementId = statementIdCache.get(bankAccountId);
      if (!statementId) {
        const accountId = await getOrCreateBankAccount(tenantId, userId, txn.BankAccount);
        statementId = await getOrCreateSyncStatement(tenantId, userId, accountId);
        statementIdCache.set(bankAccountId, statementId);
      }

      const isReceive = txn.Type === 'RECEIVE';
      const amount = txn.Total || 0;

      await pool.query(
        `INSERT INTO cash_bank_statement_lines (statement_id, tenant_id, line_number, transaction_date, description, reference, debit_amount, credit_amount, xero_bank_transaction_id)
         VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tenant_id, xero_bank_transaction_id) WHERE xero_bank_transaction_id IS NOT NULL DO UPDATE SET
           description = EXCLUDED.description,
           debit_amount = EXCLUDED.debit_amount,
           credit_amount = EXCLUDED.credit_amount`,
        [
          statementId,
          tenantId,
          txn.DateString?.split('T')[0] || txn.Date?.split('T')[0],
          txn.Contact?.Name || txn.Reference || 'Xero bank transaction',
          txn.Reference || null,
          isReceive ? 0 : amount,
          isReceive ? amount : 0,
          txn.BankTransactionID,
        ]
      );
      imported++;
    } catch (e: any) {
      errorDetails.push(`Bank transaction ${txn.BankTransactionID}: ${e.message}`);
    }
  }

  await logSyncRun(tenantId, 'bank_transactions', imported, errorDetails.length, errorDetails, userId);
  return { dataType: 'bank_transactions', totalRows: transactions.length, imported, errors: errorDetails.length, errorDetails };
}

async function syncAll(tenantId: string, userId: string): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  results.push(await syncAccounts(tenantId, userId));
  results.push(await syncContacts(tenantId, userId));
  results.push(await syncInvoices(tenantId, userId));
  results.push(await syncBankTransactions(tenantId, userId));
  return results;
}

export const XeroSyncService = {
  syncAccounts,
  syncContacts,
  syncInvoices,
  syncBankTransactions,
  syncAll,
};

export default XeroSyncService;
