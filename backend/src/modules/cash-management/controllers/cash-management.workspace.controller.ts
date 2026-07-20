import { Response } from 'express';
import { TenantRequest } from '../../../types';
import { query } from '../../../config/database';

/**
 * Helper to extract tenant ID with type safety
 */
function getTenantId(req: TenantRequest): string | null {
  return req.tenant?.id ?? null;
}

/**
 * Cash Management Workspace Controller
 * Provides aggregated data for the Cash Management dashboard
 */

/**
 * GET /api/cash-management/workspace
 * Returns all data needed for the Cash Management workspace dashboard
 */
export const getCashManagementWorkspace = async (req: TenantRequest, res: Response) => {
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
      bankAccounts,
      cashPosition,
      pendingPayments,
      reconciliationStatus,
      recentTransactions,
      cashFlowTrend,
    ] = await Promise.all([
      getBankAccounts(tenantId),
      getCashPosition(tenantId),
      getPendingPayments(tenantId),
      getReconciliationStatus(tenantId),
      getRecentTransactions(tenantId),
      getCashFlowTrend(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        bank_accounts: bankAccounts,
        cash_position: cashPosition,
        pending_payments: pendingPayments,
        reconciliation_status: reconciliationStatus,
        recent_transactions: recentTransactions,
        cash_flow_trend: cashFlowTrend,
      },
    });
  } catch (error: any) {
    console.error('Cash management workspace error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch cash management workspace data',
    });
  }
};

/**
 * Get all bank accounts with balances
 */
async function getBankAccounts(tenantId: string) {
  const result = await query(
    `
    SELECT
      account_id as id,
      account_name,
      account_number,
      bank_code,
      currency,
      current_balance,
      last_reconciled_date,
      is_active
    FROM cash_bank_accounts
    WHERE tenant_id = $1
    ORDER BY is_active DESC, account_name ASC
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get current cash position summary
 */
async function getCashPosition(tenantId: string) {
  const result = await query(
    `
    SELECT
      COUNT(*) as total_accounts,
      SUM(current_balance) as total_balance,
      SUM(CASE WHEN is_active = true THEN current_balance ELSE 0 END) as active_balance,
      COUNT(CASE WHEN is_active = true THEN 1 END) as active_accounts
    FROM cash_bank_accounts
    WHERE tenant_id = $1
    `,
    [tenantId]
  );

  return result.rows[0] || {
    total_accounts: 0,
    total_balance: 0,
    active_balance: 0,
    active_accounts: 0,
  };
}

/**
 * Get pending payments/receipts
 */
async function getPendingPayments(tenantId: string) {
  try {
    const result = await query(
      `
      SELECT
        COUNT(*) as pending_count,
        COALESCE(SUM(COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0)), 0) as total_amount
      FROM cash_bank_statement_lines l
      JOIN cash_bank_statements s ON s.statement_id = l.statement_id
      WHERE s.tenant_id = $1 AND l.is_matched = false
      `,
      [tenantId]
    );
    return result.rows[0] || { pending_count: 0, total_amount: 0 };
  } catch (error) {
    console.error('Error in getPendingPayments:', error);
    return { pending_count: 0, total_amount: 0 };
  }
}

/**
 * Get reconciliation status
 */
async function getReconciliationStatus(tenantId: string) {
  const result = await query(
    `
    SELECT
      ba.account_id,
      ba.account_name,
      ba.last_reconciled_date,
      COUNT(l.line_id) as unreconciled_count,
      SUM(CASE WHEN l.is_matched = false THEN COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0) ELSE 0 END) as unreconciled_amount
    FROM cash_bank_accounts ba
    LEFT JOIN cash_bank_statements s ON ba.account_id = s.account_id
    LEFT JOIN cash_bank_statement_lines l ON s.statement_id = l.statement_id AND l.is_matched = false
    WHERE ba.tenant_id = $1 AND ba.is_active = true
    GROUP BY ba.account_id, ba.account_name, ba.last_reconciled_date
    ORDER BY ba.last_reconciled_date ASC NULLS FIRST
    LIMIT 5
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
      l.line_id as id,
      l.transaction_date,
      l.description,
      (COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0)) as amount,
      l.is_matched as reconciled,
      ba.account_name
    FROM cash_bank_statement_lines l
    JOIN cash_bank_statements s ON l.statement_id = s.statement_id
    JOIN cash_bank_accounts ba ON s.account_id = ba.account_id
    WHERE s.tenant_id = $1
    ORDER BY l.transaction_date DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get cash flow trend (last 6 months)
 */
async function getCashFlowTrend(tenantId: string) {
  const result = await query(
    `
    SELECT
      DATE_TRUNC('month', l.transaction_date) as month,
      SUM(COALESCE(l.credit_amount, 0)) as inflow,
      SUM(COALESCE(l.debit_amount, 0)) as outflow
    FROM cash_bank_statement_lines l
    JOIN cash_bank_statements s ON l.statement_id = s.statement_id
    WHERE s.tenant_id = $1
      AND l.transaction_date >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', l.transaction_date)
    ORDER BY month DESC
    `,
    [tenantId]
  );

  return result.rows;
}
