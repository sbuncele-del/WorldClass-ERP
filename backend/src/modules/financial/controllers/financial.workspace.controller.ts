import { Request, Response } from 'express';
import { query } from '../../../config/database';

/**
 * Financial Workspace Controller
 * Provides aggregated data for the Financial Management dashboard
 */

/**
 * GET /api/financial/workspace
 * Returns all data needed for the Financial Management workspace dashboard
 */
export const getFinancialWorkspace = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;

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
  const result = await query(
    `
    SELECT 
      account_type,
      COUNT(*) as account_count,
      SUM(balance) as total_balance
    FROM chart_of_accounts
    WHERE tenant_id = $1 AND is_active = true
    GROUP BY account_type
    ORDER BY account_type
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get recent transactions (last 10)
 */
async function getRecentTransactions(tenantId: string) {
  const result = await query(
    `
    SELECT 
      jel.id,
      je.journal_number,
      je.journal_date,
      jel.account_code,
      coa.account_name,
      jel.debit,
      jel.credit,
      je.description
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    JOIN chart_of_accounts coa ON jel.account_code = coa.account_code AND coa.tenant_id = $1
    WHERE je.tenant_id = $1 AND je.status = 'posted'
    ORDER BY je.journal_date DESC, je.created_at DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get cash flow data for last 6 months
 */
async function getCashFlowData(tenantId: string) {
  const result = await query(
    `
    SELECT 
      DATE_TRUNC('month', je.journal_date) as month,
      SUM(CASE WHEN coa.account_type = 'Asset' THEN jel.debit - jel.credit ELSE 0 END) as cash_inflow,
      SUM(CASE WHEN coa.account_type = 'Liability' OR coa.account_type = 'Equity' 
           THEN jel.credit - jel.debit ELSE 0 END) as cash_outflow
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    JOIN chart_of_accounts coa ON jel.account_code = coa.account_code AND coa.tenant_id = $1
    WHERE je.tenant_id = $1 
      AND je.status = 'posted'
      AND je.journal_date >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', je.journal_date)
    ORDER BY month DESC
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get pending reconciliations count
 */
async function getPendingReconciliations(tenantId: string) {
  const result = await query(
    `
    SELECT 
      COUNT(*) as pending_count,
      SUM(unreconciled_amount) as total_unreconciled
    FROM (
      SELECT 
        account_code,
        ABS(SUM(debit - credit)) as unreconciled_amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE je.tenant_id = $1 
        AND je.status = 'posted'
        AND jel.reconciled = false
      GROUP BY account_code
      HAVING ABS(SUM(debit - credit)) > 0
    ) as unreconciled_accounts
    `,
    [tenantId]
  );

  return result.rows[0] || { pending_count: 0, total_unreconciled: 0 };
}

/**
 * Get financial summary metrics
 */
async function getFinancialSummary(tenantId: string) {
  const result = await query(
    `
    SELECT 
      SUM(CASE WHEN account_type = 'Asset' THEN balance ELSE 0 END) as total_assets,
      SUM(CASE WHEN account_type = 'Liability' THEN balance ELSE 0 END) as total_liabilities,
      SUM(CASE WHEN account_type = 'Equity' THEN balance ELSE 0 END) as total_equity,
      SUM(CASE WHEN account_type = 'Revenue' THEN balance ELSE 0 END) as total_revenue,
      SUM(CASE WHEN account_type = 'Expense' THEN balance ELSE 0 END) as total_expenses
    FROM chart_of_accounts
    WHERE tenant_id = $1 AND is_active = true
    `,
    [tenantId]
  );

  const summary = result.rows[0] || {
    total_assets: 0,
    total_liabilities: 0,
    total_equity: 0,
    total_revenue: 0,
    total_expenses: 0,
  };

  // Calculate net profit
  summary.net_profit = parseFloat(summary.total_revenue || 0) - parseFloat(summary.total_expenses || 0);

  return summary;
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
