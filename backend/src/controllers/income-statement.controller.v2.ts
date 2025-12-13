/**
 * Income Statement Controller V2 - Tenant-Hardened
 * 
 * Multi-tenant secure income statement (P&L) generation.
 * All queries filtered by tenant_id.
 */

import { Response } from 'express';
import pool from '../config/database';
import { TenantRequest } from '../types';

// Helper to extract tenant context
function getTenantContext(req: TenantRequest): { tenantId: string; userId?: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: req.user?.id };
}

interface AccountBalance {
  account_code: string;
  account_name: string;
  amount: number;
}

interface IncomeStatementSection {
  title: string;
  accounts: AccountBalance[];
  subtotal: number;
}

interface IncomeStatementData {
  period: {
    start_date: string;
    end_date: string;
    label: string;
  };
  revenue: IncomeStatementSection;
  cost_of_sales: IncomeStatementSection;
  gross_profit: number;
  operating_expenses: IncomeStatementSection;
  operating_profit: number;
  other_income: IncomeStatementSection;
  other_expenses: IncomeStatementSection;
  net_profit_before_tax: number;
  tax_expense: number;
  net_profit_after_tax: number;
}

export class IncomeStatementControllerV2 {
  /**
   * Generate Income Statement (P&L)
   * GET /api/v2/financial/reports/income-statement
   */
  static async generateIncomeStatement(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { start_date, end_date, period = 'monthly' } = req.query;

      const dateRange = calculateDateRange(period as string, start_date as string, end_date as string);

      // Fetch all account sections with tenant filter
      const revenueAccounts = await fetchAccountBalances(tenantId, dateRange.start_date, dateRange.end_date, '4000', '4999');
      const cogsAccounts = await fetchAccountBalances(tenantId, dateRange.start_date, dateRange.end_date, '5000', '5999');
      const expenseAccounts = await fetchAccountBalances(tenantId, dateRange.start_date, dateRange.end_date, '6000', '6999');
      const otherIncomeAccounts = await fetchAccountBalances(tenantId, dateRange.start_date, dateRange.end_date, '7000', '7499');
      const otherExpenseAccounts = await fetchAccountBalances(tenantId, dateRange.start_date, dateRange.end_date, '7500', '7999');
      const taxExpenseAccounts = await fetchAccountBalances(tenantId, dateRange.start_date, dateRange.end_date, '8000', '8999');

      // Calculate subtotals
      const revenueTotal = revenueAccounts.reduce((sum, acc) => sum + acc.amount, 0);
      const cogsTotal = cogsAccounts.reduce((sum, acc) => sum + acc.amount, 0);
      const expenseTotal = expenseAccounts.reduce((sum, acc) => sum + acc.amount, 0);
      const otherIncomeTotal = otherIncomeAccounts.reduce((sum, acc) => sum + acc.amount, 0);
      const otherExpenseTotal = otherExpenseAccounts.reduce((sum, acc) => sum + acc.amount, 0);
      const taxTotal = taxExpenseAccounts.reduce((sum, acc) => sum + acc.amount, 0);

      // Calculate profit metrics
      const grossProfit = revenueTotal - cogsTotal;
      const operatingProfit = grossProfit - expenseTotal;
      const netProfitBeforeTax = operatingProfit + otherIncomeTotal - otherExpenseTotal;
      const netProfitAfterTax = netProfitBeforeTax - taxTotal;

      const incomeStatementData: IncomeStatementData = {
        period: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
          label: dateRange.label
        },
        revenue: {
          title: 'Revenue',
          accounts: revenueAccounts,
          subtotal: revenueTotal
        },
        cost_of_sales: {
          title: 'Cost of Sales',
          accounts: cogsAccounts,
          subtotal: cogsTotal
        },
        gross_profit: grossProfit,
        operating_expenses: {
          title: 'Operating Expenses',
          accounts: expenseAccounts,
          subtotal: expenseTotal
        },
        operating_profit: operatingProfit,
        other_income: {
          title: 'Other Income',
          accounts: otherIncomeAccounts,
          subtotal: otherIncomeTotal
        },
        other_expenses: {
          title: 'Other Expenses',
          accounts: otherExpenseAccounts,
          subtotal: otherExpenseTotal
        },
        net_profit_before_tax: netProfitBeforeTax,
        tax_expense: taxTotal,
        net_profit_after_tax: netProfitAfterTax
      };

      res.json({
        success: true,
        data: incomeStatementData
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[IncomeStatement] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate income statement',
        error: error.message
      });
    }
  }

  /**
   * Get revenue breakdown
   * GET /api/v2/financial/reports/revenue-breakdown
   */
  static async getRevenueBreakdown(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { start_date, end_date, group_by = 'account' } = req.query;

      const dateRange = calculateDateRange('custom', start_date as string, end_date as string);

      let groupByClause = 'coa.account_code, coa.account_name';
      let selectClause = 'coa.account_code as category, coa.account_name as label';

      if (group_by === 'month') {
        groupByClause = "DATE_TRUNC('month', je.journal_date)";
        selectClause = "TO_CHAR(DATE_TRUNC('month', je.journal_date), 'Mon YYYY') as category, TO_CHAR(DATE_TRUNC('month', je.journal_date), 'Mon YYYY') as label";
      }

      const query = `
        SELECT 
          ${selectClause},
          COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
        FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
          AND coa.tenant_id = $1
        JOIN journal_entries je ON jel.journal_entry_id = je.id
          AND je.tenant_id = $1
        WHERE jel.tenant_id = $1
          AND je.status = 'POSTED'
          AND je.journal_date >= $2
          AND je.journal_date <= $3
          AND coa.account_code >= '4000'
          AND coa.account_code < '5000'
        GROUP BY ${groupByClause}
        ORDER BY amount DESC
      `;

      const result = await pool.query(query, [tenantId, dateRange.start_date, dateRange.end_date]);

      res.json({
        success: true,
        data: {
          period: dateRange,
          breakdown: result.rows,
          total: result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0)
        }
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[RevenueBreakdown] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to get revenue breakdown' });
    }
  }

  /**
   * Get expense breakdown
   * GET /api/v2/financial/reports/expense-breakdown
   */
  static async getExpenseBreakdown(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { start_date, end_date, group_by = 'account' } = req.query;

      const dateRange = calculateDateRange('custom', start_date as string, end_date as string);

      let groupByClause = 'coa.account_code, coa.account_name';
      let selectClause = 'coa.account_code as category, coa.account_name as label';

      if (group_by === 'cost_center') {
        groupByClause = 'jel.cost_center';
        selectClause = 'COALESCE(jel.cost_center, \'Unassigned\') as category, COALESCE(jel.cost_center, \'Unassigned\') as label';
      }

      const query = `
        SELECT 
          ${selectClause},
          COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
        FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
          AND coa.tenant_id = $1
        JOIN journal_entries je ON jel.journal_entry_id = je.id
          AND je.tenant_id = $1
        WHERE jel.tenant_id = $1
          AND je.status = 'POSTED'
          AND je.journal_date >= $2
          AND je.journal_date <= $3
          AND coa.account_code >= '6000'
          AND coa.account_code < '7000'
        GROUP BY ${groupByClause}
        ORDER BY amount DESC
      `;

      const result = await pool.query(query, [tenantId, dateRange.start_date, dateRange.end_date]);

      res.json({
        success: true,
        data: {
          period: dateRange,
          breakdown: result.rows,
          total: result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0)
        }
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[ExpenseBreakdown] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to get expense breakdown' });
    }
  }

  /**
   * Export income statement to PDF
   * POST /api/v2/financial/reports/income-statement/export
   */
  static async exportToPDF(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);

      res.json({
        success: true,
        message: 'PDF export will be implemented with reporting service',
        tenant_id: tenantId
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      res.status(500).json({ success: false, message: 'Export failed' });
    }
  }
}

// Helper functions
function calculateDateRange(period: string, startDate?: string, endDate?: string): { start_date: string; end_date: string; label: string } {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;

  if (startDate && endDate) {
    return {
      start_date: startDate,
      end_date: endDate,
      label: `${startDate} to ${endDate}`
    };
  }

  switch (period) {
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      label = start.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      label = `Q${quarter + 1} ${now.getFullYear()}`;
      break;
    case 'annual':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      label = `FY ${now.getFullYear()}`;
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      label = start.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  }

  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0],
    label
  };
}

async function fetchAccountBalances(
  tenantId: string,
  startDate: string,
  endDate: string,
  codeStart: string,
  codeEnd: string
): Promise<AccountBalance[]> {
  const query = `
    SELECT 
      coa.account_code,
      coa.account_name,
      COALESCE(SUM(
        CASE 
          WHEN coa.account_type = 'REVENUE' THEN jel.credit_amount - jel.debit_amount
          ELSE jel.debit_amount - jel.credit_amount
        END
      ), 0) as amount
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      AND jel.tenant_id = $1
    LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      AND je.tenant_id = $1
      AND je.status = 'POSTED'
      AND je.journal_date >= $2
      AND je.journal_date <= $3
    WHERE coa.tenant_id = $1
      AND coa.account_code >= $4
      AND coa.account_code < $5
      AND coa.is_active = true
    GROUP BY coa.account_code, coa.account_name, coa.account_type
    HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 
       OR COALESCE(SUM(jel.credit_amount), 0) != 0
    ORDER BY coa.account_code
  `;

  const result = await pool.query(query, [tenantId, startDate, endDate, codeStart, codeEnd]);
  return result.rows.map(row => ({
    account_code: row.account_code,
    account_name: row.account_name,
    amount: parseFloat(row.amount)
  }));
}

export default IncomeStatementControllerV2;
