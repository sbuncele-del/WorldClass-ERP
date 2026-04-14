/**
 * Siyabusa Financial Reporting Platform - Statement Generator Service
 * Renders financial statements from linked trial balance data
 * 
 * This is the core engine that transforms raw account balances into
 * IFRS-compliant financial statement output, analogous to what Draftworx
 * and CaseWare produce but with a modern, API-driven approach.
 */

import pool from '../../../config/database';
import {
  StatementOfFinancialPosition,
  StatementOfComprehensiveIncome,
  StatementOfChangesInEquity,
  StatementOfCashFlows,
  FinancialStatementSection,
  StatementLineItem,
  SociPresentation,
  CashFlowMethod,
} from '../types';

interface EngagementContext {
  id: string;
  tenant_id: string;
  entity_name: string;
  registration_number?: string;
  financial_year_start: string;
  financial_year_end: string;
  comparative_year_start?: string;
  comparative_year_end?: string;
  reporting_framework: string;
  currency: string;
  soci_presentation: SociPresentation;
  cash_flow_method: CashFlowMethod;
}

interface LinkedBalance {
  link_number: string;
  link_description: string;
  statement: string;
  section: string;
  line_item: string;
  normal_balance: string;
  sign_convention: number;
  sort_order: number;
  indent_level: number;
  is_subtotal: boolean;
  is_total: boolean;
  parent_link: string | null;
  current_amount: number;
  prior_amount: number;
  note_number: number | null;
}

export class StatementGeneratorService {
  /**
   * Generate Statement of Financial Position (Balance Sheet)
   */
  static async generateSoFP(tenantId: string, engagementId: string): Promise<StatementOfFinancialPosition> {
    const ctx = await this.getContext(tenantId, engagementId);
    const balances = await this.getLinkedBalances(tenantId, engagementId, 'sofp');

    const nonCurrentAssets = this.buildSection('Non-current assets', balances, 'non_current_assets');
    const currentAssets = this.buildSection('Current assets', balances, 'current_assets');

    const totalAssets = (nonCurrentAssets.subtotal || 0) + (currentAssets.subtotal || 0);
    const priorTotalAssets = (nonCurrentAssets.prior_subtotal || 0) + (currentAssets.prior_subtotal || 0);

    const equity = this.buildSection('Equity', balances, 'equity');
    const nonCurrentLiabilities = this.buildSection('Non-current liabilities', balances, 'non_current_liabilities');
    const currentLiabilities = this.buildSection('Current liabilities', balances, 'current_liabilities');

    const totalEquityAndLiabilities =
      (equity.subtotal || 0) + (nonCurrentLiabilities.subtotal || 0) + (currentLiabilities.subtotal || 0);
    const priorTotalEquityAndLiabilities =
      (equity.prior_subtotal || 0) + (nonCurrentLiabilities.prior_subtotal || 0) + (currentLiabilities.prior_subtotal || 0);

    return {
      entity_name: ctx.entity_name,
      registration_number: ctx.registration_number,
      period_end: ctx.financial_year_end,
      framework: ctx.reporting_framework,
      currency: ctx.currency,
      non_current_assets: nonCurrentAssets,
      current_assets: currentAssets,
      total_assets: totalAssets,
      prior_total_assets: priorTotalAssets,
      equity,
      non_current_liabilities: nonCurrentLiabilities,
      current_liabilities: currentLiabilities,
      total_equity_and_liabilities: totalEquityAndLiabilities,
      prior_total_equity_and_liabilities: priorTotalEquityAndLiabilities,
    };
  }

  /**
   * Generate Statement of Comprehensive Income (Income Statement)
   */
  static async generateSoCI(tenantId: string, engagementId: string): Promise<StatementOfComprehensiveIncome> {
    const ctx = await this.getContext(tenantId, engagementId);
    const balances = await this.getLinkedBalances(tenantId, engagementId, 'soci');

    const revenue = this.buildSection('Revenue', balances, 'revenue');
    const costOfSales = this.buildSection('Cost of sales', balances, 'cost_of_sales');

    const grossProfit = (revenue.subtotal || 0) - Math.abs(costOfSales.subtotal || 0);
    const priorGrossProfit = (revenue.prior_subtotal || 0) - Math.abs(costOfSales.prior_subtotal || 0);

    const operatingExpenses = this.buildSection('Operating expenses', balances, 'expenses');
    // Include other income if any
    const otherIncome = this.buildSection('Other income', balances, 'other_income');

    const operatingProfit = grossProfit - Math.abs(operatingExpenses.subtotal || 0) + (otherIncome.subtotal || 0);
    const priorOperatingProfit = priorGrossProfit - Math.abs(operatingExpenses.prior_subtotal || 0) + (otherIncome.prior_subtotal || 0);

    const financeSection = this.buildSection('Finance', balances, 'finance_costs');

    const profitBeforeTax = operatingProfit + (financeSection.subtotal || 0);
    const priorProfitBeforeTax = priorOperatingProfit + (financeSection.prior_subtotal || 0);

    const taxation = this.buildSection('Income tax expense', balances, 'taxation');

    const profitForYear = profitBeforeTax - Math.abs(taxation.subtotal || 0);
    const priorProfitForYear = priorProfitBeforeTax - Math.abs(taxation.prior_subtotal || 0);

    return {
      entity_name: ctx.entity_name,
      registration_number: ctx.registration_number,
      period_start: ctx.financial_year_start,
      period_end: ctx.financial_year_end,
      framework: ctx.reporting_framework,
      currency: ctx.currency,
      presentation: ctx.soci_presentation,
      revenue,
      cost_of_sales: costOfSales,
      gross_profit: grossProfit,
      prior_gross_profit: priorGrossProfit,
      operating_expenses: operatingExpenses,
      operating_profit: operatingProfit,
      prior_operating_profit: priorOperatingProfit,
      finance_section: financeSection,
      profit_before_tax: profitBeforeTax,
      prior_profit_before_tax: priorProfitBeforeTax,
      taxation,
      profit_for_year: profitForYear,
      prior_profit_for_year: priorProfitForYear,
      total_comprehensive_income: profitForYear,
      prior_total_comprehensive_income: priorProfitForYear,
    };
  }

  /**
   * Generate Statement of Changes in Equity
   */
  static async generateSoCE(tenantId: string, engagementId: string): Promise<StatementOfChangesInEquity> {
    const ctx = await this.getContext(tenantId, engagementId);
    
    // Get equity balances
    const equityBalances = await this.getLinkedBalances(tenantId, engagementId, 'sofp');
    const equityItems = equityBalances.filter(b => b.section === 'equity');

    // Get profit for the year from SoCI
    const soci = await this.generateSoCI(tenantId, engagementId);

    // Build columns dynamically from equity components
    const columns = ['Share capital', 'Retained income', 'Total'];
    const shareCapital = equityItems.find(i => i.link_number === 'eq.100.000');
    const retainedIncome = equityItems.find(i => i.link_number === 'eq.300.000');

    const openingShareCapital = shareCapital?.prior_amount || 0;
    const openingRetained = retainedIncome?.prior_amount || 0;

    const rows = [
      {
        label: `Balance at ${ctx.comparative_year_end || 'beginning of year'}`,
        values: [openingShareCapital, openingRetained, openingShareCapital + openingRetained],
        is_bold: true,
        is_total: false,
      },
      {
        label: 'Profit for the year',
        values: [0, soci.profit_for_year, soci.profit_for_year],
        is_bold: false,
        is_total: false,
      },
      {
        label: 'Total comprehensive income for the year',
        values: [0, soci.total_comprehensive_income, soci.total_comprehensive_income],
        is_bold: false,
        is_total: false,
      },
      {
        label: `Balance at ${ctx.financial_year_end}`,
        values: [
          shareCapital?.current_amount || 0,
          retainedIncome?.current_amount || 0,
          (shareCapital?.current_amount || 0) + (retainedIncome?.current_amount || 0),
        ],
        is_bold: true,
        is_total: true,
      },
    ];

    return {
      entity_name: ctx.entity_name,
      period_start: ctx.financial_year_start,
      period_end: ctx.financial_year_end,
      columns,
      rows,
    };
  }

  /**
   * Generate Statement of Cash Flows (Indirect method)
   */
  static async generateSCF(tenantId: string, engagementId: string): Promise<StatementOfCashFlows> {
    const ctx = await this.getContext(tenantId, engagementId);
    const soci = await this.generateSoCI(tenantId, engagementId);
    const sofp = await this.generateSoFP(tenantId, engagementId);

    // Indirect method: start with profit, adjust for non-cash items and working capital changes
    const operatingItems: StatementLineItem[] = [
      this.makeLine('Profit for the year', soci.profit_for_year, soci.prior_profit_for_year, 0, true),
      this.makeLine('Adjustments to reconcile profit', 0, 0, 0, true, false, true),
    ];

    // Add tax expense back
    const taxAmount = Math.abs(soci.taxation.subtotal || 0);
    if (taxAmount > 0) {
      operatingItems.push(this.makeLine('Adjustments for income tax expense', taxAmount, undefined, 1));
    }

    // Working capital changes (difference in BS items between years)
    for (const item of sofp.current_assets.items) {
      if (item.link_numbers.includes('c.840.001') || item.link_numbers.includes('cl.600.000')) continue;
      const change = (item.current_year || 0) - (item.prior_year || 0);
      if (Math.abs(change) > 0.01) {
        const direction = change > 0 ? 'increase' : 'decrease';
        operatingItems.push(
          this.makeLine(`Adjustments for ${direction} in ${item.label.toLowerCase()}`, -change, undefined, 1)
        );
      }
    }

    for (const item of sofp.current_liabilities.items) {
      if (item.link_numbers.includes('cl.600.000')) continue;
      const change = (item.current_year || 0) - (item.prior_year || 0);
      if (Math.abs(change) > 0.01) {
        const direction = change > 0 ? 'increase' : 'decrease';
        operatingItems.push(
          this.makeLine(`Adjustments for ${direction} in ${item.label.toLowerCase()}`, change, undefined, 1)
        );
      }
    }

    const netOperating = operatingItems.reduce((sum, i) => sum + (i.current_year || 0), 0);

    const operating: FinancialStatementSection = {
      title: 'Cash flows from operations',
      items: operatingItems,
      subtotal: netOperating,
    };

    // Investing - from non-current asset movements
    const investingItems: StatementLineItem[] = [];
    for (const item of sofp.non_current_assets.items) {
      const change = (item.current_year || 0) - (item.prior_year || 0);
      if (Math.abs(change) > 0.01) {
        investingItems.push(
          this.makeLine(`Acquisition of ${item.label.toLowerCase()}`, -change, undefined, 1)
        );
      }
    }
    const netInvesting = investingItems.reduce((sum, i) => sum + (i.current_year || 0), 0);
    const investing: FinancialStatementSection = {
      title: 'Cash flows from investing activities',
      items: investingItems,
      subtotal: netInvesting,
    };

    // Financing - from non-current liability and equity movements
    const financingItems: StatementLineItem[] = [];
    for (const item of sofp.non_current_liabilities.items) {
      const change = (item.current_year || 0) - (item.prior_year || 0);
      if (Math.abs(change) > 0.01) {
        financingItems.push(
          this.makeLine(`Proceeds from ${item.label.toLowerCase()}`, change, undefined, 1)
        );
      }
    }
    const netFinancing = financingItems.reduce((sum, i) => sum + (i.current_year || 0), 0);
    const financing: FinancialStatementSection = {
      title: 'Cash flows from financing activities',
      items: financingItems,
      subtotal: netFinancing,
    };

    // Cash position
    const cashItem = sofp.current_assets.items.find(i => i.link_numbers.includes('c.840.001'));
    const overdraftItem = sofp.current_liabilities.items.find(i => i.link_numbers.includes('cl.600.000'));

    const closingCash = (cashItem?.current_year || 0) - (overdraftItem?.current_year || 0);
    const openingCash = (cashItem?.prior_year || 0) - (overdraftItem?.prior_year || 0);

    return {
      entity_name: ctx.entity_name,
      period_start: ctx.financial_year_start,
      period_end: ctx.financial_year_end,
      method: ctx.cash_flow_method,
      operating_activities: operating,
      investing_activities: investing,
      financing_activities: financing,
      net_change: netOperating + netInvesting + netFinancing,
      opening_cash: openingCash,
      closing_cash: closingCash,
    };
  }

  /**
   * Generate Detailed Income Statement (supplementary)
   */
  static async generateDetailedIS(
    tenantId: string,
    engagementId: string
  ): Promise<{ entity_name: string; sections: FinancialStatementSection[] }> {
    const ctx = await this.getContext(tenantId, engagementId);
    const balances = await this.getLinkedBalances(tenantId, engagementId, 'detailed_is');

    // Group by section for detailed breakdown
    const sections: Record<string, LinkedBalance[]> = {};
    for (const b of balances) {
      const sec = b.section || 'other';
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(b);
    }

    const result: FinancialStatementSection[] = [];
    const sectionOrder = ['revenue', 'cost_of_sales', 'distribution', 'administrative', 'other', 'finance_costs', 'finance_income', 'taxation'];

    for (const secName of sectionOrder) {
      if (sections[secName] && sections[secName].length > 0) {
        result.push(this.buildSectionFromBalances(secName, sections[secName]));
      }
    }

    return { entity_name: ctx.entity_name, sections: result };
  }

  /**
   * Generate Income Tax Computation
   */
  static async generateTaxComputation(
    tenantId: string,
    engagementId: string
  ): Promise<{
    entity_name: string;
    profit_before_tax: number;
    taxable_income: number;
    normal_tax: number;
    effective_rate: number;
    items: StatementLineItem[];
  }> {
    const soci = await this.generateSoCI(tenantId, engagementId);
    const ctx = await this.getContext(tenantId, engagementId);

    const profitBeforeTax = soci.profit_before_tax;

    // Simple computation - can be extended with permanent/temporary differences
    const items: StatementLineItem[] = [
      this.makeLine('Profit / (loss) before tax', profitBeforeTax, undefined, 0, true),
      this.makeLine('Taxable income', profitBeforeTax, undefined, 0, true),
    ];

    // SA corporate tax rate (27% from 2023 onwards)
    const taxRate = 0.27;
    const normalTax = Math.round(profitBeforeTax * taxRate * 100) / 100;

    items.push(this.makeLine('Normal tax', normalTax, undefined, 0, true));

    return {
      entity_name: ctx.entity_name,
      profit_before_tax: profitBeforeTax,
      taxable_income: profitBeforeTax,
      normal_tax: normalTax,
      effective_rate: profitBeforeTax > 0 ? (normalTax / profitBeforeTax) * 100 : 0,
      items,
    };
  }

  // ------------------------------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------------------------------

  private static async getContext(tenantId: string, engagementId: string): Promise<EngagementContext> {
    const result = await pool.query(
      `SELECT id, tenant_id, entity_name, registration_number,
              financial_year_start, financial_year_end,
              comparative_year_start, comparative_year_end,
              reporting_framework, currency, soci_presentation, cash_flow_method
       FROM reporting.engagements
       WHERE id = $1 AND tenant_id = $2`,
      [engagementId, tenantId]
    );

    if (!result.rows[0]) throw new Error('Engagement not found');
    return result.rows[0];
  }

  private static async getLinkedBalances(
    tenantId: string,
    engagementId: string,
    statementType: string
  ): Promise<LinkedBalance[]> {
    const result = await pool.query(
      `SELECT 
        lm.link_number,
        lm.description as link_description,
        lm.statement,
        lm.section,
        lm.line_item,
        lm.normal_balance,
        lm.sign_convention,
        lm.sort_order,
        lm.indent_level,
        lm.is_subtotal,
        lm.is_total,
        lm.parent_link,
        COALESCE(SUM(al.closing_balance), 0) as current_amount,
        COALESCE(SUM(al.prior_year_balance), 0) as prior_amount,
        fn.note_number
      FROM reporting.link_mappings lm
      LEFT JOIN reporting.account_links al 
        ON al.link_number = lm.link_number 
        AND al.engagement_id = $2 
        AND al.tenant_id = $1
      LEFT JOIN reporting.financial_notes fn
        ON fn.engagement_id = $2
        AND fn.tenant_id = $1
        AND fn.source_links::jsonb ? lm.link_number
      WHERE lm.framework = (SELECT reporting_framework FROM reporting.engagements WHERE id = $2 AND tenant_id = $1)
        AND (lm.statement = $3 OR lm.statement = 'both')
      GROUP BY lm.link_number, lm.description, lm.statement, lm.section, lm.line_item,
               lm.normal_balance, lm.sign_convention, lm.sort_order, lm.indent_level,
               lm.is_subtotal, lm.is_total, lm.parent_link, fn.note_number
      ORDER BY lm.sort_order`,
      [tenantId, engagementId, statementType]
    );

    return result.rows.map(row => ({
      ...row,
      current_amount: parseFloat(row.current_amount) || 0,
      prior_amount: parseFloat(row.prior_amount) || 0,
      sort_order: parseInt(row.sort_order) || 0,
      indent_level: parseInt(row.indent_level) || 0,
      sign_convention: parseInt(row.sign_convention) || 1,
    }));
  }

  private static buildSection(
    title: string,
    allBalances: LinkedBalance[],
    sectionName: string
  ): FinancialStatementSection {
    const items = allBalances
      .filter(b => b.section === sectionName)
      .filter(b => Math.abs(b.current_amount) > 0.01 || Math.abs(b.prior_amount) > 0.01)
      .map(b => this.balanceToLineItem(b));

    const subtotal = items.reduce((sum, item) => sum + item.current_year, 0);
    const priorSubtotal = items.reduce((sum, item) => sum + (item.prior_year || 0), 0);

    return { title, items, subtotal, prior_subtotal: priorSubtotal };
  }

  private static buildSectionFromBalances(
    title: string,
    balances: LinkedBalance[]
  ): FinancialStatementSection {
    const items = balances
      .filter(b => Math.abs(b.current_amount) > 0.01 || Math.abs(b.prior_amount) > 0.01)
      .map(b => this.balanceToLineItem(b));

    const subtotal = items.reduce((sum, item) => sum + item.current_year, 0);
    const priorSubtotal = items.reduce((sum, item) => sum + (item.prior_year || 0), 0);

    return { title, items, subtotal, prior_subtotal: priorSubtotal };
  }

  private static balanceToLineItem(b: LinkedBalance): StatementLineItem {
    return {
      label: b.line_item || b.link_description,
      note_ref: b.note_number ?? undefined,
      current_year: b.current_amount * b.sign_convention,
      prior_year: b.prior_amount * b.sign_convention,
      indent: b.indent_level,
      is_bold: b.is_total || b.is_subtotal,
      is_total: b.is_total,
      is_subtotal: b.is_subtotal,
      is_blank_line: false,
      link_numbers: [b.link_number],
    };
  }

  private static makeLine(
    label: string,
    current: number,
    prior: number | undefined,
    indent: number,
    bold: boolean = false,
    total: boolean = false,
    blankAfter: boolean = false
  ): StatementLineItem {
    return {
      label,
      current_year: current,
      prior_year: prior,
      indent,
      is_bold: bold,
      is_total: total,
      is_subtotal: false,
      is_blank_line: blankAfter,
      link_numbers: [],
    };
  }
}
