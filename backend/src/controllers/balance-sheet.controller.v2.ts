/**
 * Balance Sheet Controller V2 - Tenant-Hardened
 * 
 * Multi-tenant secure balance sheet generation and reporting.
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
  parent_code?: string;
}

interface BalanceSheetSection {
  title: string;
  accounts: AccountBalance[];
  subtotal: number;
}

interface BalanceSheetData {
  as_of_date: string;
  label: string;
  current_assets: BalanceSheetSection;
  non_current_assets: BalanceSheetSection;
  total_assets: number;
  current_liabilities: BalanceSheetSection;
  non_current_liabilities: BalanceSheetSection;
  total_liabilities: number;
  equity: BalanceSheetSection;
  total_equity: number;
  total_liabilities_equity: number;
  is_balanced: boolean;
  variance: number;
}

export class BalanceSheetControllerV2 {
  /**
   * Generate Balance Sheet
   * GET /api/v2/financial/reports/balance-sheet
   */
  static async generateBalanceSheet(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId, entityId } = getTenantContext(req);
      const { as_of_date } = req.query;

      const asOfDate = (as_of_date as string) || new Date().toISOString().split('T')[0];
      const label = `As of ${new Date(asOfDate).toLocaleDateString('en-ZA', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}`;

      // Query all balance sheet accounts with cumulative balances up to as_of_date
      const query = `
        SELECT 
          COALESCE(coa.account_code, coa.code) as account_code,
          COALESCE(coa.account_name, coa.name) as account_name,
          LOWER(coa.account_type) as account_type,
          CASE 
            WHEN LOWER(coa.account_type) = 'asset' 
            THEN COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
            ELSE COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
          END as amount
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
        WHERE jel.tenant_id = $1
          AND je.status = 'posted'
          AND je.entry_date <= $2
          AND LOWER(coa.account_type) IN ('asset', 'liability', 'equity')
        GROUP BY COALESCE(coa.account_code, coa.code), COALESCE(coa.account_name, coa.name), coa.account_type
        HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
        ORDER BY COALESCE(coa.account_code, coa.code)
      `;

      const result = await pool.query(query, [tenantId, asOfDate]);

      // Calculate retained earnings (net income from revenue/expense accounts)
      const retainedEarnings = await calculateRetainedEarnings(tenantId, asOfDate);

      const currentAssets: AccountBalance[] = [];
      const nonCurrentAssets: AccountBalance[] = [];
      const currentLiabilities: AccountBalance[] = [];
      const nonCurrentLiabilities: AccountBalance[] = [];
      const equityAccounts: AccountBalance[] = [];

      for (const row of result.rows) {
        const acct: AccountBalance = {
          account_code: row.account_code || '',
          account_name: row.account_name || '',
          amount: parseFloat(row.amount) || 0
        };

        if (row.account_type === 'asset') {
          if (acct.account_code < '1200') {
            currentAssets.push(acct);
          } else {
            nonCurrentAssets.push(acct);
          }
        } else if (row.account_type === 'liability') {
          if (acct.account_code < '2200') {
            currentLiabilities.push(acct);
          } else {
            nonCurrentLiabilities.push(acct);
          }
        } else if (row.account_type === 'equity') {
          equityAccounts.push(acct);
        }
      }

      // Add current year earnings to equity
      if (Math.abs(retainedEarnings) > 0.01) {
        equityAccounts.push({
          account_code: '',
          account_name: 'Current Year Earnings',
          amount: retainedEarnings
        });
      }

      const currentAssetsTotal = currentAssets.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const nonCurrentAssetsTotal = nonCurrentAssets.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

      const currentLiabTotal = currentLiabilities.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const nonCurrentLiabTotal = nonCurrentLiabilities.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const totalLiabilities = currentLiabTotal + nonCurrentLiabTotal;

      const totalEquity = equityAccounts.reduce((s: number, a: AccountBalance) => s + a.amount, 0);
      const totalLiabilitiesEquity = totalLiabilities + totalEquity;

      const balanceSheetData: BalanceSheetData = {
        as_of_date: asOfDate,
        label,
        current_assets: { title: 'Current Assets', accounts: currentAssets, subtotal: currentAssetsTotal },
        non_current_assets: { title: 'Non-Current Assets', accounts: nonCurrentAssets, subtotal: nonCurrentAssetsTotal },
        total_assets: totalAssets,
        current_liabilities: { title: 'Current Liabilities', accounts: currentLiabilities, subtotal: currentLiabTotal },
        non_current_liabilities: { title: 'Non-Current Liabilities', accounts: nonCurrentLiabilities, subtotal: nonCurrentLiabTotal },
        total_liabilities: totalLiabilities,
        equity: { title: 'Equity', accounts: equityAccounts, subtotal: totalEquity },
        total_equity: totalEquity,
        total_liabilities_equity: totalLiabilitiesEquity,
        is_balanced: Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01,
        variance: totalAssets - totalLiabilitiesEquity
      };

      res.json({
        success: true,
        data: balanceSheetData,
        meta: { generated_at: new Date().toISOString(), tenant_id: tenantId, entity_id: entityId || null }
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[BalanceSheet] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate balance sheet',
        error: error.message
      });
    }
  }

  /**
   * Get trial balance
   * GET /api/v2/financial/reports/trial-balance
   */
  static async getTrialBalance(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { as_of_date } = req.query;

      const asOfDate = (as_of_date as string) || new Date().toISOString().split('T')[0];

      const query = `
        SELECT 
          COALESCE(coa.account_code, coa.code) as account_code,
          COALESCE(coa.account_name, coa.name) as account_name,
          coa.account_type,
          COALESCE(SUM(jel.debit_amount), 0) as total_debits,
          COALESCE(SUM(jel.credit_amount), 0) as total_credits,
          CASE 
            WHEN LOWER(coa.account_type) IN ('asset', 'expense') 
            THEN COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)
            ELSE COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)
          END as balance
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id AND jel.tenant_id = $1
        LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = $1
          AND je.status = 'posted'
          AND je.entry_date <= $2
        WHERE coa.tenant_id = $1
          AND coa.is_active = true
        GROUP BY COALESCE(coa.account_code, coa.code), COALESCE(coa.account_name, coa.name), coa.account_type
        HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 
           OR COALESCE(SUM(jel.credit_amount), 0) != 0
        ORDER BY COALESCE(coa.account_code, coa.code)
      `;

      const result = await pool.query(query, [tenantId, asOfDate]);

      const totalDebits = result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.total_debits), 0);
      const totalCredits = result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.total_credits), 0);

      res.json({
        success: true,
        data: {
          as_of_date: asOfDate,
          accounts: result.rows,
          totals: {
            total_debits: totalDebits,
            total_credits: totalCredits,
            is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
            variance: totalDebits - totalCredits
          }
        }
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[TrialBalance] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate trial balance',
        error: error.message
      });
    }
  }

  /**
   * Export balance sheet to PDF
   * POST /api/v2/financial/reports/balance-sheet/export
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

// Helper: calculate retained earnings (net income for all time up to date)
async function calculateRetainedEarnings(tenantId: string, asOfDate: string): Promise<number> {
  const query = `
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN LOWER(coa.account_type) = 'revenue' 
          THEN jel.credit_amount - jel.debit_amount
          WHEN LOWER(coa.account_type) = 'expense' 
          THEN -(jel.debit_amount - jel.credit_amount)
          ELSE 0
        END
      ), 0) as net_income
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id AND coa.tenant_id = jel.tenant_id
    WHERE jel.tenant_id = $1
      AND je.status = 'posted'
      AND je.entry_date <= $2
      AND LOWER(coa.account_type) IN ('revenue', 'expense')
  `;

  const result = await pool.query(query, [tenantId, asOfDate]);
  return parseFloat(result.rows[0]?.net_income || '0');
}

export default BalanceSheetControllerV2;
