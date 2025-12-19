/**
 * FINANCIAL CONTROLLER (Repository Pattern)
 *
 * Repository-backed, tenant-aware endpoints for core financial flows.
 * Legacy endpoints remain available via the previous controller for unported actions.
 */

import { Response } from 'express';
import { query } from '../../../config/database';
import { TenantRequest } from '../../../types';
import { TenantContext } from '../../../repositories/BaseRepository';
import {
  journalEntryRepository,
  accountRepository
} from '../../../repositories/financial';
import { COA_TEMPLATES } from '../templates/coa-templates';

function getTenantContext(req: TenantRequest): TenantContext {
  if (!req.tenant) throw new Error('Tenant context not available');
  return { tenantId: req.tenant.id, userId: req.user?.id };
}

// ==========================================================================
// JOURNAL ENTRIES
// ==========================================================================

export const createJournalEntry = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { lines = [], ...entry } = req.body || {};

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one journal line is required' });
    }

    const created = await journalEntryRepository.createEntry(ctx, entry, lines);
    res.status(201).json({ success: true, data: created, message: 'Journal entry created successfully' });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ success: false, message: 'Failed to create journal entry', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const listJournalEntries = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { status, from_date, to_date, page, limit } = req.query;

    // If date filters present, use range helper
    if (from_date || to_date) {
      const start = from_date ? new Date(from_date as string) : new Date('1970-01-01');
      const end = to_date ? new Date(to_date as string) : new Date();
      const result = await journalEntryRepository.getEntriesByDateRange(
        ctx,
        start,
        end,
        status as any,
        { page: Number(page) || 1, limit: Number(limit) || 50 }
      );
      return res.json({ success: true, data: result.data, pagination: result.pagination });
    }

    const result = await journalEntryRepository.findAll(
      ctx,
      status ? { status } : {},
      { page: Number(page) || 1, limit: Number(limit) || 50, sortBy: 'posting_date', sortOrder: 'DESC' }
    );

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    console.error('Error listing journal entries:', error);
    res.status(500).json({ success: false, message: 'Failed to list journal entries', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getJournalEntry = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const entry = await journalEntryRepository.getEntryWithLines(ctx, id);
    if (!entry) return res.status(404).json({ success: false, message: 'Journal entry not found' });
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch journal entry', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const postJournalEntry = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const updated = await journalEntryRepository.postEntry(ctx, id);
    if (!updated) return res.status(404).json({ success: false, message: 'Journal entry not found' });
    res.json({ success: true, data: updated, message: 'Journal entry posted' });
  } catch (error) {
    console.error('Error posting journal entry:', error);
    res.status(400).json({ success: false, message: 'Failed to post journal entry', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const reverseJournalEntry = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { reversal_date } = req.body || {};
    const reversal = await journalEntryRepository.reverseEntry(ctx, id, reversal_date ? new Date(reversal_date) : new Date());
    res.json({ success: true, data: reversal, message: 'Journal entry reversed' });
  } catch (error) {
    console.error('Error reversing journal entry:', error);
    res.status(400).json({ success: false, message: 'Failed to reverse journal entry', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ==========================================================================
// CHART OF ACCOUNTS
// ==========================================================================

export const getChartOfAccounts = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const accounts = await accountRepository.getChartOfAccounts(ctx);
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chart of accounts', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getAccount = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { code } = req.params;
    const account = await accountRepository.findOne(ctx, { account_number: code });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch account', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ==========================================================================
// REPORTS
// ==========================================================================

export const getTrialBalance = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const asOf = req.query.as_of ? new Date(req.query.as_of as string) : new Date();
    const tb = await accountRepository.getTrialBalance(ctx, asOf);
    res.json({ success: true, data: tb, as_of: asOf });
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trial balance', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getAccountLedger = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { code } = req.params;
    const start = req.query.start_date ? new Date(req.query.start_date as string) : new Date('1970-01-01');
    const end = req.query.end_date ? new Date(req.query.end_date as string) : new Date();

    const account = await accountRepository.findOne(ctx, { account_number: code });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const ledger = await journalEntryRepository.getAccountLedger(ctx, account.id, start, end);
    res.json({ success: true, data: ledger, account });
  } catch (error) {
    console.error('Error fetching account ledger:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch account ledger', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ==========================================================================
// COA TEMPLATES
// ==========================================================================

export const getCOATemplates = async (_req: TenantRequest, res: Response) => {
  try {
    res.json({ success: true, data: COA_TEMPLATES });
  } catch (error) {
    console.error('Error fetching COA templates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
};

export const applyCOATemplate = async (req: TenantRequest, res: Response) => {
  const client = await accountRepository.beginTransaction();
  try {
    const ctx = getTenantContext(req);
    const { templateId } = req.params;
    const template = COA_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Prevent template apply if posted entries exist for tenant
    const postedResult = await client.query(
      `SELECT COUNT(*) AS count FROM journal_entries WHERE tenant_id = $1 AND status = 'posted'`,
      [ctx.tenantId]
    );
    const postedCount = parseInt(postedResult.rows[0]?.count || '0', 10);
    if (postedCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot apply template: ${postedCount} posted journal entries exist for this tenant.`,
        posted_entries: postedCount,
      });
    }

    // Clear existing accounts for tenant
    await client.query('DELETE FROM financial.accounts WHERE tenant_id = $1', [ctx.tenantId]);

    const parentMap = new Map<string, string>();
    let insertedCount = 0;

    for (const account of template.accounts) {
      const parentId = account.parent_code ? parentMap.get(account.parent_code) || null : null;

      const insertResult = await client.query(
        `INSERT INTO financial.accounts
         (tenant_id, account_number, name, account_type, parent_id, is_header, is_active, is_system, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
         RETURNING id`,
        [
          ctx.tenantId,
          account.code,
          account.name,
          account.account_type.toLowerCase(),
          parentId,
          account.is_header || false,
          account.is_active !== false,
          ctx.userId || null,
        ]
      );

      parentMap.set(account.code, insertResult.rows[0].id);
      insertedCount += 1;
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Template "${template.name}" applied successfully`,
      data: { template_id: templateId, template_name: template.name, accounts_created: insertedCount },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying COA template:', error);
    res.status(500).json({ success: false, message: 'Failed to apply template', error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    client.release();
  }
};

// ==========================================================================
// GENERAL LEDGER & REPORTS
// ==========================================================================

export const getGeneralLedger = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { from_date, to_date, account_code, limit = 100, offset = 0 } = req.query;

    const conditions = ["je.tenant_id = $1", "je.status = 'posted'"];
    const params: any[] = [ctx.tenantId];
    let idx = 2;

    if (from_date) {
      conditions.push(`je.entry_date >= $${idx}`);
      params.push(from_date);
      idx += 1;
    }

    if (to_date) {
      conditions.push(`je.entry_date <= $${idx}`);
      params.push(to_date);
      idx += 1;
    }

    if (account_code) {
      conditions.push(`coa.account_number = $${idx}`);
      params.push(account_code);
      idx += 1;
    }

    const ledgerQuery = `
      SELECT 
        je.entry_date AS transaction_date,
        je.entry_number AS document_number,
        je.description AS entry_description,
        coa.account_number,
        coa.name AS account_name,
        jel.debit_amount,
        jel.credit_amount,
        jel.description AS line_description
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.entry_id = jel.journal_entry_id
      INNER JOIN financial.accounts coa ON jel.account_id = coa.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY je.entry_date DESC, je.entry_number, jel.line_number
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    params.push(Number(limit), Number(offset));
    const result = await query(ledgerQuery, params);

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error fetching general ledger:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch general ledger', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getAccountLedgerByCode = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { accountCode } = req.params;
    const { from_date, to_date, limit = 100, offset = 0 } = req.query;

    const conditions = ["je.tenant_id = $1", "je.status = 'posted'", 'coa.account_number = $2'];
    const params: any[] = [ctx.tenantId, accountCode];
    let idx = 3;

    if (from_date) {
      conditions.push(`je.entry_date >= $${idx}`);
      params.push(from_date);
      idx += 1;
    }

    if (to_date) {
      conditions.push(`je.entry_date <= $${idx}`);
      params.push(to_date);
      idx += 1;
    }

    const ledgerQuery = `
      SELECT 
        je.entry_date AS transaction_date,
        je.entry_number AS document_number,
        je.description AS entry_description,
        jel.description AS line_description,
        jel.debit_amount,
        jel.credit_amount,
        SUM(jel.debit_amount - jel.credit_amount) OVER (
          ORDER BY je.entry_date, je.entry_number, jel.line_number
        ) AS running_balance
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.entry_id = jel.journal_entry_id
      INNER JOIN financial.accounts coa ON jel.account_id = coa.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY je.entry_date, je.entry_number, jel.line_number
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    params.push(Number(limit), Number(offset));
    const result = await query(ledgerQuery, params);

    res.json({ success: true, account_code: accountCode, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error fetching account ledger by code:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch account ledger', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getFiscalYears = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const fiscalQuery = `
      SELECT DISTINCT 
        EXTRACT(YEAR FROM entry_date)::INTEGER AS fiscal_year,
        MIN(entry_date) AS start_date,
        MAX(entry_date) AS end_date,
        COUNT(*) AS entry_count,
        CASE WHEN EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN true ELSE false END AS is_current
      FROM journal_entries
      WHERE tenant_id = $1 AND status = 'posted'
      GROUP BY EXTRACT(YEAR FROM entry_date)
      ORDER BY fiscal_year DESC
    `;

    const result = await query(fiscalQuery, [ctx.tenantId]);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error fetching fiscal years:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fiscal years', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getFiscalPeriods = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { year } = req.query;

    const params: any[] = [ctx.tenantId];
    let idx = 2;
    let periodQuery = `
      SELECT 
        EXTRACT(YEAR FROM entry_date)::INTEGER AS fiscal_year,
        EXTRACT(MONTH FROM entry_date)::INTEGER AS period_number,
        TO_CHAR(entry_date, 'Month YYYY') AS period_name,
        MIN(entry_date) AS start_date,
        MAX(entry_date) AS end_date,
        COUNT(*) AS entry_count,
        'OPEN' AS status
      FROM journal_entries
      WHERE tenant_id = $1 AND status = 'posted'
    `;

    if (year) {
      periodQuery += ` AND EXTRACT(YEAR FROM entry_date) = $${idx}`;
      params.push(year);
      idx += 1;
    }

    periodQuery += `
      GROUP BY 
        EXTRACT(YEAR FROM entry_date),
        EXTRACT(MONTH FROM entry_date),
        TO_CHAR(entry_date, 'Month YYYY')
      ORDER BY fiscal_year DESC, period_number DESC
    `;

    const result = await query(periodQuery, params);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error fetching fiscal periods:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fiscal periods', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getCashFlowStatement = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate and toDate parameters are required' });
    }

    const operatingQuery = `
      SELECT 
        coa.name AS account_name,
        SUM(jel.debit_amount) AS debit_amount,
        SUM(jel.credit_amount) AS credit_amount,
        SUM(jel.credit_amount - jel.debit_amount) AS net_amount
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.entry_id = jel.journal_entry_id
      INNER JOIN financial.accounts coa ON jel.account_id = coa.id
      WHERE je.tenant_id = $1
        AND je.status = 'posted'
        AND je.entry_date BETWEEN $2 AND $3
        AND UPPER(coa.account_type) IN ('REVENUE', 'EXPENSE')
      GROUP BY coa.name
      ORDER BY coa.name
    `;

    const investingQuery = `
      SELECT 
        coa.name AS account_name,
        SUM(jel.debit_amount) AS debit_amount,
        SUM(jel.credit_amount) AS credit_amount,
        SUM(jel.debit_amount - jel.credit_amount) AS net_amount
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.entry_id = jel.journal_entry_id
      INNER JOIN financial.accounts coa ON jel.account_id = coa.id
      WHERE je.tenant_id = $1
        AND je.status = 'posted'
        AND je.entry_date BETWEEN $2 AND $3
        AND UPPER(coa.account_type) = 'ASSET'
        AND coa.account_number NOT LIKE '1000%'
      GROUP BY coa.name
      ORDER BY coa.name
    `;

    const financingQuery = `
      SELECT 
        coa.name AS account_name,
        SUM(jel.debit_amount) AS debit_amount,
        SUM(jel.credit_amount) AS credit_amount,
        SUM(jel.credit_amount - jel.debit_amount) AS net_amount
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.entry_id = jel.journal_entry_id
      INNER JOIN financial.accounts coa ON jel.account_id = coa.id
      WHERE je.tenant_id = $1
        AND je.status = 'posted'
        AND je.entry_date BETWEEN $2 AND $3
        AND UPPER(coa.account_type) IN ('LIABILITY', 'EQUITY')
      GROUP BY coa.name
      ORDER BY coa.name
    `;

    const [operatingResult, investingResult, financingResult] = await Promise.all([
      query(operatingQuery, [ctx.tenantId, fromDate, toDate]),
      query(investingQuery, [ctx.tenantId, fromDate, toDate]),
      query(financingQuery, [ctx.tenantId, fromDate, toDate])
    ]);

    const operatingTotal = operatingResult.rows.reduce((sum, row) => sum + parseFloat(row.net_amount || 0), 0);
    const investingTotal = investingResult.rows.reduce((sum, row) => sum + parseFloat(row.net_amount || 0), 0);
    const financingTotal = financingResult.rows.reduce((sum, row) => sum + parseFloat(row.net_amount || 0), 0);

    res.json({
      success: true,
      data: {
        operating_activities: operatingResult.rows,
        investing_activities: investingResult.rows,
        financing_activities: financingResult.rows,
        totals: {
          operating: operatingTotal,
          investing: investingTotal,
          financing: financingTotal,
          net_cash_flow: operatingTotal + investingTotal + financingTotal
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cash flow statement:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cash flow statement', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getIncomeStatement = async (_req: TenantRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        revenue: 0,
        cost_of_sales: 0,
        gross_profit: 0,
        expenses: 0,
        net_income: 0,
        details: [],
        message: 'Income statement endpoint ready - requires ledger data setup'
      },
    });
  } catch (error) {
    console.error('Error fetching income statement:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch income statement', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ==========================================================================
// TAX SETTINGS
// ==========================================================================

export const getTaxSettings = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT id, tax_code, tax_name, tax_rate, tax_type, is_default, is_active, created_at
       FROM financial.tax_settings
       WHERE tenant_id = $1 AND (is_active = true OR is_active IS NULL)
       ORDER BY tax_code`,
      [ctx.tenantId]
    );

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error fetching tax settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tax settings', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createTaxSetting = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { tax_code, tax_name, tax_rate, tax_type, is_default } = req.body;

    const result = await query(
      `INSERT INTO financial.tax_settings (tenant_id, tax_code, tax_name, tax_rate, tax_type, is_default, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING id, tax_code, tax_name, tax_rate`,
      [ctx.tenantId, tax_code, tax_name, tax_rate, tax_type, is_default || false, ctx.userId || null]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Tax setting created successfully' });
  } catch (error) {
    console.error('Error creating tax setting:', error);
    res.status(400).json({ success: false, message: 'Failed to create tax setting', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateTaxSetting = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { tax_code, tax_name, tax_rate, tax_type, is_default, is_active } = req.body;

    const result = await query(
      `UPDATE financial.tax_settings
       SET 
        tax_code = COALESCE($3, tax_code),
        tax_name = COALESCE($4, tax_name),
        tax_rate = COALESCE($5, tax_rate),
        tax_type = COALESCE($6, tax_type),
        is_default = COALESCE($7, is_default),
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $9
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, tax_code, tax_name, tax_rate`,
      [id, ctx.tenantId, tax_code, tax_name, tax_rate, tax_type, is_default, is_active, ctx.userId || null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Tax setting not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Tax setting updated successfully' });
  } catch (error) {
    console.error('Error updating tax setting:', error);
    res.status(400).json({ success: false, message: 'Failed to update tax setting', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ==========================================================================
// DIMENSIONS
// ==========================================================================

export const getDimensions = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT id, dimension_code, dimension_name, dimension_type, parent_dimension_id, is_active, created_at
       FROM financial.dimensions
       WHERE tenant_id = $1 AND (is_active = true OR is_active IS NULL)
       ORDER BY dimension_type, dimension_code`,
      [ctx.tenantId]
    );

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error fetching dimensions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dimensions', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createDimension = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { dimension_code, dimension_name, dimension_type, parent_dimension_id } = req.body;

    const result = await query(
      `INSERT INTO financial.dimensions (tenant_id, dimension_code, dimension_name, dimension_type, parent_dimension_id, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, dimension_code, dimension_name, dimension_type`,
      [ctx.tenantId, dimension_code, dimension_name, dimension_type, parent_dimension_id || null, ctx.userId || null]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Dimension created successfully' });
  } catch (error) {
    console.error('Error creating dimension:', error);
    res.status(400).json({ success: false, message: 'Failed to create dimension', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateDimension = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { dimension_code, dimension_name, dimension_type, parent_dimension_id, is_active } = req.body;

    const result = await query(
      `UPDATE financial.dimensions
       SET 
        dimension_code = COALESCE($3, dimension_code),
        dimension_name = COALESCE($4, dimension_name),
        dimension_type = COALESCE($5, dimension_type),
        parent_dimension_id = COALESCE($6, parent_dimension_id),
        is_active = COALESCE($7, is_active),
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $8
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, dimension_code, dimension_name, dimension_type`,
      [id, ctx.tenantId, dimension_code, dimension_name, dimension_type, parent_dimension_id, is_active, ctx.userId || null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Dimension not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Dimension updated successfully' });
  } catch (error) {
    console.error('Error updating dimension:', error);
    res.status(400).json({ success: false, message: 'Failed to update dimension', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ==========================================================================
// DASHBOARD
// ==========================================================================

export const getDashboard = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);

    // Basic aggregates to provide non-static dashboard values
    const cashResult = await query(
      `SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) AS cash_balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.entry_id = jel.journal_entry_id
       JOIN financial.accounts a ON a.id = jel.account_id
       WHERE je.tenant_id = $1 AND je.status = 'posted' AND UPPER(a.account_type) = 'ASSET'
         AND (a.account_number LIKE '1%' OR a.account_number LIKE '10%')`,
      [ctx.tenantId]
    );

    const receivableResult = await query(
      `SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) AS ar_balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.entry_id = jel.journal_entry_id
       JOIN financial.accounts a ON a.id = jel.account_id
       WHERE je.tenant_id = $1 AND je.status = 'posted' AND UPPER(a.account_type) = 'ASSET' AND a.account_number LIKE '12%'`,
      [ctx.tenantId]
    );

    const payableResult = await query(
      `SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) AS ap_balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.entry_id = jel.journal_entry_id
       JOIN financial.accounts a ON a.id = jel.account_id
       WHERE je.tenant_id = $1 AND je.status = 'posted' AND UPPER(a.account_type) = 'LIABILITY' AND a.account_number LIKE '21%'`,
      [ctx.tenantId]
    );

    const stats = {
      current_cash_balance: parseFloat(cashResult.rows[0]?.cash_balance || 0),
      accounts_receivable: parseFloat(receivableResult.rows[0]?.ar_balance || 0),
      accounts_payable: parseFloat(payableResult.rows[0]?.ap_balance || 0),
      monthly_revenue: 0,
      monthly_expenses: 0,
      net_income: 0,
      unposted_journals: 0,
      pending_approvals: 0,
      recent_transactions: [],
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
