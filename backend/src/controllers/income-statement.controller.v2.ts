/**
 * Income Statement Controller V2 - Tenant-Hardened
 * 
 * Multi-tenant secure income statement (P&L) generation.
 * All queries filtered by tenant_id.
 */

import { Response } from 'express';
import pool from '../config/database';
import { TenantRequest } from '../types';

// Helper to extract tenant + entity context
function getTenantContext(req: TenantRequest): { tenantId: string; userId?: string; entityId?: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: req.user?.id, entityId: req.entity?.id || req.entityId };
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
      const { tenantId, entityId } = getTenantContext(req);
      const { start_date, end_date, period = 'monthly' } = req.query;

      const dateRange = calculateDateRange(period as string, start_date as string, end_date as string);

      const query = `
        SELECT 
          COALESCE(coa.account_code, coa.code) as account_code,
          COALESCE(coa.account_name, coa.name) as account_name,
          LOWER(coa.account_type) as account_type,
          CASE 
            WHEN LOWER(coa.account_type) = 'revenue' 
            THEN COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
            ELSE COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
          END as amount
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
        WHERE jel.tenant_id = $1
          AND je.status = 'posted'
          AND je.entry_date >= $2
          AND je.entry_date <= $3
          AND LOWER(coa.account_type) IN ('revenue', 'expense')
        GROUP BY COALESCE(coa.account_code, coa.code), COALESCE(coa.account_name, coa.name), coa.account_type
        HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
        ORDER BY COALESCE(coa.account_code, coa.code)
      `;

      const result = await pool.query(query, [tenantId, dateRange.start_date, dateRange.end_date]);

      const revenueAccounts: AccountBalance[] = [];
      const costOfSalesAccounts: AccountBalance[] = [];
      const operatingExpenseAccounts: AccountBalance[] = [];
      const otherIncomeAccounts: AccountBalance[] = [];
      const otherExpenseAccounts: AccountBalance[] = [];

      for (const row of result.rows) {
        const acct: AccountBalance = {
          account_code: row.account_code || '',
          account_name: row.account_name || '',
          amount: parseFloat(row.amount) || 0
        };

        if (row.account_type === 'revenue') {
          if (acct.account_code >= '4300' && acct.account_code < '5000') {
            otherIncomeAccounts.push(acct);
          } else {
            revenueAccounts.push(acct);
          }
        } else {
          const name = (acct.account_name || '').toLowerCase();
          if (acct.account_code === '5100' || name.includes('cost of sales') || name.includes('cogs')) {
            costOfSalesAccounts.push(acct);
          } else {
            operatingExpenseAccounts.push(acct);
          }
        }
      }

      const revenueTotal = revenueAccounts.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const cosTotal = costOfSalesAccounts.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const grossProfit = revenueTotal - cosTotal;
      const opexTotal = operatingExpenseAccounts.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const operatingProfit = grossProfit - opexTotal;
      const otherIncTotal = otherIncomeAccounts.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const otherExpTotal = otherExpenseAccounts.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const netProfitBeforeTax = operatingProfit + otherIncTotal - otherExpTotal;

      const incomeStatementData: IncomeStatementData = {
        period: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
          label: dateRange.label
        },
        revenue: { title: 'Revenue', accounts: revenueAccounts, subtotal: revenueTotal },
        cost_of_sales: { title: 'Cost of Sales', accounts: costOfSalesAccounts, subtotal: cosTotal },
        gross_profit: grossProfit,
        operating_expenses: { title: 'Operating Expenses', accounts: operatingExpenseAccounts, subtotal: opexTotal },
        operating_profit: operatingProfit,
        other_income: { title: 'Other Income', accounts: otherIncomeAccounts, subtotal: otherIncTotal },
        other_expenses: { title: 'Other Expenses', accounts: otherExpenseAccounts, subtotal: otherExpTotal },
        net_profit_before_tax: netProfitBeforeTax,
        tax_expense: 0,
        net_profit_after_tax: netProfitBeforeTax
      };

      res.json({
        success: true,
        data: incomeStatementData,
        meta: { generated_at: new Date().toISOString(), tenant_id: tenantId, entity_id: entityId || null }
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

      let groupByClause = 'COALESCE(coa.account_code, coa.code), COALESCE(coa.account_name, coa.name)';
      let selectClause = 'COALESCE(coa.account_code, coa.code) as category, COALESCE(coa.account_name, coa.name) as label';

      if (group_by === 'month') {
        groupByClause = "DATE_TRUNC('month', je.entry_date)";
        selectClause = "TO_CHAR(DATE_TRUNC('month', je.entry_date), 'Mon YYYY') as category, TO_CHAR(DATE_TRUNC('month', je.entry_date), 'Mon YYYY') as label";
      }

      const query = `
        SELECT 
          ${selectClause},
          COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
        FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
        JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
        WHERE jel.tenant_id = $1
          AND je.status = 'posted'
          AND je.entry_date >= $2
          AND je.entry_date <= $3
          AND LOWER(coa.account_type) = 'revenue'
        GROUP BY ${groupByClause}
        ORDER BY amount DESC
      `;

      const result = await pool.query(query, [tenantId, dateRange.start_date, dateRange.end_date]);

      res.json({
        success: true,
        data: {
          period: dateRange,
          breakdown: result.rows,
          total: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.amount), 0)
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

      let groupByClause = 'COALESCE(coa.account_code, coa.code), COALESCE(coa.account_name, coa.name)';
      let selectClause = 'COALESCE(coa.account_code, coa.code) as category, COALESCE(coa.account_name, coa.name) as label';

      if (group_by === 'cost_center') {
        groupByClause = 'jel.cost_center_id';
        selectClause = "COALESCE(jel.cost_center_id::text, 'Unassigned') as category, COALESCE(jel.cost_center_id::text, 'Unassigned') as label";
      }

      const query = `
        SELECT 
          ${selectClause},
          COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
        FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
        JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
        WHERE jel.tenant_id = $1
          AND je.status = 'posted'
          AND je.entry_date >= $2
          AND je.entry_date <= $3
          AND LOWER(coa.account_type) = 'expense'
        GROUP BY ${groupByClause}
        ORDER BY amount DESC
      `;

      const result = await pool.query(query, [tenantId, dateRange.start_date, dateRange.end_date]);

      res.json({
        success: true,
        data: {
          period: dateRange,
          breakdown: result.rows,
          total: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.amount), 0)
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
    case 'annual': {
      // Default to most relevant fiscal year (previous year if in H1, current year if in H2)
      const year = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
      label = `FY ${year}`;
      break;
    }
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
      COALESCE(coa.account_code, coa.code) as account_code,
      COALESCE(coa.account_name, coa.name) as account_name,
      COALESCE(SUM(
        CASE 
          WHEN LOWER(coa.account_type) = 'revenue' THEN jel.credit_amount - jel.debit_amount
          ELSE jel.debit_amount - jel.credit_amount
        END
      ), 0) as amount
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id AND jel.tenant_id = $1
    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = $1
      AND je.status = 'posted'
      AND je.entry_date >= $2
      AND je.entry_date <= $3
    WHERE coa.tenant_id = $1
      AND COALESCE(coa.account_code, coa.code) >= $4
      AND COALESCE(coa.account_code, coa.code) < $5
      AND coa.is_active = true
    GROUP BY COALESCE(coa.account_code, coa.code), COALESCE(coa.account_name, coa.name), coa.account_type
    HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 
       OR COALESCE(SUM(jel.credit_amount), 0) != 0
    ORDER BY COALESCE(coa.account_code, coa.code)
  `;

  const result = await pool.query(query, [tenantId, startDate, endDate, codeStart, codeEnd]);
  return result.rows.map((row: any) => ({
    account_code: row.account_code,
    account_name: row.account_name,
    amount: parseFloat(row.amount)
  }));
}

export default IncomeStatementControllerV2;
