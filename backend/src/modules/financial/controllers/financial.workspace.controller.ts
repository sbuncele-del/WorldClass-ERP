import { Response } from 'express';
import { query } from '../../../config/database';
import { TenantRequest } from '../../../types';

// Ensure we consistently enforce tenant context for workspace data
function getTenantId(req: TenantRequest): string | null {
  return req.tenant?.id ?? null;
}

/**
 * Financial Workspace Controller
 * Provides aggregated data for the Financial Management dashboard
 */

/**
 * GET /api/financial/workspace
 * Returns all data needed for the Financial Management workspace dashboard
 */
export const getFinancialWorkspace = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    // Parallel queries for performance
    const [
      accountBalances,
      recentTransactions,
      cashFlow,
      pendingReconciliations,
      financialSummary,
      recentJournalEntries,
    ] = await Promise.all([
      getAccountBalances(tenantId),
      getRecentTransactions(tenantId),
      getCashFlowData(tenantId),
      getPendingReconciliations(tenantId),
      getFinancialSummary(tenantId),
      getRecentJournalEntries(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        summary: financialSummary,
        account_balances: accountBalances,
        recent_transactions: recentTransactions,
        cash_flow: cashFlow,
        pending_reconciliations: pendingReconciliations,
        recent_journal_entries: recentJournalEntries,
      },
    });
  } catch (error: any) {
    console.error('Financial workspace error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch financial workspace data',
    });
  }
};

/**
 * Get account balances grouped by type
 */
async function getAccountBalances(tenantId: string) {
  try {
    // Get balances from journal entry lines (actual posted transactions)
    const result = await query(
      `
      SELECT 
        coa.account_type,
        COUNT(DISTINCT coa.id) as account_count,
        COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as total_balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id AND jel.tenant_id = $1
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND LOWER(je.status) = 'posted'
      WHERE coa.tenant_id = $1 AND coa.is_active = true
      GROUP BY coa.account_type
      ORDER BY coa.account_type
      `,
      [tenantId]
    );

    return result.rows.map((row) => ({
      account_type: row.account_type,
      account_count: Number(row.account_count) || 0,
      total_balance: Number(row.total_balance) || 0,
    }));
  } catch (error) {
    console.error('getAccountBalances error:', error);
    return [];
  }
}

/**
 * Get recent transactions (last 10)
 */
async function getRecentTransactions(tenantId: string) {
  try {
    const result = await query(
      `
      SELECT 
        jel.id,
        je.entry_number as journal_number,
        COALESCE(je.journal_date, je.entry_date, je.posting_date) as journal_date,
        jel.account_code,
        COALESCE(coa.name, jel.account_name, 'Unknown') as account_name,
        jel.debit_amount as debit,
        jel.credit_amount as credit,
        je.description
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = $1
      WHERE je.tenant_id = $1 AND LOWER(je.status) = 'posted'
      ORDER BY je.created_at DESC
      LIMIT 10
      `,
      [tenantId]
    );

    return result.rows.map((row) => ({
      ...row,
      debit: Number(row.debit) || 0,
      credit: Number(row.credit) || 0,
    }));
  } catch (error) {
    console.error('getRecentTransactions error:', error);
    return [];
  }
}

/**
 * Get cash flow data for last 6 months
 */
async function getCashFlowData(tenantId: string) {
  try {
    const result = await query(
      `
      SELECT 
        DATE_TRUNC('month', COALESCE(je.journal_date, je.entry_date, je.created_at)) as month,
        SUM(CASE WHEN LOWER(coa.account_type) = 'asset' THEN jel.debit_amount - jel.credit_amount ELSE 0 END) as cash_inflow,
        SUM(CASE WHEN LOWER(coa.account_type) IN ('liability', 'equity')
             THEN jel.credit_amount - jel.debit_amount ELSE 0 END) as cash_outflow
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = $1
      WHERE je.tenant_id = $1 
        AND LOWER(je.status) = 'posted'
        AND COALESCE(je.journal_date, je.entry_date, je.created_at) >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', COALESCE(je.journal_date, je.entry_date, je.created_at))
      ORDER BY month DESC
      `,
      [tenantId]
    );

    return result.rows.map((row) => ({
      month: row.month,
      cash_inflow: Number(row.cash_inflow) || 0,
      cash_outflow: Number(row.cash_outflow) || 0,
    }));
  } catch (error) {
    console.error('getCashFlowData error:', error);
    return [];
  }
}

/**
 * Get pending reconciliations count
 */
async function getPendingReconciliations(tenantId: string) {
  try {
    const result = await query(
      `
      SELECT 
        COUNT(*) as pending_count,
        COALESCE(SUM(unreconciled_amount), 0) as total_unreconciled
      FROM (
        SELECT 
          jel.account_id,
          ABS(SUM(jel.debit_amount - jel.credit_amount)) as unreconciled_amount
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE je.tenant_id = $1 
          AND LOWER(je.status) = 'posted'
          AND jel.is_reconciled = false
        GROUP BY jel.account_id
        HAVING ABS(SUM(jel.debit_amount - jel.credit_amount)) > 0
      ) as unreconciled_accounts
      `,
      [tenantId]
    );

    const row = result.rows[0];
    return {
      pending_count: Number(row?.pending_count) || 0,
      total_unreconciled: Number(row?.total_unreconciled) || 0,
    };
  } catch (error) {
    console.error('getPendingReconciliations error:', error);
    return { pending_count: 0, total_unreconciled: 0 };
  }
}

/**
 * Get financial summary metrics
 */
async function getFinancialSummary(tenantId: string) {
  try {
    // Calculate from actual posted journal entries
    const result = await query(
      `
      SELECT 
        COALESCE(SUM(CASE WHEN LOWER(coa.account_type) IN ('revenue', 'income') THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN LOWER(coa.account_type) IN ('expense', 'cost_of_sales') THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'asset' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as total_assets,
        COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'liability' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as total_liabilities,
        COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'equity' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as equity,
        COALESCE(SUM(CASE WHEN LOWER(coa.account_category) = 'cash' OR LOWER(coa.name) LIKE '%bank%' OR LOWER(coa.name) LIKE '%cash%' 
          THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as cash_balance,
        COALESCE(SUM(CASE WHEN LOWER(coa.account_category) = 'receivable' OR LOWER(coa.name) LIKE '%receivable%' 
          THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as receivables,
        COALESCE(SUM(CASE WHEN LOWER(coa.account_category) = 'payable' OR LOWER(coa.name) LIKE '%payable%' 
          THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as payables
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id AND LOWER(je.status) = 'posted'
      JOIN chart_of_accounts coa ON coa.id = jel.account_id
      WHERE jel.tenant_id = $1
      `,
      [tenantId]
    );

    const row = result.rows[0] || {};
    const revenue = Number(row.total_revenue) || 0;
    const expenses = Number(row.total_expenses) || 0;

    return {
      total_revenue: row.total_revenue || '0',
      total_expenses: row.total_expenses || '0',
      net_income: String(revenue - expenses),
      total_assets: row.total_assets || '0',
      total_liabilities: row.total_liabilities || '0',
      total_equity: row.equity || '0',
      equity: row.equity || '0',
      net_profit: revenue - expenses,
      cash_balance: row.cash_balance || '0',
      receivables: row.receivables || '0',
      payables: row.payables || '0',
    };
  } catch (error) {
    console.error('getFinancialSummary error:', error);
    return {
      total_revenue: '0', total_expenses: '0', net_income: '0',
      total_assets: '0', total_liabilities: '0', total_equity: '0',
      equity: '0', net_profit: 0, cash_balance: '0',
      receivables: '0', payables: '0',
    };
  }
}

/**
 * Get recent journal entries (last 5)
 */
async function getRecentJournalEntries(tenantId: string) {
  const result = await query(
    `
    SELECT 
      id,
      journal_number,
      journal_date,
      description,
      status,
      total_debit,
      total_credit,
      created_at
    FROM journal_entries
    WHERE tenant_id = $1
    ORDER BY created_at DESC
    LIMIT 5
    `,
    [tenantId]
  );

  return result.rows;
}
