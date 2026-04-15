/**
 * Annual Financial Statements Controller V2
 * 
 * Generates IFRS-for-SMEs compliant financial statements from GL data:
 * - Statement of Financial Position (Balance Sheet)
 * - Statement of Comprehensive Income (Income Statement)
 * - Statement of Changes in Equity
 * - Statement of Cash Flows
 * - Notes to the Financial Statements
 * - Detailed Income Statement
 */

import { Response } from 'express';
import pool from '../config/database';
import { TenantRequest } from '../types';

function getTenantContext(req: TenantRequest): { tenantId: string; entityId?: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) throw new Error('Tenant context required');
  return { tenantId, entityId: req.entity?.id };
}

// ────────────── ACCOUNT MAPPING ──────────────
// Maps GL account codes to AFS presentation line items

interface AccountBalance {
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number; // natural direction: DR-CR for asset/expense, CR-DR for liability/equity/revenue
}

// Fetch all GL balances as at a date
async function getBalancesAsAt(tenantId: string, asAtDate: string): Promise<AccountBalance[]> {
  const result = await pool.query(`
    SELECT 
      coa.account_code,
      coa.account_name,
      coa.account_type,
      COALESCE(SUM(jel.debit_amount), 0) as total_debit,
      COALESCE(SUM(jel.credit_amount), 0) as total_credit
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id AND jel.tenant_id = $1
    LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.tenant_id = $1
      AND LOWER(je.status) = 'posted'
      AND je.journal_date <= $2
    WHERE coa.tenant_id = $1 AND coa.is_active = true
    GROUP BY coa.account_code, coa.account_name, coa.account_type
    HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
    ORDER BY coa.account_code
  `, [tenantId, asAtDate]);

  return result.rows.map(r => {
    const dr = parseFloat(r.total_debit);
    const cr = parseFloat(r.total_credit);
    const isDebitNormal = ['asset', 'expense'].includes(r.account_type?.toLowerCase());
    return {
      account_code: r.account_code,
      account_name: r.account_name,
      account_type: r.account_type,
      debit: dr,
      credit: cr,
      balance: isDebitNormal ? (dr - cr) : (cr - dr),
    };
  });
}

// Fetch income/expense for a period (for Income Statement)
async function getPeriodActivity(tenantId: string, dateFrom: string, dateTo: string): Promise<AccountBalance[]> {
  const result = await pool.query(`
    SELECT 
      coa.account_code,
      coa.account_name,
      coa.account_type,
      COALESCE(SUM(jel.debit_amount), 0) as total_debit,
      COALESCE(SUM(jel.credit_amount), 0) as total_credit
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id AND jel.tenant_id = $1
    LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.tenant_id = $1
      AND LOWER(je.status) = 'posted'
      AND je.journal_date >= $2 AND je.journal_date <= $3
    WHERE coa.tenant_id = $1 AND coa.is_active = true
    GROUP BY coa.account_code, coa.account_name, coa.account_type
    HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
    ORDER BY coa.account_code
  `, [tenantId, dateFrom, dateTo]);

  return result.rows.map(r => {
    const dr = parseFloat(r.total_debit);
    const cr = parseFloat(r.total_credit);
    const isDebitNormal = ['asset', 'expense'].includes(r.account_type?.toLowerCase());
    return {
      account_code: r.account_code,
      account_name: r.account_name,
      account_type: r.account_type,
      debit: dr,
      credit: cr,
      balance: isDebitNormal ? (dr - cr) : (cr - dr),
    };
  });
}

// Helper: sum balances for account code ranges
function sumAccounts(balances: AccountBalance[], predicate: (code: string) => boolean): number {
  return balances
    .filter(b => predicate(b.account_code))
    .reduce((sum, b) => sum + b.balance, 0);
}

function findAccount(balances: AccountBalance[], code: string): AccountBalance | undefined {
  return balances.find(b => b.account_code === code);
}

function accountsInRange(balances: AccountBalance[], from: string, to: string): AccountBalance[] {
  return balances.filter(b => b.account_code >= from && b.account_code <= to);
}

// ────────────── AFS GENERATION ──────────────

export class AnnualFinancialStatementsController {

  /**
   * Generate complete Annual Financial Statements
   * GET /api/v2/financial/afs/generate
   * Query: year (default: 2025)
   */
  static async generate(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const year = parseInt(req.query.year as string) || 2025;
      const priorYear = year - 1;
      
      const periodStart = `${year}-01-01`;
      const periodEnd = `${year}-12-31`;
      const priorEnd = `${priorYear}-12-31`;

      // Fetch data
      const [currentBalances, priorBalances, periodActivity] = await Promise.all([
        getBalancesAsAt(tenantId, periodEnd),
        getBalancesAsAt(tenantId, priorEnd),
        getPeriodActivity(tenantId, periodStart, periodEnd),
      ]);

      // ──────── STATEMENT OF COMPREHENSIVE INCOME ────────
      const incomeStatement = buildIncomeStatement(periodActivity, year);

      // ──────── STATEMENT OF FINANCIAL POSITION ────────
      const balanceSheet = buildBalanceSheet(currentBalances, priorBalances, incomeStatement.lossForTheYear, year, priorYear);

      // ──────── STATEMENT OF CHANGES IN EQUITY ────────
      const equityStatement = buildEquityStatement(priorBalances, incomeStatement.lossForTheYear, year, priorYear);

      // ──────── STATEMENT OF CASH FLOWS ────────
      const cashFlows = buildCashFlows(currentBalances, priorBalances, incomeStatement.lossForTheYear, year);

      // ──────── NOTES ────────
      const notes = buildNotes(currentBalances, priorBalances, periodActivity, year, priorYear);

      // ──────── DETAILED INCOME STATEMENT ────────
      const detailedIS = buildDetailedIS(periodActivity, year);

      // ──────── COMPANY INFO ────────
      const companyInfo = {
        name: 'Koinage Engineering (PTY) LTD',
        registration: '2019/596292/07',
        nature: 'The company provides operational experience in a mining production environment as well as engineering support.',
        director: 'Jonathan Chama (CFA)',
        registered_office: '61 De Klerk, Del Judor Ext1, Witbank, 1034',
        bankers: 'FNB',
        preparer: 'Sbue Golden Business Solutions',
        year_end: `31 December ${year}`,
      };

      res.json({
        success: true,
        data: {
          company: companyInfo,
          year,
          prior_year: priorYear,
          statements: {
            financial_position: balanceSheet,
            comprehensive_income: incomeStatement,
            changes_in_equity: equityStatement,
            cash_flows: cashFlows,
          },
          notes,
          detailed_income_statement: detailedIS,
        }
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      console.error('[AFS] Generate error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate financial statements' });
    }
  }
}

// ──────────────────────────────────────────────────────────
// BUILDER FUNCTIONS
// ──────────────────────────────────────────────────────────

function buildIncomeStatement(activity: AccountBalance[], year: number) {
  // Revenue: 4xxx accounts (credit-normal → positive = revenue)
  const revenue = sumAccounts(activity, c => c >= '4100' && c <= '4199');

  // Cost of Sales: 5xxx accounts (debit-normal → positive = expense)
  const costOfSales = sumAccounts(activity, c => c >= '5000' && c <= '5999');
  const grossProfit = revenue - costOfSales;

  // Distribution costs (delivery, freight out, vehicle costs used for delivery)
  const distributionCosts = sumAccounts(activity, c =>
    c === '6310' || c === '6320' || c === '6330' || c === '6340'
  );

  // Administrative expenses
  const adminExpenses = sumAccounts(activity, c =>
    c === '6550' || c === '6510' || c === '6520' || c === '6530' ||
    c === '6540' || c === '6560' || c === '6570' || c === '6580'
  );

  // Other expenses (everything else in 6xxx not in distribution or admin)
  const allOpex = sumAccounts(activity, c => c >= '6000' && c <= '6999');
  const otherExpenses = allOpex - distributionCosts - adminExpenses;

  // Other income: 4200+ range
  const otherIncome = sumAccounts(activity, c => c >= '4200' && c <= '4999');

  // Finance costs: 6810, 6820
  const financeCosts = sumAccounts(activity, c => c === '6810' || c === '6820');

  const lossFromOperations = grossProfit - distributionCosts - adminExpenses - otherExpenses + otherIncome;
  const lossForTheYear = lossFromOperations - financeCosts;

  return {
    year,
    revenue: round2(revenue),
    cost_of_sales: round2(costOfSales),
    gross_profit: round2(grossProfit),
    distribution_costs: round2(distributionCosts),
    administrative_expenses: round2(adminExpenses),
    other_expenses: round2(otherExpenses),
    other_income: round2(otherIncome),
    finance_costs: round2(financeCosts),
    loss_from_operations: round2(lossFromOperations),
    lossForTheYear: round2(lossForTheYear),
    loss_for_the_year: round2(lossForTheYear),
  };
}

function buildBalanceSheet(
  current: AccountBalance[],
  prior: AccountBalance[],
  currentYearPL: number,
  year: number,
  priorYear: number,
) {
  // ── CURRENT YEAR ──
  // Assets
  const tradeReceivables = sumAccounts(current, c => c === '1210');
  const vatReceivable = sumAccounts(current, c => c === '1230');
  const vatPayable = sumAccounts(current, c => c === '2115');
  const netVAT = vatReceivable - vatPayable; // positive = asset, negative = liability
  const otherReceivables = sumAccounts(current, c => c === '1400' || c === '1420' || c === '1430');
  const inventory = sumAccounts(current, c => c >= '1300' && c <= '1399');
  const ppeCost = sumAccounts(current, c => c >= '1500' && c <= '1599' && !c.endsWith('2') && !c.endsWith('3'));
  const ppeDepr = sumAccounts(current, c => (c.endsWith('2') || c.endsWith('3')) && c >= '1500' && c <= '1599');
  const ppeNet = ppeCost - ppeDepr;

  // Cash: bank accounts can be positive (asset) or negative (overdraft/liability)
  const cashRaw = sumAccounts(current, c => c >= '1110' && c <= '1119');
  const cashAsset = cashRaw > 0 ? cashRaw : 0;
  const bankOverdraft = cashRaw < 0 ? Math.abs(cashRaw) : 0;

  const totalCurrentAssets = tradeReceivables + (netVAT > 0 ? netVAT : 0) + otherReceivables + inventory + cashAsset;
  const totalNonCurrentAssets = ppeNet;
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  // Equity
  const retainedEarnings = sumAccounts(current, c => c === '3200');
  const shareCapital = sumAccounts(current, c => c === '3100');
  const accumulatedPL = retainedEarnings + currentYearPL;
  const totalEquity = shareCapital + accumulatedPL;

  // Liabilities
  const tradePayables = sumAccounts(current, c => c === '2111');
  const payrollLiabilities = sumAccounts(current, c => c >= '2210' && c <= '2250');
  const otherCurrentLiabilities = sumAccounts(current, c => c >= '2310' && c <= '2330');
  const shareholdersLoan = sumAccounts(current, c => c === '2530');
  const bankLoans = sumAccounts(current, c => c === '2510');
  const vehicleFinance = sumAccounts(current, c => c === '2520');

  const totalCurrentLiabilities = tradePayables + bankOverdraft +
    (netVAT < 0 ? Math.abs(netVAT) : 0) + payrollLiabilities + otherCurrentLiabilities;
  const totalNonCurrentLiabilities = shareholdersLoan + bankLoans + vehicleFinance;
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
  const totalEquityAndLiabilities = totalEquity + totalLiabilities;

  // ── PRIOR YEAR (same calculation) ──
  const priorTradeRec = sumAccounts(prior, c => c === '1210');
  const priorVatRec = sumAccounts(prior, c => c === '1230');
  const priorVatPay = sumAccounts(prior, c => c === '2115');
  const priorNetVAT = priorVatRec - priorVatPay;
  const priorOtherRec = sumAccounts(prior, c => c === '1400' || c === '1420' || c === '1430');
  const priorCashRaw = sumAccounts(prior, c => c >= '1110' && c <= '1119');
  const priorCashAsset = priorCashRaw > 0 ? priorCashRaw : 0;
  const priorBankOverdraft = priorCashRaw < 0 ? Math.abs(priorCashRaw) : 0;
  const priorTradePayables = sumAccounts(prior, c => c === '2111');
  const priorShareholdersLoan = sumAccounts(prior, c => c === '2530');
  const priorRetainedEarnings = sumAccounts(prior, c => c === '3200');
  const priorShareCapital = sumAccounts(prior, c => c === '3100');
  const priorTotalEquity = priorShareCapital + priorRetainedEarnings;
  const priorCurrentLiab = priorTradePayables + priorBankOverdraft + (priorNetVAT < 0 ? Math.abs(priorNetVAT) : 0);
  const priorNonCurrentLiab = priorShareholdersLoan + sumAccounts(prior, c => c === '2510' || c === '2520');
  const priorTotalLiab = priorCurrentLiab + priorNonCurrentLiab;
  const priorTotalAssets = priorTradeRec + (priorNetVAT > 0 ? priorNetVAT : 0) + priorOtherRec + priorCashAsset;

  return {
    year, prior_year: priorYear,
    current: {
      assets: {
        non_current: { ppe: round2(ppeNet), total: round2(totalNonCurrentAssets) },
        current: {
          trade_receivables: round2(tradeReceivables),
          vat_receivable: round2(netVAT > 0 ? netVAT : 0),
          other_receivables: round2(otherReceivables),
          inventory: round2(inventory),
          cash: round2(cashAsset),
          total: round2(totalCurrentAssets),
        },
        total: round2(totalAssets),
      },
      equity: {
        share_capital: round2(shareCapital),
        accumulated_loss: round2(accumulatedPL),
        total: round2(totalEquity),
      },
      liabilities: {
        non_current: {
          shareholders_loan: round2(shareholdersLoan),
          bank_loans: round2(bankLoans),
          vehicle_finance: round2(vehicleFinance),
          total: round2(totalNonCurrentLiabilities),
        },
        current: {
          trade_payables: round2(tradePayables),
          vat_payable: round2(netVAT < 0 ? Math.abs(netVAT) : 0),
          bank_overdraft: round2(bankOverdraft),
          payroll_liabilities: round2(payrollLiabilities),
          other: round2(otherCurrentLiabilities),
          total: round2(totalCurrentLiabilities),
        },
        total: round2(totalLiabilities),
      },
      total_equity_and_liabilities: round2(totalEquityAndLiabilities),
    },
    prior: {
      assets: { total: round2(priorTotalAssets) },
      equity: { total: round2(priorTotalEquity) },
      liabilities: {
        non_current: { shareholders_loan: round2(priorShareholdersLoan), total: round2(priorNonCurrentLiab) },
        current: { trade_payables: round2(priorTradePayables), bank_overdraft: round2(priorBankOverdraft), total: round2(priorCurrentLiab) },
        total: round2(priorTotalLiab),
      },
      total_equity_and_liabilities: round2(priorTotalEquity + priorTotalLiab),
    },
  };
}

function buildEquityStatement(
  priorBalances: AccountBalance[],
  currentYearPL: number,
  year: number,
  priorYear: number,
) {
  const openingRetained = sumAccounts(priorBalances, c => c === '3200');
  const openingShareCapital = sumAccounts(priorBalances, c => c === '3100');
  const closingRetained = openingRetained + currentYearPL;

  return {
    year,
    share_capital: { opening: round2(openingShareCapital), changes: 0, closing: round2(openingShareCapital) },
    retained_earnings: {
      opening: round2(openingRetained),
      profit_loss: round2(currentYearPL),
      dividends: 0,
      closing: round2(closingRetained),
    },
    total: {
      opening: round2(openingShareCapital + openingRetained),
      profit_loss: round2(currentYearPL),
      dividends: 0,
      closing: round2(openingShareCapital + closingRetained),
    },
  };
}

function buildCashFlows(
  current: AccountBalance[],
  prior: AccountBalance[],
  profitLoss: number,
  year: number,
) {
  // Operating activities (indirect method)
  const curTradeRec = sumAccounts(current, c => c === '1210');
  const priTradeRec = sumAccounts(prior, c => c === '1210');
  const changeTradeRec = -(curTradeRec - priTradeRec); // increase in receivables = cash outflow

  const curVAT = sumAccounts(current, c => c === '1230') - sumAccounts(current, c => c === '2115');
  const priVAT = sumAccounts(prior, c => c === '1230') - sumAccounts(prior, c => c === '2115');
  const changeVAT = -(curVAT - priVAT);

  const curOtherRec = sumAccounts(current, c => c === '1400' || c === '1420' || c === '1430');
  const priOtherRec = sumAccounts(prior, c => c === '1400' || c === '1420' || c === '1430');
  const changeOtherRec = -(curOtherRec - priOtherRec);

  const curTradePayables = sumAccounts(current, c => c === '2111');
  const priTradePayables = sumAccounts(prior, c => c === '2111');
  const changeTradePayables = curTradePayables - priTradePayables; // increase in payables = cash inflow

  const curOtherPayables = sumAccounts(current, c => c >= '2310' && c <= '2330');
  const priOtherPayables = sumAccounts(prior, c => c >= '2310' && c <= '2330');
  const changeOtherPayables = curOtherPayables - priOtherPayables;

  const totalAdjustments = changeTradeRec + changeVAT + changeOtherRec + changeTradePayables + changeOtherPayables;
  const netCashOperations = profitLoss + totalAdjustments;

  // Investing activities
  const curPPE = sumAccounts(current, c => c >= '1500' && c <= '1599');
  const priPPE = sumAccounts(prior, c => c >= '1500' && c <= '1599');
  const ppeAdditions = -(curPPE - priPPE);

  // Financing activities
  const curLoans = sumAccounts(current, c => c === '2530' || c === '2510');
  const priLoans = sumAccounts(prior, c => c === '2530' || c === '2510');
  const loanProceeds = curLoans - priLoans;

  const curVehicleFin = sumAccounts(current, c => c === '2520');
  const priVehicleFin = sumAccounts(prior, c => c === '2520');
  const vehicleFinChange = curVehicleFin - priVehicleFin;

  const netFinancing = loanProceeds + vehicleFinChange;

  const netChange = netCashOperations + ppeAdditions + netFinancing;

  const priorCash = sumAccounts(prior, c => c >= '1110' && c <= '1119');
  const closingCash = sumAccounts(current, c => c >= '1110' && c <= '1119');

  return {
    year,
    operating: {
      profit_loss: round2(profitLoss),
      adjustments: {
        change_trade_receivables: round2(changeTradeRec),
        change_vat: round2(changeVAT),
        change_other_receivables: round2(changeOtherRec),
        change_trade_payables: round2(changeTradePayables),
        change_other_payables: round2(changeOtherPayables),
        total: round2(totalAdjustments),
      },
      net: round2(netCashOperations),
    },
    investing: {
      ppe_additions: round2(ppeAdditions),
      net: round2(ppeAdditions),
    },
    financing: {
      loan_proceeds: round2(loanProceeds),
      vehicle_finance: round2(vehicleFinChange),
      net: round2(netFinancing),
    },
    net_change: round2(netChange),
    opening_cash: round2(priorCash),
    closing_cash: round2(closingCash),
  };
}

function buildNotes(
  current: AccountBalance[],
  prior: AccountBalance[],
  activity: AccountBalance[],
  year: number,
  priorYear: number,
) {
  // Note 4: Trade and other receivables
  const tradeRec = findAccount(current, '1210');
  const vatInput = findAccount(current, '1230');
  const otherRec = sumAccounts(current, c => c === '1400' || c === '1420' || c === '1430');

  // Note 5: Cash and cash equivalents
  const cashAccounts = accountsInRange(current, '1110', '1119');

  // Note 6: Shareholders Loan
  const shLoan = findAccount(current, '2530');

  // Note 7: Revenue
  const salesRevenue = findAccount(activity, '4100');
  const salesProducts = findAccount(activity, '4110');
  const salesServices = findAccount(activity, '4120');

  // Note 8: Cost of sales breakdown
  const directCosts = findAccount(activity, '5100');
  const materials = findAccount(activity, '5110');
  const subcontractors = findAccount(activity, '5140');
  const freight = findAccount(activity, '5150');

  // Note 9: Administrative expenses breakdown
  const adminAccounts = ['6510', '6520', '6530', '6540', '6550', '6560', '6570', '6580'];
  const adminItems = adminAccounts
    .map(code => findAccount(activity, code))
    .filter(a => a && a.balance !== 0) as AccountBalance[];

  // Note 10: Other expenses breakdown
  const otherExpenseAccounts = ['6210', '6220', '6230', '6240', '6250', '6260', '6700', '6710', '6720', '6730', '6740'];
  const otherExpenseItems = otherExpenseAccounts
    .map(code => findAccount(activity, code))
    .filter(a => a && a.balance !== 0) as AccountBalance[];

  return {
    note_4_receivables: {
      trade_receivables: round2(tradeRec?.balance || 0),
      vat_receivable: round2(vatInput?.balance || 0),
      other_receivables: round2(otherRec),
      total: round2((tradeRec?.balance || 0) + (vatInput?.balance || 0) + otherRec),
    },
    note_5_cash: {
      accounts: cashAccounts.map(a => ({ name: a.account_name, balance: round2(a.balance) })),
      total: round2(sumAccounts(current, c => c >= '1110' && c <= '1119')),
    },
    note_6_shareholders_loan: round2(shLoan?.balance || 0),
    note_7_revenue: {
      total: round2((salesRevenue?.balance || 0) + (salesProducts?.balance || 0) + (salesServices?.balance || 0)),
      breakdown: [
        salesRevenue && salesRevenue.balance ? { name: 'Revenue - General', amount: round2(salesRevenue.balance) } : null,
        salesProducts && salesProducts.balance ? { name: 'Sales - Products', amount: round2(salesProducts.balance) } : null,
        salesServices && salesServices.balance ? { name: 'Sales - Services', amount: round2(salesServices.balance) } : null,
      ].filter(Boolean),
    },
    note_8_cost_of_sales: {
      total: round2(sumAccounts(activity, c => c >= '5000' && c <= '5999')),
      breakdown: [
        directCosts && directCosts.balance ? { name: 'Direct Costs', amount: round2(directCosts.balance) } : null,
        materials && materials.balance ? { name: 'Purchases - Materials', amount: round2(materials.balance) } : null,
        subcontractors && subcontractors.balance ? { name: 'Subcontractors', amount: round2(subcontractors.balance) } : null,
        freight && freight.balance ? { name: 'Freight Inwards', amount: round2(freight.balance) } : null,
      ].filter(Boolean),
    },
    note_9_admin_expenses: {
      total: round2(adminItems.reduce((s, a) => s + a.balance, 0)),
      breakdown: adminItems.map(a => ({ name: a.account_name, amount: round2(a.balance) })),
    },
    note_10_other_expenses: {
      total: round2(otherExpenseItems.reduce((s, a) => s + a.balance, 0)),
      breakdown: otherExpenseItems.map(a => ({ name: a.account_name, amount: round2(a.balance) })),
    },
  };
}

function buildDetailedIS(activity: AccountBalance[], year: number) {
  // All revenue accounts with detail
  const revenueAccounts = activity.filter(a => a.account_code >= '4000' && a.account_code <= '4999' && a.balance !== 0);
  const cosAccounts = activity.filter(a => a.account_code >= '5000' && a.account_code <= '5999' && a.balance !== 0);
  const opexAccounts = activity.filter(a => a.account_code >= '6000' && a.account_code <= '6999' && a.balance !== 0);

  const totalRevenue = revenueAccounts.reduce((s, a) => s + a.balance, 0);
  const totalCOS = cosAccounts.reduce((s, a) => s + a.balance, 0);
  const totalOpex = opexAccounts.reduce((s, a) => s + a.balance, 0);

  return {
    year,
    revenue: {
      items: revenueAccounts.map(a => ({ code: a.account_code, name: a.account_name, amount: round2(a.balance) })),
      total: round2(totalRevenue),
    },
    cost_of_sales: {
      items: cosAccounts.map(a => ({ code: a.account_code, name: a.account_name, amount: round2(a.balance) })),
      total: round2(totalCOS),
    },
    gross_profit: round2(totalRevenue - totalCOS),
    operating_expenses: {
      items: opexAccounts.map(a => ({ code: a.account_code, name: a.account_name, amount: round2(a.balance) })),
      total: round2(totalOpex),
    },
    loss_for_the_year: round2(totalRevenue - totalCOS - totalOpex),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default AnnualFinancialStatementsController;
