/**
 * Take-on Balances Controller (V2)
 * Handles opening balance entry for GL accounts, customers, suppliers,
 * bank accounts during ERP migration.
 *
 * Real DB tables:
 *   - chart_of_accounts (public) — PK: account_id (generated alias: id)
 *   - sales.customers — PK: customer_id
 *   - purchase.suppliers — PK: supplier_id
 *   - cash_bank_accounts (public) — PK: account_id
 */
import { Response } from 'express';
import { TenantRequest } from '../types';
import { query, pool } from '../config/database';

interface TenantCtx {
  tenantId: string;
  userId?: string;
  entityId?: string;
}

function getTenantContext(req: TenantRequest): TenantCtx {
  if (!req.tenant) throw new Error('Tenant context not available');
  return {
    tenantId: req.tenant.id,
    userId: req.user?.id,
    entityId: req.entity?.id || (req as any).entityId,
  };
}

/* ─── GET /take-on-balances/summary ─── */
export const getSummary = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);

    const glResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE opening_balance IS NOT NULL AND opening_balance != 0) AS accounts_with_balance,
         COUNT(*) AS total_accounts,
         COALESCE(SUM(CASE WHEN account_type IN ('ASSET','EXPENSE') THEN opening_balance ELSE 0 END), 0) AS total_debits,
         COALESCE(SUM(CASE WHEN account_type IN ('LIABILITY','EQUITY','REVENUE') THEN opening_balance ELSE 0 END), 0) AS total_credits
       FROM chart_of_accounts
       WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const custResult = await query(
      `SELECT COUNT(*) FILTER (WHERE opening_balance IS NOT NULL AND opening_balance != 0) AS with_balance,
              COUNT(*) AS total,
              COALESCE(SUM(opening_balance), 0) AS total_balance
       FROM sales.customers WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const vendResult = await query(
      `SELECT COUNT(*) FILTER (WHERE opening_balance IS NOT NULL AND opening_balance != 0) AS with_balance,
              COUNT(*) AS total,
              COALESCE(SUM(opening_balance), 0) AS total_balance
       FROM purchase.suppliers WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const bankResult = await query(
      `SELECT COUNT(*) FILTER (WHERE opening_balance IS NOT NULL AND opening_balance != 0) AS with_balance,
              COUNT(*) AS total,
              COALESCE(SUM(opening_balance), 0) AS total_balance
       FROM cash_bank_accounts WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const gl = glResult.rows[0];
    const isBalanced = Math.abs(Number(gl.total_debits) - Number(gl.total_credits)) < 0.01;

    res.json({
      success: true,
      data: {
        gl: {
          accountsWithBalance: Number(gl.accounts_with_balance),
          totalAccounts: Number(gl.total_accounts),
          totalDebits: Number(gl.total_debits),
          totalCredits: Number(gl.total_credits),
          isBalanced,
          difference: Number(gl.total_debits) - Number(gl.total_credits),
        },
        customers: {
          withBalance: Number(custResult.rows[0].with_balance),
          total: Number(custResult.rows[0].total),
          totalBalance: Number(custResult.rows[0].total_balance),
        },
        suppliers: {
          withBalance: Number(vendResult.rows[0].with_balance),
          total: Number(vendResult.rows[0].total),
          totalBalance: Number(vendResult.rows[0].total_balance),
        },
        bankAccounts: {
          withBalance: Number(bankResult.rows[0].with_balance),
          total: Number(bankResult.rows[0].total),
          totalBalance: Number(bankResult.rows[0].total_balance),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching take-on summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch take-on balances summary', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── GET /take-on-balances/gl ─── */
export const getGLBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT id, account_code, account_name, account_type,
              COALESCE(opening_balance, 0) AS opening_balance, is_active
       FROM chart_of_accounts
       WHERE tenant_id = $1
       ORDER BY account_code ASC`,
      [ctx.tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching GL balances:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch GL balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── POST /take-on-balances/gl ─── */
export const saveGLBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { balances } = req.body;
    if (!Array.isArray(balances) || balances.length === 0) {
      return res.status(400).json({ success: false, message: 'balances array is required' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updated = 0;
      for (const item of balances) {
        if (!item.id || item.opening_balance === undefined) continue;
        const amount = Number(item.opening_balance);
        if (isNaN(amount)) continue;
        await client.query(
          `UPDATE chart_of_accounts SET opening_balance = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
          [amount, item.id, ctx.tenantId]
        );
        updated++;
      }
      await client.query('COMMIT');
      res.json({ success: true, message: `Updated ${updated} GL opening balances`, data: { updated } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving GL balances:', error);
    res.status(500).json({ success: false, message: 'Failed to save GL balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── GET /take-on-balances/customers ─── */
export const getCustomerBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT customer_id AS id, customer_code, company_name, contact_person, email,
              COALESCE(opening_balance, 0) AS opening_balance, status
       FROM sales.customers
       WHERE tenant_id = $1
       ORDER BY company_name ASC`,
      [ctx.tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching customer balances:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── POST /take-on-balances/customers ─── */
export const saveCustomerBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { balances } = req.body;
    if (!Array.isArray(balances) || balances.length === 0) {
      return res.status(400).json({ success: false, message: 'balances array is required' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updated = 0;
      for (const item of balances) {
        if (!item.id || item.opening_balance === undefined) continue;
        const amount = Number(item.opening_balance);
        if (isNaN(amount)) continue;
        await client.query(
          `UPDATE sales.customers SET opening_balance = $1, updated_at = NOW() WHERE customer_id = $2 AND tenant_id = $3`,
          [amount, item.id, ctx.tenantId]
        );
        updated++;
      }
      await client.query('COMMIT');
      res.json({ success: true, message: `Updated ${updated} customer opening balances`, data: { updated } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving customer balances:', error);
    res.status(500).json({ success: false, message: 'Failed to save customer balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── GET /take-on-balances/suppliers ─── */
export const getSupplierBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT supplier_id AS id, supplier_code, company_name, contact_person, email,
              COALESCE(opening_balance, 0) AS opening_balance, status
       FROM purchase.suppliers
       WHERE tenant_id = $1
       ORDER BY company_name ASC`,
      [ctx.tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching supplier balances:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch supplier balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── POST /take-on-balances/suppliers ─── */
export const saveSupplierBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { balances } = req.body;
    if (!Array.isArray(balances) || balances.length === 0) {
      return res.status(400).json({ success: false, message: 'balances array is required' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updated = 0;
      for (const item of balances) {
        if (!item.id || item.opening_balance === undefined) continue;
        const amount = Number(item.opening_balance);
        if (isNaN(amount)) continue;
        await client.query(
          `UPDATE purchase.suppliers SET opening_balance = $1, updated_at = NOW() WHERE supplier_id = $2 AND tenant_id = $3`,
          [amount, item.id, ctx.tenantId]
        );
        updated++;
      }
      await client.query('COMMIT');
      res.json({ success: true, message: `Updated ${updated} supplier opening balances`, data: { updated } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving supplier balances:', error);
    res.status(500).json({ success: false, message: 'Failed to save supplier balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── GET /take-on-balances/bank-accounts ─── */
export const getBankBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT cba.account_id AS id, cba.account_name, cb.bank_name, cba.account_number, cba.account_type,
              COALESCE(cba.opening_balance, 0) AS opening_balance,
              cba.currency, cba.is_active
       FROM cash_bank_accounts cba
       LEFT JOIN cash_banks cb ON cba.bank_id = cb.bank_id
       WHERE cba.tenant_id = $1
       ORDER BY cba.account_name ASC`,
      [ctx.tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching bank balances:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bank balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── POST /take-on-balances/bank-accounts ─── */
export const saveBankBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { balances } = req.body;
    if (!Array.isArray(balances) || balances.length === 0) {
      return res.status(400).json({ success: false, message: 'balances array is required' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updated = 0;
      for (const item of balances) {
        if (!item.id || item.opening_balance === undefined) continue;
        const amount = Number(item.opening_balance);
        if (isNaN(amount)) continue;
        await client.query(
          `UPDATE cash_bank_accounts SET opening_balance = $1, updated_at = NOW()
           WHERE account_id = $2 AND tenant_id = $3`,
          [amount, item.id, ctx.tenantId]
        );
        updated++;
      }
      await client.query('COMMIT');
      res.json({ success: true, message: `Updated ${updated} bank opening balances`, data: { updated } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving bank balances:', error);
    res.status(500).json({ success: false, message: 'Failed to save bank balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── POST /take-on-balances/validate ─── */
export const validateBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const glResult = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN account_type IN ('ASSET','EXPENSE') THEN opening_balance ELSE 0 END), 0) AS total_debits,
         COALESCE(SUM(CASE WHEN account_type IN ('LIABILITY','EQUITY','REVENUE') THEN opening_balance ELSE 0 END), 0) AS total_credits
       FROM chart_of_accounts
       WHERE tenant_id = $1 AND opening_balance IS NOT NULL AND opening_balance != 0`,
      [ctx.tenantId]
    );

    const debits = Number(glResult.rows[0].total_debits);
    const credits = Number(glResult.rows[0].total_credits);
    const difference = debits - credits;
    const isBalanced = Math.abs(difference) < 0.01;

    const arResult = await query(`SELECT COALESCE(SUM(opening_balance), 0) AS total FROM sales.customers WHERE tenant_id = $1`, [ctx.tenantId]);
    const apResult = await query(`SELECT COALESCE(SUM(opening_balance), 0) AS total FROM purchase.suppliers WHERE tenant_id = $1`, [ctx.tenantId]);

    const warnings: string[] = [];
    if (!isBalanced) warnings.push(`GL trial balance is out by R ${Math.abs(difference).toFixed(2)}.`);
    if (debits === 0 && credits === 0) warnings.push('No GL opening balances have been entered yet.');

    res.json({
      success: true,
      data: {
        isBalanced, totalDebits: debits, totalCredits: credits, difference,
        customerTotal: Number(arResult.rows[0].total),
        supplierTotal: Number(apResult.rows[0].total),
        warnings,
        canFinalize: isBalanced && (debits !== 0 || credits !== 0),
      },
    });
  } catch (error) {
    console.error('Error validating balances:', error);
    res.status(500).json({ success: false, message: 'Failed to validate balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/* ─── POST /take-on-balances/finalize ─── */
export const finalizeBalances = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { effective_date } = req.body;
    const balanceDate = effective_date || new Date().toISOString().slice(0, 10);

    const glResult = await query(
      `SELECT id, account_code, account_name, account_type, opening_balance
       FROM chart_of_accounts
       WHERE tenant_id = $1 AND opening_balance IS NOT NULL AND opening_balance != 0
       ORDER BY account_code`,
      [ctx.tenantId]
    );

    if (glResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No opening balances to finalize' });
    }

    const totalDebits = glResult.rows.filter((a: any) => ['ASSET', 'EXPENSE'].includes(a.account_type)).reduce((s: number, a: any) => s + Math.abs(Number(a.opening_balance)), 0);
    const totalCredits = glResult.rows.filter((a: any) => ['LIABILITY', 'EQUITY', 'REVENUE'].includes(a.account_type)).reduce((s: number, a: any) => s + Math.abs(Number(a.opening_balance)), 0);

    if (Math.abs(totalDebits - totalCredits) >= 0.01) {
      return res.status(400).json({ success: false, message: `Trial balance is out by R ${Math.abs(totalDebits - totalCredits).toFixed(2)}.` });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const jeResult = await client.query(
        `INSERT INTO journal_entries (tenant_id, journal_number, entry_number, description, journal_date, status, source, total_debit, total_credit, created_by, created_at)
         VALUES ($1, $2, $2, $3, $4, 'POSTED', 'TAKE_ON', $5, $5, $6, NOW()) RETURNING id`,
        [ctx.tenantId, `OB-${Date.now()}`, 'Opening Balances — Take-on', balanceDate, totalDebits, ctx.userId]
      );
      const journalId = jeResult.rows[0].id;
      let lineNum = 1;
      for (const account of glResult.rows) {
        const amount = Math.abs(Number(account.opening_balance));
        const isDebit = ['ASSET', 'EXPENSE'].includes(account.account_type);
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, tenant_id, line_number, account_id, account_code, description, debit_amount, credit_amount, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [journalId, ctx.tenantId, lineNum++, account.id, account.account_code, `Opening balance — ${account.account_name}`, isDebit ? amount : 0, isDebit ? 0 : amount]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({
        success: true,
        message: `Opening balance journal entry posted with ${glResult.rows.length} lines`,
        data: { journalEntryId: journalId, lineCount: glResult.rows.length, totalDebits, totalCredits, effectiveDate: balanceDate },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error finalizing balances:', error);
    res.status(500).json({ success: false, message: 'Failed to finalize balances', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
