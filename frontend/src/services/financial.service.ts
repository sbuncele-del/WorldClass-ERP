import apiClient from './api';

export interface FinancialStats {
  total_revenue: string;
  total_expenses: string;
  net_income: string;
  total_assets: string;
  total_liabilities: string;
  equity: string;
  cash_balance: string;
  receivables: string;
  payables: string;
}

export interface JournalEntry {
  journal_id: string;
  journal_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: string;
  created_by: string;
}

export interface Account {
  id: string;
  account_id?: string; // fallback
  account_number: string;
  account_code?: string; // fallback
  name: string;
  account_name?: string; // fallback
  account_type: string;
  balance: number;
  is_active: boolean;
}

export interface TrialBalanceEntry {
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
}

// Dimension Types
export interface CostCenter {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Dimensions {
  costCenters: CostCenter[];
  departments: Department[];
  projects: Project[];
  products: Product[];
  locations: Location[];
}

// ============================================================================
// Response normalization: backend V2 returns snake_case structured data,
// but the FinancialHub modal expects a specific camelCase/nested shape.
// This layer translates without changing either side's contract.
// ============================================================================

function mapAccount(a: any): { code: string; name: string; balance: number } {
  return {
    code: a.account_code || a.code || '',
    name: a.account_name || a.name || '',
    balance: parseFloat(a.amount ?? a.balance ?? 0),
  };
}

function normalizeReportData(reportCode: string, raw: any, startDate: string, endDate: string, asOfDate: string): any {
  switch (reportCode) {
    case 'balance-sheet': {
      // Backend shape: { as_of_date, current_assets.{accounts[], subtotal}, non_current_assets, current_liabilities, non_current_liabilities, equity, total_assets, total_liabilities, total_equity, total_liabilities_equity, is_balanced, variance }
      // Frontend expects: { asOfDate, sections.assets.{currentAssets.{accounts, total}, nonCurrentAssets, totalAssets}, sections.liabilities.{...}, sections.equity.{accounts, netIncome, totalEquity}, totals.{totalLiabilitiesAndEquity, isBalanced, difference} }
      const currentAssets = (raw.current_assets?.accounts || []).map(mapAccount);
      const nonCurrentAssets = (raw.non_current_assets?.accounts || []).map(mapAccount);
      const currentLiabs = (raw.current_liabilities?.accounts || []).map(mapAccount);
      const nonCurrentLiabs = (raw.non_current_liabilities?.accounts || []).map(mapAccount);
      const equityAccts = (raw.equity?.accounts || []).map(mapAccount);

      const totalAssets = raw.total_assets || 0;
      const totalLiabilities = raw.total_liabilities || 0;
      const totalEquity = raw.total_equity || 0;

      return {
        // Keep raw fields for CSV generation
        ...raw,
        // Add the shape the structured modal needs
        asOfDate: raw.as_of_date || asOfDate,
        sections: {
          assets: {
            currentAssets: { accounts: currentAssets, total: raw.current_assets?.subtotal || currentAssets.reduce((s: number, a: any) => s + a.balance, 0) },
            nonCurrentAssets: { accounts: nonCurrentAssets, total: raw.non_current_assets?.subtotal || nonCurrentAssets.reduce((s: number, a: any) => s + a.balance, 0) },
            totalAssets,
          },
          liabilities: {
            currentLiabilities: { accounts: currentLiabs, total: raw.current_liabilities?.subtotal || currentLiabs.reduce((s: number, a: any) => s + a.balance, 0) },
            nonCurrentLiabilities: { accounts: nonCurrentLiabs, total: raw.non_current_liabilities?.subtotal || nonCurrentLiabs.reduce((s: number, a: any) => s + a.balance, 0) },
            totalLiabilities,
          },
          equity: {
            accounts: equityAccts,
            netIncome: raw.retained_earnings || 0,
            totalEquity,
          },
        },
        totals: {
          totalLiabilitiesAndEquity: raw.total_liabilities_equity || (totalLiabilities + totalEquity),
          isBalanced: raw.is_balanced ?? (Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01),
          difference: raw.variance ?? (totalAssets - (totalLiabilities + totalEquity)),
        },
      };
    }

    case 'income-statement': {
      // Backend: { period.{start_date, end_date}, revenue.{accounts[], subtotal}, cost_of_sales, gross_profit, operating_expenses, operating_profit, other_income, other_expenses, net_profit_before_tax, net_profit_after_tax }
      // Frontend: { periodStart, periodEnd, sections.revenue.{accounts, total}, sections.costOfSales, sections.grossProfit, sections.operatingExpenses, sections.operatingProfit, sections.otherIncome, netIncome }
      return {
        ...raw,
        periodStart: raw.period?.start_date || startDate,
        periodEnd: raw.period?.end_date || endDate,
        sections: {
          revenue: { accounts: (raw.revenue?.accounts || []).map(mapAccount), total: raw.revenue?.subtotal || 0 },
          costOfSales: { accounts: (raw.cost_of_sales?.accounts || []).map(mapAccount), total: raw.cost_of_sales?.subtotal || 0 },
          grossProfit: raw.gross_profit || 0,
          operatingExpenses: { accounts: (raw.operating_expenses?.accounts || []).map(mapAccount), total: raw.operating_expenses?.subtotal || 0 },
          operatingProfit: raw.operating_profit || 0,
          otherIncome: { accounts: (raw.other_income?.accounts || []).map(mapAccount), total: raw.other_income?.subtotal || 0 },
          otherExpenses: { accounts: (raw.other_expenses?.accounts || []).map(mapAccount), total: raw.other_expenses?.subtotal || 0 },
        },
        netIncome: raw.net_profit_after_tax ?? raw.net_profit_before_tax ?? 0,
      };
    }

    case 'trial-balance': {
      // Backend: { accounts[].{account_code, account_name, account_type, total_debits, total_credits, balance}, totals }
      // Frontend: { periodStart, periodEnd, accounts[].{code, name, accountType, periodDebits, periodCredits, debitBalance, creditBalance}, totals.{totalDebits, totalCredits, isBalanced, difference} }
      const accounts = (raw.accounts || raw.data || []).map((a: any) => {
        const debits = parseFloat(a.total_debits ?? a.debit ?? 0);
        const credits = parseFloat(a.total_credits ?? a.credit ?? 0);
        const balance = parseFloat(a.balance ?? (debits - credits));
        return {
          code: a.account_code || a.code || '',
          name: a.account_name || a.name || '',
          accountType: (a.account_type || a.type || '').toLowerCase(),
          periodDebits: debits,
          periodCredits: credits,
          debitBalance: balance > 0 ? balance : 0,
          creditBalance: balance < 0 ? Math.abs(balance) : 0,
        };
      });
      const totalDebits = accounts.reduce((s: number, a: any) => s + a.debitBalance, 0);
      const totalCredits = accounts.reduce((s: number, a: any) => s + a.creditBalance, 0);
      return {
        ...raw,
        periodStart: raw.period?.start_date || startDate,
        periodEnd: raw.period?.end_date || endDate,
        accounts,
        totals: {
          totalDebits,
          totalCredits,
          isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
          difference: totalDebits - totalCredits,
          ...(raw.totals || {}),
        },
      };
    }

    case 'cash-flow': {
      // Backend: { period.{start_date, end_date}, operating_activities.{items[], subtotal}, investing_activities, financing_activities, net_cash_flow, beginning_cash, ending_cash }
      // Frontend: { periodStart, periodEnd, sections.operating.{netIncome, adjustments[], totalOperating}, sections.investing.{items[], totalInvesting}, sections.financing.{items[], totalFinancing}, netCashChange }
      return {
        ...raw,
        periodStart: raw.period?.start_date || startDate,
        periodEnd: raw.period?.end_date || endDate,
        sections: {
          operating: {
            netIncome: raw.net_income ?? 0,
            adjustments: (raw.operating_activities?.items || []).map((it: any) => ({ detail: it.description || it.detail || '', amount: it.amount || 0 })),
            totalOperating: raw.operating_activities?.subtotal ?? 0,
          },
          investing: {
            items: (raw.investing_activities?.items || []).map((it: any) => ({ detail: it.description || it.detail || '', amount: it.amount || 0 })),
            totalInvesting: raw.investing_activities?.subtotal ?? 0,
          },
          financing: {
            items: (raw.financing_activities?.items || []).map((it: any) => ({ detail: it.description || it.detail || '', amount: it.amount || 0 })),
            totalFinancing: raw.financing_activities?.subtotal ?? 0,
          },
        },
        netCashChange: raw.net_cash_flow ?? 0,
        beginningCash: raw.beginning_cash ?? 0,
        endingCash: raw.ending_cash ?? 0,
      };
    }

    case 'general-ledger': {
      // Backend returns accounts with transactions; normalize field names
      const glAccounts = (raw.accounts || []).map((acct: any) => ({
        accountCode: acct.account_code || acct.accountCode || '',
        accountName: acct.account_name || acct.accountName || '',
        accountType: acct.account_type || acct.accountType || '',
        openingBalance: acct.opening_balance ?? acct.openingBalance ?? 0,
        closingBalance: acct.closing_balance ?? acct.closingBalance ?? 0,
        transactions: (acct.transactions || []).map((t: any) => ({
          date: t.journal_date || t.date || '',
          journalNumber: t.journal_number || t.journalNumber || t.entry_number || '',
          description: t.description || '',
          debit: parseFloat(t.debit_amount ?? t.debit ?? 0),
          credit: parseFloat(t.credit_amount ?? t.credit ?? 0),
          balance: parseFloat(t.running_balance ?? t.balance ?? 0),
        })),
      }));
      return {
        ...raw,
        periodStart: raw.period?.start_date || startDate,
        periodEnd: raw.period?.end_date || endDate,
        accounts: glAccounts,
        summary: {
          totalAccounts: glAccounts.length,
          totalTransactions: glAccounts.reduce((s: number, a: any) => s + (a.transactions?.length || 0), 0),
          ...(raw.summary || {}),
        },
      };
    }

    case 'aged-receivables':
    case 'aged-payables': {
      // Normalize aging buckets
      return {
        ...raw,
        asOfDate: raw.as_of_date || asOfDate,
        aging: {
          current: raw.aging?.current ?? raw.current ?? 0,
          days30: raw.aging?.days30 ?? raw.days_31_60 ?? 0,
          days60: raw.aging?.days60 ?? raw.days_61_90 ?? 0,
          days90: raw.aging?.days90 ?? raw.days_91_120 ?? 0,
          over90: raw.aging?.over90 ?? raw.over_120 ?? 0,
          total: raw.aging?.total ?? raw.total ?? 0,
          ...(raw.aging || {}),
        },
        transactionCount: raw.transaction_count ?? raw.transactionCount ?? 0,
      };
    }

    case 'vat-report': {
      return {
        ...raw,
        periodStart: raw.period?.start_date || startDate,
        periodEnd: raw.period?.end_date || endDate,
        vatRate: raw.vat_rate || raw.vatRate || '15%',
        output: {
          totalSalesInclVat: raw.output?.total_sales_incl_vat ?? raw.output?.totalSalesInclVat ?? 0,
          totalSalesExclVat: raw.output?.total_sales_excl_vat ?? raw.output?.totalSalesExclVat ?? 0,
          outputVat: raw.output?.output_vat ?? raw.output?.outputVat ?? 0,
          ...(raw.output || {}),
        },
        input: {
          totalPurchasesInclVat: raw.input?.total_purchases_incl_vat ?? raw.input?.totalPurchasesInclVat ?? 0,
          totalPurchasesExclVat: raw.input?.total_purchases_excl_vat ?? raw.input?.totalPurchasesExclVat ?? 0,
          inputVat: raw.input?.input_vat ?? raw.input?.inputVat ?? 0,
          ...(raw.input || {}),
        },
        netVat: raw.net_vat ?? raw.netVat ?? 0,
      };
    }

    default:
      return raw;
  }
}

export const financialService = {
  async getStats(): Promise<FinancialStats> {
    // Use V2 dashboard endpoint which computes actual GL balances
    const { data } = await apiClient.get('/api/v2/financial/dashboard');
    // V2 returns { success: true, data: { total_revenue, total_expenses, ... } }
    return data.data || data.summary || data;
  },

  async getJournalEntries(params?: { limit?: number; status?: string }): Promise<{ data: JournalEntry[]; total: number }> {
    const { data } = await apiClient.get('/api/financial/journal-entries', { params });
    return data;
  },

  async getAccounts(params?: { limit?: number; account_type?: string }): Promise<{ data: Account[]; total: number }> {
    const { data } = await apiClient.get('/api/financial/accounts', { params });
    return data;
  },

  async getTrialBalance(): Promise<{ data: TrialBalanceEntry[]; totals: { debit: number; credit: number } }> {
    const { data } = await apiClient.get('/api/financial/trial-balance');
    return data;
  },

  async getGeneralLedger(params?: { from_date?: string; to_date?: string; account_code?: string; limit?: number }): Promise<{ data: any[]; count: number }> {
    const { data } = await apiClient.get('/api/financial/general-ledger', { params: { limit: 200, ...params } });
    return data;
  },

  async getPeriods(): Promise<{ data: Array<{ period: string; status: string; closed_date?: string }> }> {
    const { data } = await apiClient.get('/api/v2/financial/periods');
    return data;
  },

  async createJournalEntry(payload: {
    entry_date: string;
    description: string;
    lines: Array<{ 
      account_id: string; 
      debit_amount: number; 
      credit_amount: number;
      cost_center_id?: string | null;
      department_id?: string | null;
      project_id?: string | null;
      product_id?: string | null;
      location_id?: string | null;
      description?: string | null;
    }>;
  }): Promise<{ success: boolean; data: JournalEntry; message: string }> {
    const { data } = await apiClient.post('/api/v2/financial/journal-entries', payload);
    return data;
  },

  async getChartOfAccounts(params?: { limit?: number }): Promise<{ data: Account[]; total: number }> {
    const { data } = await apiClient.get('/api/v2/financial/accounts', { params: { ...params, limit: params?.limit || 100 } });
    return data;
  },

  // Dimension APIs
  async getCostCenters(): Promise<{ data: CostCenter[] }> {
    const { data } = await apiClient.get('/api/financial/dimensions/cost-centers');
    return data;
  },

  async getDepartments(): Promise<{ data: Department[] }> {
    const { data } = await apiClient.get('/api/financial/dimensions/departments');
    return data;
  },

  async getProjects(): Promise<{ data: Project[] }> {
    const { data } = await apiClient.get('/api/financial/dimensions/projects');
    return data;
  },

  async getProducts(): Promise<{ data: Product[] }> {
    const { data } = await apiClient.get('/api/financial/dimensions/products');
    return data;
  },

  async getLocations(): Promise<{ data: Location[] }> {
    const { data } = await apiClient.get('/api/financial/dimensions/locations');
    return data;
  },

  async getAllDimensions(): Promise<Dimensions> {
    const [costCenters, departments, projects, products, locations] = await Promise.all([
      this.getCostCenters(),
      this.getDepartments(),
      this.getProjects(),
      this.getProducts(),
      this.getLocations(),
    ]);
    return {
      costCenters: costCenters.data || [],
      departments: departments.data || [],
      projects: projects.data || [],
      products: products.data || [],
      locations: locations.data || [],
    };
  },

  // Report Downloads - Uses v2 real GL data endpoints
  async downloadReport(reportCode: string, params?: { startDate?: string; endDate?: string; asOfDate?: string }): Promise<{ success: boolean; data: any }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yearStart = `${new Date().getFullYear()}-01-01`;
      const startDate = params?.startDate || yearStart;
      const endDate = params?.endDate || today;
      const asOfDate = params?.asOfDate || today;
      
      let endpoint = '';
      
      switch (reportCode) {
        case 'balance-sheet':
          endpoint = `/api/v2/financial/reports/balance-sheet?as_of_date=${asOfDate}`;
          break;
        case 'income-statement':
          endpoint = `/api/v2/financial/reports/income-statement?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'trial-balance':
          endpoint = `/api/v2/financial/reports/trial-balance?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'cash-flow':
          endpoint = `/api/v2/financial/reports/cash-flow?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'general-ledger':
          endpoint = `/api/v2/financial/reports/general-ledger?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'aged-receivables':
          endpoint = `/api/v2/financial/reports/aged-receivables?as_of_date=${asOfDate}`;
          break;
        case 'aged-payables':
          endpoint = `/api/v2/financial/reports/aged-payables?as_of_date=${asOfDate}`;
          break;
        case 'vat-report':
          endpoint = `/api/v2/financial/reports/vat-report?start_date=${startDate}&end_date=${endDate}`;
          break;
        default:
          return { 
            success: true, 
            data: { 
              message: `Report "${reportCode}" is not yet implemented`,
              placeholder: true 
            }
          };
      }
      
      const { data } = await apiClient.get(endpoint);
      // Normalize backend response shapes to the structure the FinancialHub modal expects
      if (data?.success && data?.data) {
        data.data = normalizeReportData(reportCode, data.data, startDate, endDate, asOfDate);
      }
      return data;
    } catch (error) {
      console.error(`Error downloading report ${reportCode}:`, error);
      return { success: false, data: null };
    }
  },

  // Fiscal Settings
  async getFiscalCurrentYear(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/fiscal/current-year');
    return data;
  },

  async getFiscalYears(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/fiscal/years');
    return data;
  },

  async closePeriod(periodId: number): Promise<any> {
    const { data } = await apiClient.post(`/api/v2/fiscal/periods/${periodId}/close`);
    return data;
  },

  async reopenPeriod(periodId: number): Promise<any> {
    const { data } = await apiClient.post(`/api/v2/fiscal/periods/${periodId}/reopen`);
    return data;
  },

  // Journal Entry Actions
  async getJournalEntry(id: string): Promise<{ success: boolean; data: any; message?: string }> {
    const { data } = await apiClient.get(`/api/v2/financial/journal-entries/${id}`);
    return data;
  },

  async postJournalEntry(id: string): Promise<{ success: boolean; data: any; message?: string }> {
    const { data } = await apiClient.post(`/api/v2/financial/journal-entries/${id}/post`);
    return data;
  },

  async reverseJournalEntry(id: string, reversalDate?: string): Promise<{ success: boolean; data: any; message?: string }> {
    const { data } = await apiClient.post(`/api/v2/financial/journal-entries/${id}/reverse`, {
      reversal_date: reversalDate || new Date().toISOString().split('T')[0],
    });
    return data;
  },

  // Chart of Accounts Mutations
  async createAccount(payload: {
    account_code: string;
    account_name: string;
    account_type: string;
    parent_id?: string | null;
    is_header?: boolean;
    normal_balance?: string;
    description?: string;
    opening_balance?: number;
  }): Promise<{ success: boolean; data: any; message?: string }> {
    const { data } = await apiClient.post('/api/v2/financial/chart-of-accounts', payload);
    return data;
  },

  async updateAccount(id: string, payload: {
    account_name?: string;
    description?: string;
    is_active?: boolean;
  }): Promise<{ success: boolean; data: any; message?: string }> {
    const { data } = await apiClient.put(`/api/v2/financial/chart-of-accounts/${id}`, payload);
    return data;
  },
};
