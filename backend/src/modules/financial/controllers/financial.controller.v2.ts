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
  return { tenantId: req.tenant.id, userId: req.user?.id, entityId: req.entity?.id || req.entityId };
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
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    // Build query directly to handle case-insensitive status and COALESCE dates
    const params: any[] = [ctx.tenantId, ctx.entityId || null];
    const conditions: string[] = ['tenant_id = $1', '(entity_id IS NULL OR entity_id = $2)'];
    let paramIndex = 3;

    if (status) {
      conditions.push(`LOWER(status) = LOWER($${paramIndex})`);
      params.push(status);
      paramIndex++;
    }

    if (from_date || to_date) {
      const start = from_date ? from_date as string : '1970-01-01';
      const end = to_date ? to_date as string : '2099-12-31';
      conditions.push(`COALESCE(entry_date, journal_date, posting_date, created_at::date) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(start, end);
      paramIndex += 2;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM journal_entries WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const dataResult = await query(
      `SELECT *, 
        COALESCE(entry_date, journal_date, posting_date, created_at::date) as effective_date
       FROM journal_entries 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
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

export const createAccount = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { account_code, account_name, account_type, parent_id, is_header, normal_balance, description, opening_balance } = req.body;

    if (!account_code || !account_name || !account_type) {
      return res.status(400).json({ success: false, message: 'Account code, name, and type are required' });
    }

    // Check for duplicate account code
    const existing = await query(
      `SELECT 1 FROM chart_of_accounts WHERE tenant_id = $1 AND code = $2 AND (entity_id IS NULL OR entity_id = $3)`,
      [ctx.tenantId, account_code, ctx.entityId || null]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Account code already exists' });
    }

    // Determine level based on parent
    let level = 1;
    let parentCode = null;
    if (parent_id) {
      const parent = await query(
        `SELECT code, level FROM chart_of_accounts WHERE tenant_id = $1 AND id = $2 AND (entity_id IS NULL OR entity_id = $3)`,
        [ctx.tenantId, parent_id, ctx.entityId || null]
      );
      if (parent.rows.length > 0) {
        level = parent.rows[0].level + 1;
        parentCode = parent.rows[0].code;
      }
    }

    // Determine account category based on type
    const accountTypeUpper = account_type.toUpperCase();
    let accountCategory = 'Operating';
    if (accountTypeUpper === 'ASSET') accountCategory = 'Current Assets';
    else if (accountTypeUpper === 'LIABILITY') accountCategory = 'Current Liabilities';
    else if (accountTypeUpper === 'EQUITY') accountCategory = 'Shareholders Equity';
    else if (accountTypeUpper === 'REVENUE') accountCategory = 'Operating Revenue';
    else if (accountTypeUpper === 'EXPENSE') accountCategory = 'Operating Expenses';

    const normalBal = normal_balance || (['ASSET', 'EXPENSE'].includes(accountTypeUpper) ? 'DEBIT' : 'CREDIT');

    // Insert the account
    const result = await query(
      `INSERT INTO chart_of_accounts 
        (tenant_id, code, name, account_type, account_category, parent_code, level, is_header, 
         normal_balance, description, current_debit_balance, current_credit_balance, is_active, created_by,
         account_code, account_name, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, true, $12, $2, $3, $13)
       RETURNING *`,
      [
        ctx.tenantId,
        account_code,
        account_name,
        accountTypeUpper,
        accountCategory,
        parentCode,
        level,
        is_header || false,
        normalBal,
        description || null,
        opening_balance || 0,
        ctx.userId || null,
        ctx.entityId || null
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Account created successfully' });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ success: false, message: 'Failed to create account', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateAccount = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { account_name, description, is_active } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (account_name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(account_name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) { // Only updated_at
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(ctx.tenantId, ctx.entityId || null, id);
    const result = await query(
      `UPDATE chart_of_accounts SET ${updates.join(', ')} 
       WHERE tenant_id = $${paramIndex++} AND (entity_id IS NULL OR entity_id = $${paramIndex++}) AND account_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Account updated successfully' });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ success: false, message: 'Failed to update account', error: error instanceof Error ? error.message : 'Unknown error' });
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
    // Direct SQL trial balance - bypass broken repository
    const result = await query(
      `SELECT 
        coa.code as account_code,
        COALESCE(coa.name, coa.account_name) as account_name,
        coa.account_type,
        COALESCE(SUM(jel.debit_amount), 0) as debit,
        COALESCE(SUM(jel.credit_amount), 0) as credit,
        COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
       FROM chart_of_accounts coa
       LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id AND jel.tenant_id = coa.tenant_id AND (jel.entity_id IS NULL OR jel.entity_id = $2)
       LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2) AND je.status = 'posted'
       WHERE coa.tenant_id = $1 AND (coa.entity_id IS NULL OR coa.entity_id = $2) AND coa.is_header = false AND coa.deleted_at IS NULL
       GROUP BY coa.id, coa.code, coa.name, coa.account_name, coa.account_type
       HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
       ORDER BY coa.code`,
      [ctx.tenantId, ctx.entityId || null]
    );
    res.json({ success: true, data: result.rows });
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
      `SELECT COUNT(*) AS count FROM journal_entries WHERE tenant_id = $1 AND (entity_id IS NULL OR entity_id = $2) AND status = 'posted'`,
      [ctx.tenantId, ctx.entityId || null]
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
    await client.query('DELETE FROM financial.accounts WHERE tenant_id = $1 AND (entity_id IS NULL OR entity_id = $2)', [ctx.tenantId, ctx.entityId || null]);

    const parentMap = new Map<string, string>();
    let insertedCount = 0;

    for (const account of template.accounts) {
      const parentId = account.parent_code ? parentMap.get(account.parent_code) || null : null;

      const insertResult = await client.query(
        `INSERT INTO financial.accounts
         (tenant_id, account_number, name, account_type, parent_id, is_header, is_active, is_system, created_by, entity_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9)
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
          ctx.entityId || null,
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

    const conditions = ["je.tenant_id = $1", "LOWER(je.status) = 'posted'", '(je.entity_id IS NULL OR je.entity_id = $2)'];
    const params: any[] = [ctx.tenantId, ctx.entityId || null];
    let idx = 3;

    if (from_date) {
      conditions.push(`COALESCE(je.journal_date, je.entry_date, je.posting_date) >= $${idx}`);
      params.push(from_date);
      idx += 1;
    }

    if (to_date) {
      conditions.push(`COALESCE(je.journal_date, je.entry_date, je.posting_date) <= $${idx}`);
      params.push(to_date);
      idx += 1;
    }

    if (account_code) {
      conditions.push(`COALESCE(NULLIF(coa.account_code, ''), coa.code) = $${idx}`);
      params.push(account_code);
      idx += 1;
    }

    const ledgerQuery = `
      SELECT 
        COALESCE(je.journal_date, je.entry_date, je.posting_date) AS transaction_date,
        COALESCE(je.entry_number, je.journal_number) AS document_number,
        je.description AS entry_description,
        COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
        COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
        coa.account_type,
        jel.debit_amount,
        jel.credit_amount,
        jel.description AS line_description,
        je.id AS journal_entry_id,
        je.status
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND (jel.entity_id IS NULL OR jel.entity_id = $2)
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(je.journal_date, je.entry_date, je.posting_date) DESC, COALESCE(je.entry_number, je.journal_number), jel.line_number
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

    const conditions = ["je.tenant_id = $1", "LOWER(je.status) = 'posted'", "COALESCE(NULLIF(coa.account_code, ''), coa.code) = $2", '(je.entity_id IS NULL OR je.entity_id = $3)'];
    const params: any[] = [ctx.tenantId, accountCode, ctx.entityId || null];
    let idx = 4;

    if (from_date) {
      conditions.push(`COALESCE(je.journal_date, je.entry_date, je.posting_date) >= $${idx}`);
      params.push(from_date);
      idx += 1;
    }

    if (to_date) {
      conditions.push(`COALESCE(je.journal_date, je.entry_date, je.posting_date) <= $${idx}`);
      params.push(to_date);
      idx += 1;
    }

    const ledgerQuery = `
      SELECT 
        COALESCE(je.journal_date, je.entry_date, je.posting_date) AS transaction_date,
        COALESCE(je.entry_number, je.journal_number) AS document_number,
        je.description AS entry_description,
        jel.description AS line_description,
        jel.debit_amount,
        jel.credit_amount,
        SUM(jel.debit_amount - jel.credit_amount) OVER (
          ORDER BY COALESCE(je.journal_date, je.entry_date, je.posting_date), COALESCE(je.entry_number, je.journal_number), jel.line_number
        ) AS running_balance
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND (jel.entity_id IS NULL OR jel.entity_id = $3)
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND (coa.entity_id IS NULL OR coa.entity_id = $3)
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(je.journal_date, je.entry_date, je.posting_date), COALESCE(je.entry_number, je.journal_number), jel.line_number
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
      WHERE tenant_id = $1 AND (entity_id IS NULL OR entity_id = $2) AND status = 'posted'
      GROUP BY EXTRACT(YEAR FROM entry_date)
      ORDER BY fiscal_year DESC
    `;

    const result = await query(fiscalQuery, [ctx.tenantId, ctx.entityId || null]);
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

    const params: any[] = [ctx.tenantId, ctx.entityId || null];
    let idx = 3;
    let periodQuery = `
      SELECT 
        EXTRACT(YEAR FROM journal_date)::INTEGER AS fiscal_year,
        EXTRACT(MONTH FROM journal_date)::INTEGER AS period_number,
        TO_CHAR(journal_date, 'Month YYYY') AS period_name,
        MIN(journal_date) AS start_date,
        MAX(journal_date) AS end_date,
        COUNT(*) AS entry_count,
        'OPEN' AS status
      FROM journal_entries
      WHERE tenant_id = $1 AND (entity_id IS NULL OR entity_id = $2) AND status = 'posted'
    `;

    if (year) {
      periodQuery += ` AND EXTRACT(YEAR FROM journal_date) = $${idx}`;
      params.push(year);
      idx += 1;
    }

    periodQuery += `
      GROUP BY 
        EXTRACT(YEAR FROM journal_date),
        EXTRACT(MONTH FROM journal_date),
        TO_CHAR(journal_date, 'Month YYYY')
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
        COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
        COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
        SUM(jel.debit_amount) AS debit_amount,
        SUM(jel.credit_amount) AS credit_amount,
        SUM(jel.credit_amount - jel.debit_amount) AS net_amount
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND (jel.entity_id IS NULL OR jel.entity_id = $4)
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND (coa.entity_id IS NULL OR coa.entity_id = $4)
      WHERE je.tenant_id = $1
        AND (je.entity_id IS NULL OR je.entity_id = $4)
        AND LOWER(je.status) = 'posted'
        AND COALESCE(je.journal_date, je.entry_date, je.posting_date) BETWEEN $2 AND $3
        AND LOWER(coa.account_type) IN ('revenue', 'expense')
      GROUP BY coa.name, coa.account_name, coa.code, coa.account_code
      ORDER BY coa.name
    `;

    const investingQuery = `
      SELECT 
        COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
        COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
        SUM(jel.debit_amount) AS debit_amount,
        SUM(jel.credit_amount) AS credit_amount,
        SUM(jel.debit_amount - jel.credit_amount) AS net_amount
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND (jel.entity_id IS NULL OR jel.entity_id = $4)
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND (coa.entity_id IS NULL OR coa.entity_id = $4)
      WHERE je.tenant_id = $1
        AND (je.entity_id IS NULL OR je.entity_id = $4)
        AND LOWER(je.status) = 'posted'
        AND COALESCE(je.journal_date, je.entry_date, je.posting_date) BETWEEN $2 AND $3
        AND LOWER(coa.account_type) = 'asset'
        AND COALESCE(NULLIF(coa.account_code, ''), coa.code) NOT LIKE '1000%'
      GROUP BY coa.name, coa.account_name, coa.code, coa.account_code
      ORDER BY coa.name
    `;

    const financingQuery = `
      SELECT 
        COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
        COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
        SUM(jel.debit_amount) AS debit_amount,
        SUM(jel.credit_amount) AS credit_amount,
        SUM(jel.credit_amount - jel.debit_amount) AS net_amount
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND (jel.entity_id IS NULL OR jel.entity_id = $4)
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND (coa.entity_id IS NULL OR coa.entity_id = $4)
      WHERE je.tenant_id = $1
        AND (je.entity_id IS NULL OR je.entity_id = $4)
        AND LOWER(je.status) = 'posted'
        AND COALESCE(je.journal_date, je.entry_date, je.posting_date) BETWEEN $2 AND $3
        AND LOWER(coa.account_type) IN ('liability', 'equity')
      GROUP BY coa.name, coa.account_name, coa.code, coa.account_code
      ORDER BY coa.name
    `;

    const [operatingResult, investingResult, financingResult] = await Promise.all([
      query(operatingQuery, [ctx.tenantId, fromDate, toDate, ctx.entityId || null]),
      query(investingQuery, [ctx.tenantId, fromDate, toDate, ctx.entityId || null]),
      query(financingQuery, [ctx.tenantId, fromDate, toDate, ctx.entityId || null])
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

export const getIncomeStatement = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const now = new Date();
    const fromDate = req.query.fromDate || req.query.from_date || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const toDate = req.query.toDate || req.query.to_date || now.toISOString().split('T')[0];

    // Get revenue accounts (credits increase revenue)
    const revenueQuery = `
      SELECT 
        COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
        COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
        SUM(jel.credit_amount) AS credits,
        SUM(jel.debit_amount) AS debits,
        SUM(jel.credit_amount - jel.debit_amount) AS balance
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND (jel.entity_id IS NULL OR jel.entity_id = $4)
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND (coa.entity_id IS NULL OR coa.entity_id = $4)
      WHERE je.tenant_id = $1
        AND (je.entity_id IS NULL OR je.entity_id = $4)
        AND LOWER(je.status) = 'posted'
        AND COALESCE(je.journal_date, je.entry_date, je.posting_date) BETWEEN $2 AND $3
        AND LOWER(coa.account_type) = 'revenue'
      GROUP BY coa.code, coa.account_code, coa.name, coa.account_name
      ORDER BY coa.code
    `;

    // Get expense accounts (debits increase expenses)
    const expenseQuery = `
      SELECT 
        COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
        COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
        SUM(jel.debit_amount) AS debits,
        SUM(jel.credit_amount) AS credits,
        SUM(jel.debit_amount - jel.credit_amount) AS balance
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND (jel.entity_id IS NULL OR jel.entity_id = $4)
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND (coa.entity_id IS NULL OR coa.entity_id = $4)
      WHERE je.tenant_id = $1
        AND (je.entity_id IS NULL OR je.entity_id = $4)
        AND LOWER(je.status) = 'posted'
        AND COALESCE(je.journal_date, je.entry_date, je.posting_date) BETWEEN $2 AND $3
        AND LOWER(coa.account_type) = 'expense'
      GROUP BY coa.code, coa.account_code, coa.name, coa.account_name
      ORDER BY coa.code
    `;

    const [revenueResult, expenseResult] = await Promise.all([
      query(revenueQuery, [ctx.tenantId, fromDate, toDate, ctx.entityId || null]),
      query(expenseQuery, [ctx.tenantId, fromDate, toDate, ctx.entityId || null])
    ]);

    const totalRevenue = revenueResult.rows.reduce((sum: number, r: any) => sum + parseFloat(r.balance || 0), 0);
    const totalExpenses = expenseResult.rows.reduce((sum: number, r: any) => sum + parseFloat(r.balance || 0), 0);
    const netIncome = totalRevenue - totalExpenses;

    res.json({
      success: true,
      data: {
        period: { start_date: fromDate, end_date: toDate, label: `${fromDate} to ${toDate}` },
        revenue: {
          title: 'Revenue',
          accounts: revenueResult.rows.map((r: any) => ({
            code: r.account_code,
            name: r.account_name,
            balance: parseFloat(r.balance || 0)
          })),
          subtotal: totalRevenue
        },
        cost_of_sales: { title: 'Cost of Sales', accounts: [], subtotal: 0 },
        gross_profit: totalRevenue,
        operating_expenses: {
          title: 'Operating Expenses',
          accounts: expenseResult.rows.map((r: any) => ({
            code: r.account_code,
            name: r.account_name,
            balance: parseFloat(r.balance || 0)
          })),
          subtotal: totalExpenses
        },
        operating_profit: netIncome,
        other_income: { title: 'Other Income', accounts: [], subtotal: 0 },
        other_expenses: { title: 'Other Expenses', accounts: [], subtotal: 0 },
        net_profit_before_tax: netIncome,
        tax_expense: 0,
        net_profit_after_tax: netIncome,
        // Legacy flat format for simple consumers
        revenue_total: totalRevenue,
        expenses_total: totalExpenses,
        net_income: netIncome,
        details: [...revenueResult.rows, ...expenseResult.rows]
      }
    });
  } catch (error) {
    console.error('Error fetching income statement:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch income statement', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ==========================================================================
// TAX SETTINGS
// ==========================================================================

export const getBalanceSheet = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const asOfDate = req.query.as_of_date || req.query.asOfDate || new Date().toISOString().split('T')[0];

    const balanceQuery = `
      SELECT 
        COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
        COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
        LOWER(coa.account_type) AS account_type,
        coa.account_category,
        SUM(jel.debit_amount) AS total_debits,
        SUM(jel.credit_amount) AS total_credits,
        CASE 
          WHEN LOWER(coa.account_type) IN ('asset', 'expense') THEN SUM(jel.debit_amount - jel.credit_amount)
          ELSE SUM(jel.credit_amount - jel.debit_amount)
        END AS balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id AND jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $3)
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id 
        AND LOWER(je.status) = 'posted' 
        AND (je.entity_id IS NULL OR je.entity_id = $3)
        AND COALESCE(je.journal_date, je.entry_date, je.posting_date) <= $2
      WHERE coa.tenant_id = $1 
        AND (coa.entity_id IS NULL OR coa.entity_id = $3)
        AND LOWER(coa.account_type) IN ('asset', 'liability', 'equity')
      GROUP BY coa.code, coa.account_code, coa.name, coa.account_name, coa.account_type, coa.account_category
      HAVING SUM(COALESCE(jel.debit_amount, 0)) != 0 OR SUM(COALESCE(jel.credit_amount, 0)) != 0
      ORDER BY coa.code
    `;

    const result = await query(balanceQuery, [ctx.tenantId, asOfDate, ctx.entityId || null]);
    const rows = result.rows;

    const assets = rows.filter((r: any) => r.account_type === 'asset');
    const liabilities = rows.filter((r: any) => r.account_type === 'liability');
    const equityAccounts = rows.filter((r: any) => r.account_type === 'equity');

    const totalAssets = assets.reduce((s: number, r: any) => s + parseFloat(r.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((s: number, r: any) => s + parseFloat(r.balance || 0), 0);
    const totalEquity = equityAccounts.reduce((s: number, r: any) => s + parseFloat(r.balance || 0), 0);

    // Calculate retained earnings (net income from P&L accounts not yet closed)
    const retainedEarningsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'revenue' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'expense' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) AS total_expenses
      FROM journal_entries je
      INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND (jel.entity_id IS NULL OR jel.entity_id = $3)
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND (coa.entity_id IS NULL OR coa.entity_id = $3)
      WHERE je.tenant_id = $1
        AND (je.entity_id IS NULL OR je.entity_id = $3)
        AND LOWER(je.status) = 'posted'
        AND COALESCE(je.journal_date, je.entry_date, je.posting_date) <= $2
        AND LOWER(coa.account_type) IN ('revenue', 'expense')
    `;
    const reResult = await query(retainedEarningsQuery, [ctx.tenantId, asOfDate, ctx.entityId || null]);
    const retainedEarnings = parseFloat(reResult.rows[0]?.total_revenue || 0) - parseFloat(reResult.rows[0]?.total_expenses || 0);

    const totalEquityWithRE = totalEquity + retainedEarnings;
    const totalLE = totalLiabilities + totalEquityWithRE;

    const mapAccount = (r: any) => ({ code: r.account_code, name: r.account_name, balance: parseFloat(r.balance || 0) });

    // Calculate subtotals properly
    const currentAssets = assets.filter((r: any) => (r.account_code || '').startsWith('1'));
    const nonCurrentAssets = assets.filter((r: any) => !(r.account_code || '').startsWith('1'));
    const currentAssetsTotal = currentAssets.reduce((s: number, r: any) => s + parseFloat(r.balance || 0), 0);
    const nonCurrentAssetsTotal = nonCurrentAssets.reduce((s: number, r: any) => s + parseFloat(r.balance || 0), 0);

    // Add retained earnings to equity accounts list
    const equityAccountsMapped = equityAccounts.map(mapAccount);
    if (Math.abs(retainedEarnings) > 0.01) {
      equityAccountsMapped.push({ code: '3200', name: 'Retained Earnings (Net Income)', balance: retainedEarnings });
    }

    res.json({
      success: true,
      data: {
        as_of_date: asOfDate,
        label: `Balance Sheet as at ${asOfDate}`,
        current_assets: { title: 'Current Assets', accounts: currentAssets.map(mapAccount), subtotal: currentAssetsTotal },
        non_current_assets: { title: 'Non-Current Assets', accounts: nonCurrentAssets.map(mapAccount), subtotal: nonCurrentAssetsTotal },
        total_assets: totalAssets,
        current_liabilities: { title: 'Current Liabilities', accounts: liabilities.map(mapAccount), subtotal: totalLiabilities },
        non_current_liabilities: { title: 'Non-Current Liabilities', accounts: [], subtotal: 0 },
        total_liabilities: totalLiabilities,
        equity: { title: 'Equity', accounts: equityAccountsMapped, subtotal: totalEquityWithRE },
        total_equity: totalEquityWithRE,
        total_liabilities_equity: totalLE,
        is_balanced: Math.abs(totalAssets - totalLE) < 0.01,
        variance: totalAssets - totalLE,
        retained_earnings: retainedEarnings,
        accounts: rows.map(mapAccount)
      }
    });
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch balance sheet', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

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
    const dimensionType = req.params.type; // cost-centers, departments, projects
    
    // Map URL type to database type
    const typeMap: Record<string, string> = {
      'cost-centers': 'cost-center',
      'departments': 'department',
      'projects': 'project',
      'products': 'product',
      'locations': 'location'
    };
    const dbType = typeMap[dimensionType] || dimensionType;
    
    let queryText = `SELECT id, dimension_code as code, dimension_name as name, description, 
                            dimension_type, parent_dimension_id as parent_cost_center_id, 
                            is_active, created_at, updated_at
                     FROM financial.dimensions
                     WHERE tenant_id = $1 AND (is_active = true OR is_active IS NULL)`;
    const params: any[] = [ctx.tenantId];
    
    if (dimensionType && dbType) {
      queryText += ` AND dimension_type = $2`;
      params.push(dbType);
    }
    
    queryText += ` ORDER BY dimension_code`;
    
    const result = await query(queryText, params);

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Error fetching dimensions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dimensions', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getDimensionsSummary = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const result = await query(
      `SELECT dimension_type, COUNT(*) as count
       FROM financial.dimensions
       WHERE tenant_id = $1 AND (is_active = true OR is_active IS NULL)
       GROUP BY dimension_type`,
      [ctx.tenantId]
    );
    
    const summary: Record<string, number> = {
      cost_centers: 0,
      departments: 0,
      projects: 0,
      products: 0,
      locations: 0
    };
    
    result.rows.forEach((row: any) => {
      const key = row.dimension_type.replace('-', '_') + 's';
      if (key in summary) {
        summary[key] = parseInt(row.count);
      }
    });
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching dimensions summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dimensions summary', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createDimension = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    // Accept both frontend field names (code, name) and backend field names (dimension_code, dimension_name)
    const code = req.body.code || req.body.dimension_code;
    const name = req.body.name || req.body.dimension_name;
    const description = req.body.description || '';
    const dimensionType = req.body.type || req.body.dimension_type || 'cost-center';
    const parentId = req.body.parent_cost_center_id || req.body.parent_dimension_id || null;

    const result = await query(
      `INSERT INTO financial.dimensions (tenant_id, dimension_code, dimension_name, description, dimension_type, parent_dimension_id, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING id, dimension_code as code, dimension_name as name, description, dimension_type`,
      [ctx.tenantId, code, name, description, dimensionType, parentId, ctx.userId || null]
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
    const { code, name, description, parent_cost_center_id, is_active } = req.body;

    const result = await query(
      `UPDATE financial.dimensions
       SET 
        dimension_code = COALESCE($3, dimension_code),
        dimension_name = COALESCE($4, dimension_name),
        description = COALESCE($5, description),
        parent_dimension_id = COALESCE($6, parent_dimension_id),
        is_active = COALESCE($7, is_active),
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $8
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, dimension_code as code, dimension_name as name, dimension_type, description`,
      [id, ctx.tenantId, code, name, description, parent_cost_center_id, is_active, ctx.userId || null]
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

export const deleteDimension = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    // Soft delete by setting is_active to false
    const result = await query(
      `UPDATE financial.dimensions
       SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $3
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [id, ctx.tenantId, ctx.userId || null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Dimension not found' });
    }

    res.json({ success: true, message: 'Dimension deleted successfully' });
  } catch (error) {
    console.error('Error deleting dimension:', error);
    res.status(400).json({ success: false, message: 'Failed to delete dimension', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ==========================================================================
// DASHBOARD
// ==========================================================================

export const getDashboard = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);

    // Journal counts
    const journalCount = await query(
      `SELECT COUNT(*) as total FROM journal_entries WHERE tenant_id = $1 AND (entity_id IS NULL OR entity_id = $2)`,
      [ctx.tenantId, ctx.entityId || null]
    );
    const postedCount = await query(
      `SELECT COUNT(*) as total FROM journal_entries WHERE tenant_id = $1 AND (entity_id IS NULL OR entity_id = $2) AND status = 'posted'`,
      [ctx.tenantId, ctx.entityId || null]
    );

    // Calculate actual financial balances from posted journal entry lines
    // Cash balance: Sum of debits minus credits on cash/bank accounts (1000-1099 range)
    const cashResult = await query(
      `SELECT COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2)
       JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
       WHERE jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $2) AND je.status = 'posted'
         AND (COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '1%')
         AND (LOWER(COALESCE(coa.name, coa.account_name, '')) LIKE '%cash%' OR LOWER(COALESCE(coa.name, coa.account_name, '')) LIKE '%bank%')`,
      [ctx.tenantId, ctx.entityId || null]
    ).catch(() => ({ rows: [{ balance: 0 }] }));

    // Accounts Receivable (1200-1299 range or 'receivable' in name)
    const arResult = await query(
      `SELECT COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2)
       JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
       WHERE jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $2) AND je.status = 'posted'
         AND (COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '12%'
              OR LOWER(COALESCE(coa.name, coa.account_name, '')) LIKE '%receivable%')`,
      [ctx.tenantId, ctx.entityId || null]
    ).catch(() => ({ rows: [{ balance: 0 }] }));

    // Accounts Payable (2000-2099 range or 'payable' in name) - credit balance
    const apResult = await query(
      `SELECT COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0) as balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2)
       JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
       WHERE jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $2) AND je.status = 'posted'
         AND (COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '20%'
              OR LOWER(COALESCE(coa.name, coa.account_name, '')) LIKE '%payable%')`,
      [ctx.tenantId, ctx.entityId || null]
    ).catch(() => ({ rows: [{ balance: 0 }] }));

    // Monthly Revenue (4xxx accounts) - current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const revenueResult = await query(
      `SELECT COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0) as balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2)
       JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
       WHERE jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $2) AND je.status = 'posted'
         AND COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '4%'
         AND je.entry_date >= $3 AND je.entry_date <= $4`,
      [ctx.tenantId, ctx.entityId || null, monthStart, monthEnd]
    ).catch(() => ({ rows: [{ balance: 0 }] }));

    // Monthly Expenses (5xxx-6xxx accounts) - current month
    const expenseResult = await query(
      `SELECT COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2)
       JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
       WHERE jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $2) AND je.status = 'posted'
         AND (COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '5%'
              OR COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '6%')
         AND je.entry_date >= $3 AND je.entry_date <= $4`,
      [ctx.tenantId, ctx.entityId || null, monthStart, monthEnd]
    ).catch(() => ({ rows: [{ balance: 0 }] }));

    // Recent posted journal entries
    const recentResult = await query(
      `SELECT je.id, je.reference_number as reference, je.entry_date as date,
              je.description, je.status,
              COALESCE(SUM(jel.debit_amount), 0) as total_debit,
              COALESCE(SUM(jel.credit_amount), 0) as total_credit
       FROM journal_entries je
       LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id AND jel.tenant_id = je.tenant_id AND (jel.entity_id IS NULL OR jel.entity_id = $2)
       WHERE je.tenant_id = $1 AND (je.entity_id IS NULL OR je.entity_id = $2) AND je.status = 'posted'
       GROUP BY je.id, je.reference_number, je.entry_date, je.description, je.status
       ORDER BY je.entry_date DESC, je.created_at DESC LIMIT 10`,
      [ctx.tenantId, ctx.entityId || null]
    ).catch(() => ({ rows: [] }));

    // All-time Revenue (4xxx accounts)
    const allTimeRevenueResult = await query(
      `SELECT COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0) as balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2)
       JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
       WHERE jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $2) AND je.status = 'posted'
         AND COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '4%'`,
      [ctx.tenantId, ctx.entityId || null]
    ).catch(() => ({ rows: [{ balance: 0 }] }));

    // All-time Expenses (5xxx-6xxx accounts)
    const allTimeExpenseResult = await query(
      `SELECT COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2)
       JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
       WHERE jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $2) AND je.status = 'posted'
         AND (COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '5%'
              OR COALESCE(NULLIF(coa.code, ''), coa.account_code) LIKE '6%')`,
      [ctx.tenantId, ctx.entityId || null]
    ).catch(() => ({ rows: [{ balance: 0 }] }));

    // Balance Sheet aggregates
    const balanceSheetResult = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'asset' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as total_assets,
         COALESCE(SUM(CASE WHEN LOWER(coa.account_type) IN ('liability') THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as total_liabilities,
         COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'equity' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as total_equity
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND (je.entity_id IS NULL OR je.entity_id = $2)
       JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id AND (coa.entity_id IS NULL OR coa.entity_id = $2)
       WHERE jel.tenant_id = $1 AND (jel.entity_id IS NULL OR jel.entity_id = $2) AND je.status = 'posted'`,
      [ctx.tenantId, ctx.entityId || null]
    ).catch(() => ({ rows: [{ total_assets: 0, total_liabilities: 0, total_equity: 0 }] }));

    const monthlyRevenue = parseFloat(revenueResult.rows[0]?.balance || '0');
    const monthlyExpenses = parseFloat(expenseResult.rows[0]?.balance || '0');
    const totalRevenue = parseFloat(allTimeRevenueResult.rows[0]?.balance || '0');
    const totalExpenses = parseFloat(allTimeExpenseResult.rows[0]?.balance || '0');
    const cashBalance = parseFloat(cashResult.rows[0]?.balance || '0');
    const receivables = parseFloat(arResult.rows[0]?.balance || '0');
    const payables = parseFloat(apResult.rows[0]?.balance || '0');
    const totalAssets = parseFloat(balanceSheetResult.rows[0]?.total_assets || '0');
    const totalLiabilities = parseFloat(balanceSheetResult.rows[0]?.total_liabilities || '0');
    const postedEquity = parseFloat(balanceSheetResult.rows[0]?.total_equity || '0');
    // Retained Earnings = Revenue - Expenses (not yet posted to equity accounts)
    const retainedEarnings = totalRevenue - totalExpenses;
    const totalEquity = postedEquity + retainedEarnings;
    const netIncome = totalRevenue - totalExpenses;

    const stats = {
      // Original field names
      current_cash_balance: cashBalance,
      accounts_receivable: receivables,
      accounts_payable: payables,
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      net_income: netIncome,
      // Fields expected by FinancialHub frontend
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      equity: totalEquity,
      retained_earnings: retainedEarnings,
      cash_balance: cashBalance,
      receivables: receivables,
      payables: payables,
      // Journal counts
      total_journals: parseInt(journalCount.rows[0]?.total || '0'),
      posted_journals: parseInt(postedCount.rows[0]?.total || '0'),
      unposted_journals: parseInt(journalCount.rows[0]?.total || '0') - parseInt(postedCount.rows[0]?.total || '0'),
      pending_approvals: 0,
      recent_transactions: recentResult.rows,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
