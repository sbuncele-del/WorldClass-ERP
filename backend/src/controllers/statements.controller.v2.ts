/**
 * Statements Controller (V2)
 * Customer and Supplier account statements with transaction history,
 * running balance, and aging analysis.
 *
 * Real DB tables:
 *   - sales.customers — PK: customer_id
 *   - sales_invoices (public) — PK: id, FK: customer_id
 *   - invoice_payments (public) — PK: id, FK: invoice_id (no direct customer_id)
 *   - sales.credit_notes — PK: id, FK: customer_id, date col: issue_date, notes col: reason
 *   - purchase.suppliers — PK: supplier_id
 *   - purchase.vendor_invoices — PK: invoice_id, FK: supplier_id
 *   - purchase.vendor_payments — PK: payment_id, FK: supplier_id
 */
import { Response } from 'express';
import { TenantRequest } from '../types';
import { query } from '../config/database';

interface TenantCtx {
  tenantId: string;
}

function getTenantContext(req: TenantRequest): TenantCtx {
  if (!req.tenant) throw new Error('Tenant context not available');
  return { tenantId: req.tenant.id };
}

/* helper: aging buckets */
function agingBucket(dueDate: string): string {
  const days = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

/* ─────────── CUSTOMER STATEMENTS ─────────── */

/* GET /sales/customers/statements — list all customers with balance summary */
export const listCustomerStatements = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT
         c.customer_id AS id,
         c.customer_code,
         c.company_name,
         c.contact_person,
         c.email,
         COALESCE(c.opening_balance, 0) AS opening_balance,
         COALESCE(inv.total_invoiced, 0) AS total_invoiced,
         COALESCE(inv.total_paid, 0) AS total_paid,
         COALESCE(cn.total_credits, 0) AS total_credits,
         COALESCE(c.opening_balance, 0) + COALESCE(inv.total_invoiced, 0) - COALESCE(inv.total_paid, 0) - COALESCE(cn.total_credits, 0) AS balance
       FROM sales.customers c
       LEFT JOIN LATERAL (
         SELECT SUM(total_amount) AS total_invoiced, SUM(amount_paid) AS total_paid
         FROM sales_invoices WHERE customer_id = c.customer_id AND tenant_id = $1
       ) inv ON TRUE
       LEFT JOIN LATERAL (
         SELECT SUM(total_amount) AS total_credits
         FROM sales.credit_notes WHERE customer_id = c.customer_id AND tenant_id = $1 AND status = 'approved'
       ) cn ON TRUE
       WHERE c.tenant_id = $1
       ORDER BY c.company_name`,
      [ctx.tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing customer statements:', error);
    res.status(500).json({ success: false, message: 'Failed to list customer statements', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* GET /sales/customers/:id/statement — full statement for one customer */
export const getCustomerStatement = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const customerId = req.params.id;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    /* Customer details */
    const custResult = await query(
      `SELECT customer_id AS id, customer_code, company_name, contact_person, email, phone,
              billing_address,
              COALESCE(opening_balance, 0) AS opening_balance
       FROM sales.customers WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, ctx.tenantId]
    );
    if (custResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    const customer = custResult.rows[0];

    /* Invoices */
    const invResult = await query(
      `SELECT id, invoice_number, invoice_date, due_date, total_amount, amount_paid, balance_due, status, notes
       FROM sales_invoices
       WHERE customer_id = $1 AND tenant_id = $2 ${dateFrom && dateTo ? 'AND invoice_date BETWEEN $3 AND $4' : ''}
       ORDER BY invoice_date ASC`,
      dateFrom && dateTo ? [customerId, ctx.tenantId, dateFrom, dateTo] : [customerId, ctx.tenantId]
    );

    /* Payments — must join through sales_invoices because invoice_payments has no customer_id */
    const pmtResult = await query(
      `SELECT p.id, p.payment_date, p.amount, p.payment_method, p.reference, p.notes,
              si.invoice_number
       FROM invoice_payments p
       JOIN sales_invoices si ON si.id = p.invoice_id AND si.tenant_id = $2
       WHERE si.customer_id = $1 AND si.tenant_id = $2
       ${dateFrom && dateTo ? 'AND p.payment_date BETWEEN $3 AND $4' : ''}
       ORDER BY p.payment_date ASC`,
      dateFrom && dateTo ? [customerId, ctx.tenantId, dateFrom, dateTo] : [customerId, ctx.tenantId]
    );

    /* Credit Notes */
    const cnResult = await query(
      `SELECT id, credit_note_number, issue_date, total_amount, status, reason
       FROM sales.credit_notes
       WHERE customer_id = $1 AND tenant_id = $2
       ${dateFrom && dateTo ? 'AND issue_date BETWEEN $3 AND $4' : ''}
       ORDER BY issue_date ASC`,
      dateFrom && dateTo ? [customerId, ctx.tenantId, dateFrom, dateTo] : [customerId, ctx.tenantId]
    );

    /* Merge into chronological transaction list with running balance */
    type TxnLine = { date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number };
    const transactions: TxnLine[] = [];

    for (const inv of invResult.rows) {
      transactions.push({
        date: inv.invoice_date, type: 'Invoice', reference: inv.invoice_number,
        description: inv.notes || `Invoice ${inv.invoice_number}`,
        debit: Number(inv.total_amount), credit: 0, balance: 0,
      });
    }
    for (const pmt of pmtResult.rows) {
      transactions.push({
        date: pmt.payment_date, type: 'Payment', reference: pmt.reference || pmt.invoice_number,
        description: pmt.notes || `Payment — ${pmt.payment_method || ''}`.trim(),
        debit: 0, credit: Number(pmt.amount), balance: 0,
      });
    }
    for (const cn of cnResult.rows) {
      transactions.push({
        date: cn.issue_date, type: 'Credit Note', reference: cn.credit_note_number,
        description: cn.reason || `Credit note ${cn.credit_note_number}`,
        debit: 0, credit: Number(cn.total_amount), balance: 0,
      });
    }

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = Number(customer.opening_balance);
    for (const txn of transactions) {
      runningBalance += txn.debit - txn.credit;
      txn.balance = runningBalance;
    }

    /* Aging (based on open invoices) */
    const aging = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
    for (const inv of invResult.rows) {
      if (inv.status === 'paid') continue;
      const outstanding = Number(inv.balance_due || 0);
      if (outstanding <= 0) continue;
      const bucket = agingBucket(inv.due_date);
      (aging as any)[bucket] += outstanding;
      aging.total += outstanding;
    }

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id, code: customer.customer_code, name: customer.company_name,
          contactPerson: customer.contact_person, email: customer.email, phone: customer.phone,
          address: customer.billing_address || '',
        },
        openingBalance: Number(customer.opening_balance),
        closingBalance: runningBalance,
        transactions,
        aging,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating customer statement:', error);
    res.status(500).json({ success: false, message: 'Failed to generate customer statement', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─────────── SUPPLIER STATEMENTS ─────────── */

/* GET /purchase/suppliers/statements — list all suppliers with balance summary */
export const listSupplierStatements = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT
         s.supplier_id AS id,
         s.supplier_code,
         s.company_name,
         s.contact_person,
         s.email,
         COALESCE(s.opening_balance, 0) AS opening_balance,
         COALESCE(inv.total_invoiced, 0) AS total_invoiced,
         COALESCE(inv.total_paid, 0) AS total_paid,
         COALESCE(s.opening_balance, 0) + COALESCE(inv.total_invoiced, 0) - COALESCE(inv.total_paid, 0) AS balance
       FROM purchase.suppliers s
       LEFT JOIN LATERAL (
         SELECT SUM(total_amount) AS total_invoiced, SUM(amount_paid) AS total_paid
         FROM purchase.vendor_invoices WHERE supplier_id = s.supplier_id AND tenant_id = $1
       ) inv ON TRUE
       WHERE s.tenant_id = $1
       ORDER BY s.company_name`,
      [ctx.tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing supplier statements:', error);
    res.status(500).json({ success: false, message: 'Failed to list supplier statements', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* GET /purchase/suppliers/:id/statement — full statement for one supplier */
export const getSupplierStatement = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const supplierId = req.params.id;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    /* Supplier details */
    const supResult = await query(
      `SELECT supplier_id AS id, supplier_code, company_name, contact_person, email, phone,
              billing_address,
              COALESCE(opening_balance, 0) AS opening_balance
       FROM purchase.suppliers WHERE supplier_id = $1 AND tenant_id = $2`,
      [supplierId, ctx.tenantId]
    );
    if (supResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    const supplier = supResult.rows[0];

    /* Invoices */
    const invResult = await query(
      `SELECT invoice_id AS id, invoice_number, invoice_date, due_date, total_amount, amount_paid, amount_outstanding, status, notes
       FROM purchase.vendor_invoices
       WHERE supplier_id = $1 AND tenant_id = $2
       ${dateFrom && dateTo ? 'AND invoice_date BETWEEN $3 AND $4' : ''}
       ORDER BY invoice_date ASC`,
      dateFrom && dateTo ? [supplierId, ctx.tenantId, dateFrom, dateTo] : [supplierId, ctx.tenantId]
    );

    /* Payments */
    const pmtResult = await query(
      `SELECT payment_id AS id, payment_number, payment_date, amount, status, notes
       FROM purchase.vendor_payments
       WHERE supplier_id = $1 AND tenant_id = $2
       ${dateFrom && dateTo ? 'AND payment_date BETWEEN $3 AND $4' : ''}
       ORDER BY payment_date ASC`,
      dateFrom && dateTo ? [supplierId, ctx.tenantId, dateFrom, dateTo] : [supplierId, ctx.tenantId]
    );

    /* Merge into chronological transaction list with running balance */
    type TxnLine = { date: string; type: string; reference: string; description: string; debit: number; credit: number; balance: number };
    const transactions: TxnLine[] = [];

    for (const inv of invResult.rows) {
      transactions.push({
        date: inv.invoice_date, type: 'Invoice', reference: inv.invoice_number,
        description: inv.notes || `Invoice ${inv.invoice_number}`,
        debit: Number(inv.total_amount), credit: 0, balance: 0,
      });
    }
    for (const pmt of pmtResult.rows) {
      transactions.push({
        date: pmt.payment_date, type: 'Payment', reference: pmt.payment_number,
        description: pmt.notes || `Payment ${pmt.payment_number}`,
        debit: 0, credit: Number(pmt.amount), balance: 0,
      });
    }

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = Number(supplier.opening_balance);
    for (const txn of transactions) {
      runningBalance += txn.debit - txn.credit;
      txn.balance = runningBalance;
    }

    /* Aging (based on open invoices) */
    const aging = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
    for (const inv of invResult.rows) {
      if (inv.status === 'paid') continue;
      const outstanding = Number(inv.amount_outstanding || 0);
      if (outstanding <= 0) continue;
      const bucket = agingBucket(inv.due_date);
      (aging as any)[bucket] += outstanding;
      aging.total += outstanding;
    }

    res.json({
      success: true,
      data: {
        supplier: {
          id: supplier.id, code: supplier.supplier_code, name: supplier.company_name,
          contactPerson: supplier.contact_person, email: supplier.email, phone: supplier.phone,
          address: supplier.billing_address || '',
        },
        openingBalance: Number(supplier.opening_balance),
        closingBalance: runningBalance,
        transactions,
        aging,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating supplier statement:', error);
    res.status(500).json({ success: false, message: 'Failed to generate supplier statement', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
