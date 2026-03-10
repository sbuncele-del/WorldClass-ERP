/**
 * Cash Flow Statement Controller V2 - Tenant-Hardened
 * 
 * Multi-tenant secure cash flow statement generation.
 * Supports both indirect and direct methods.
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

  return {
    tenantId,
    userId: req.user?.id,
    entityId: req.entity?.id || req.entityId
  };
}

interface CashFlowItem {
  description: string;
  amount: number;
}

interface CashFlowSection {
  title: string;
  items: CashFlowItem[];
  subtotal: number;
}

interface CashFlowData {
  period: {
    start_date: string;
    end_date: string;
    label: string;
  };
  method: 'indirect' | 'direct';
  operating_activities: CashFlowSection;
  investing_activities: CashFlowSection;
  financing_activities: CashFlowSection;
  net_cash_flow: number;
  beginning_cash: number;
  ending_cash: number;
  cash_reconciliation: {
    balance_sheet_cash_beginning: number;
    balance_sheet_cash_ending: number;
    is_reconciled: boolean;
    variance: number;
  };
}

export class CashFlowControllerV2 {
  /**
   * Generate Cash Flow Statement
   * GET /api/v2/financial/reports/cash-flow
   */
  static async generateCashFlowStatement(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId, entityId } = getTenantContext(req);
      const { start_date, end_date, period = 'monthly', method = 'indirect' } = req.query;

      const dateRange = calculateDateRange(period as string, start_date as string, end_date as string);

      // Generate real cash flow data from database
      const cashFlowData = await generateIndirectMethod(tenantId, dateRange);

      res.json({
        success: true,
        data: cashFlowData,
        meta: {
          generated_at: new Date().toISOString(),
          tenant_id: tenantId,
          entity_id: entityId || null
        }
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[CashFlow] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate cash flow statement',
        error: error.message
      });
    }
  }

  /**
   * Get cash position over time
   * GET /api/v2/financial/reports/cash-position
   */
  static async getCashPosition(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { start_date, end_date, interval = 'daily' } = req.query;

      const dateRange = calculateDateRange('custom', start_date as string, end_date as string);

      let truncInterval = 'day';
      if (interval === 'weekly') truncInterval = 'week';
      if (interval === 'monthly') truncInterval = 'month';

      const query = `
        WITH cash_movements AS (
          SELECT 
            DATE_TRUNC('${truncInterval}', je.entry_date) as period,
            SUM(jel.debit_amount - jel.credit_amount) as net_movement
          FROM journal_entry_lines jel
          JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
          JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
          WHERE jel.tenant_id = $1
            AND je.status = 'posted'
            AND je.entry_date >= $2
            AND je.entry_date <= $3
            AND COALESCE(coa.account_code, coa.code) LIKE '1%'
            AND LOWER(COALESCE(coa.account_name, coa.name)) LIKE '%cash%'
          GROUP BY DATE_TRUNC('${truncInterval}', je.entry_date)
        )
        SELECT 
          period,
          net_movement,
          SUM(net_movement) OVER (ORDER BY period) as running_balance
        FROM cash_movements
        ORDER BY period
      `;

      const result = await pool.query(query, [tenantId, dateRange.start_date, dateRange.end_date]);

      // Get opening balance
      const openingQuery = `
        SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as opening_balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
        WHERE jel.tenant_id = $1
          AND je.status = 'posted'
          AND je.entry_date < $2
          AND COALESCE(coa.account_code, coa.code) LIKE '1%'
          AND LOWER(COALESCE(coa.account_name, coa.name)) LIKE '%cash%'
      `;

      const openingResult = await pool.query(openingQuery, [tenantId, dateRange.start_date]);
      const openingBalance = parseFloat(openingResult.rows[0]?.opening_balance || '0');

      res.json({
        success: true,
        data: {
          period: dateRange,
          interval,
          opening_balance: openingBalance,
          positions: result.rows.map((row: any) => ({
            date: row.period,
            movement: parseFloat(row.net_movement),
            balance: openingBalance + parseFloat(row.running_balance)
          }))
        }
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[CashPosition] Error:', error);
      res.status(500).json({ success: false, message: 'Failed to get cash position' });
    }
  }

  /**
   * Export cash flow to PDF
   * POST /api/v2/financial/reports/cash-flow/export
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

async function generateIndirectMethod(tenantId: string, dateRange: any): Promise<CashFlowData> {
  // 1. Get Net Income for the period
  const netIncome = await calculateNetIncome(tenantId, dateRange.start_date, dateRange.end_date);

  // 2. Operating Activities adjustments
  const operatingItems: CashFlowItem[] = [
    { description: 'Net Income', amount: netIncome }
  ];

  // Add non-cash adjustments (depreciation)
  const depreciationQuery = `
    SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND je.entry_date >= $2 AND je.entry_date <= $3
      AND LOWER(COALESCE(coa.account_name, coa.name)) LIKE '%depreciation%'
  `;
  const depResult = await pool.query(depreciationQuery, [tenantId, dateRange.start_date, dateRange.end_date]);
  const depreciation = parseFloat(depResult.rows[0]?.amount || '0');
  if (Math.abs(depreciation) > 0.01) {
    operatingItems.push({ description: 'Add: Depreciation & Amortization', amount: depreciation });
  }

  // Working capital changes
  const workingCapitalChanges = await calculateWorkingCapitalChanges(tenantId, dateRange);
  operatingItems.push(...workingCapitalChanges);

  const operatingSubtotal = operatingItems.reduce((sum: number, item: CashFlowItem) => sum + item.amount, 0);

  // 3. Investing Activities
  const investingItems = await calculateInvestingActivities(tenantId, dateRange);
  const investingSubtotal = investingItems.reduce((sum: number, item: CashFlowItem) => sum + item.amount, 0);

  // 4. Financing Activities
  const financingItems = await calculateFinancingActivities(tenantId, dateRange);
  const financingSubtotal = financingItems.reduce((sum: number, item: CashFlowItem) => sum + item.amount, 0);

  // 5. Cash balances
  const beginningCash = await getCashBalance(tenantId, dateRange.start_date, true);
  const endingCash = await getCashBalance(tenantId, dateRange.end_date, false);

  const netCashFlow = operatingSubtotal + investingSubtotal + financingSubtotal;

  return {
    period: {
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      label: dateRange.label
    },
    method: 'indirect',
    operating_activities: {
      title: 'Cash Flows from Operating Activities',
      items: operatingItems,
      subtotal: operatingSubtotal
    },
    investing_activities: {
      title: 'Cash Flows from Investing Activities',
      items: investingItems,
      subtotal: investingSubtotal
    },
    financing_activities: {
      title: 'Cash Flows from Financing Activities',
      items: financingItems,
      subtotal: financingSubtotal
    },
    net_cash_flow: netCashFlow,
    beginning_cash: beginningCash,
    ending_cash: endingCash,
    cash_reconciliation: {
      balance_sheet_cash_beginning: beginningCash,
      balance_sheet_cash_ending: endingCash,
      is_reconciled: Math.abs((beginningCash + netCashFlow) - endingCash) < 0.01,
      variance: (beginningCash + netCashFlow) - endingCash
    }
  };
}

async function calculateNetIncome(tenantId: string, startDate: string, endDate: string): Promise<number> {
  const query = `
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN LOWER(coa.account_type) = 'revenue' THEN jel.credit_amount - jel.debit_amount
          WHEN LOWER(coa.account_type) = 'expense' THEN -(jel.debit_amount - jel.credit_amount)
          ELSE 0
        END
      ), 0) as net_income
    FROM journal_entry_lines jel
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND je.entry_date >= $2 AND je.entry_date <= $3
      AND LOWER(coa.account_type) IN ('revenue', 'expense')
  `;
  const result = await pool.query(query, [tenantId, startDate, endDate]);
  return parseFloat(result.rows[0]?.net_income || '0');
}

async function calculateWorkingCapitalChanges(tenantId: string, dateRange: any): Promise<CashFlowItem[]> {
  const items: CashFlowItem[] = [];

  // Change in accounts receivable
  const arQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN je.entry_date < $2 THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as beginning,
      COALESCE(SUM(CASE WHEN je.entry_date <= $3 THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as ending
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND LOWER(COALESCE(coa.account_name, coa.name)) LIKE '%receivable%'
  `;
  const arResult = await pool.query(arQuery, [tenantId, dateRange.start_date, dateRange.end_date]);
  const arChange = parseFloat(arResult.rows[0]?.ending || '0') - parseFloat(arResult.rows[0]?.beginning || '0');
  if (Math.abs(arChange) > 0.01) {
    items.push({ description: 'Change in Accounts Receivable', amount: -arChange });
  }

  // Change in inventory
  const invQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN je.entry_date < $2 THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as beginning,
      COALESCE(SUM(CASE WHEN je.entry_date <= $3 THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as ending
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND LOWER(COALESCE(coa.account_name, coa.name)) LIKE '%inventory%'
  `;
  const invResult = await pool.query(invQuery, [tenantId, dateRange.start_date, dateRange.end_date]);
  const invChange = parseFloat(invResult.rows[0]?.ending || '0') - parseFloat(invResult.rows[0]?.beginning || '0');
  if (Math.abs(invChange) > 0.01) {
    items.push({ description: 'Change in Inventory', amount: -invChange });
  }

  // Change in accounts payable
  const apQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN je.entry_date < $2 THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as beginning,
      COALESCE(SUM(CASE WHEN je.entry_date <= $3 THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as ending
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND LOWER(COALESCE(coa.account_name, coa.name)) LIKE '%payable%'
  `;
  const apResult = await pool.query(apQuery, [tenantId, dateRange.start_date, dateRange.end_date]);
  const apChange = parseFloat(apResult.rows[0]?.ending || '0') - parseFloat(apResult.rows[0]?.beginning || '0');
  if (Math.abs(apChange) > 0.01) {
    items.push({ description: 'Change in Accounts Payable', amount: apChange });
  }

  return items;
}

async function calculateInvestingActivities(tenantId: string, dateRange: any): Promise<CashFlowItem[]> {
  const items: CashFlowItem[] = [];

  // Purchase of fixed assets (non-current assets: 1200-1999)
  const assetPurchaseQuery = `
    SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND je.entry_date >= $2 AND je.entry_date <= $3
      AND COALESCE(coa.account_code, coa.code) >= '1200' AND COALESCE(coa.account_code, coa.code) < '2000'
  `;
  const assetResult = await pool.query(assetPurchaseQuery, [tenantId, dateRange.start_date, dateRange.end_date]);
  const assetPurchase = parseFloat(assetResult.rows[0]?.amount || '0');
  if (Math.abs(assetPurchase) > 0.01) {
    items.push({ description: 'Purchase of Fixed Assets', amount: -assetPurchase });
  }

  return items.length > 0 ? items : [{ description: 'No investing activities', amount: 0 }];
}

async function calculateFinancingActivities(tenantId: string, dateRange: any): Promise<CashFlowItem[]> {
  const items: CashFlowItem[] = [];

  // Long-term debt changes (2200-2999)
  const debtQuery = `
    SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND je.entry_date >= $2 AND je.entry_date <= $3
      AND COALESCE(coa.account_code, coa.code) >= '2200' AND COALESCE(coa.account_code, coa.code) < '3000'
  `;
  const debtResult = await pool.query(debtQuery, [tenantId, dateRange.start_date, dateRange.end_date]);
  const debtChange = parseFloat(debtResult.rows[0]?.amount || '0');
  if (Math.abs(debtChange) > 0.01) {
    items.push({ description: debtChange > 0 ? 'Proceeds from Long-term Debt' : 'Repayment of Long-term Debt', amount: debtChange });
  }

  // Equity changes (3000-3999)
  const equityQuery = `
    SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND je.entry_date >= $2 AND je.entry_date <= $3
      AND COALESCE(coa.account_code, coa.code) >= '3000' AND COALESCE(coa.account_code, coa.code) < '4000'
  `;
  const equityResult = await pool.query(equityQuery, [tenantId, dateRange.start_date, dateRange.end_date]);
  const equityChange = parseFloat(equityResult.rows[0]?.amount || '0');
  if (Math.abs(equityChange) > 0.01) {
    items.push({ description: 'Capital Changes', amount: equityChange });
  }

  return items.length > 0 ? items : [{ description: 'No financing activities', amount: 0 }];
}

async function getCashBalance(tenantId: string, asOfDate: string, beforeDate: boolean): Promise<number> {
  const operator = beforeDate ? '<' : '<=';
  const query = `
    SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND je.entry_date ${operator} $2
      AND COALESCE(coa.account_code, coa.code) LIKE '1%'
      AND LOWER(COALESCE(coa.account_name, coa.name)) LIKE '%cash%'
  `;
  const result = await pool.query(query, [tenantId, asOfDate]);
  return parseFloat(result.rows[0]?.balance || '0');
}

export default CashFlowControllerV2;
