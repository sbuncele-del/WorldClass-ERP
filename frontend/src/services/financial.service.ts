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
  account_id: string;
  account_code: string;
  account_name: string;
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

export const financialService = {
  async getStats(): Promise<FinancialStats> {
    const { data } = await apiClient.get('/api/financial/workspace');
    // Extract summary from workspace response
    return data.data?.summary || data.summary || data;
  },

  async getJournalEntries(params?: { limit?: number; status?: string }): Promise<{ data: JournalEntry[]; total: number }> {
    const { data } = await apiClient.get('/api/financial/journals', { params });
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

  async getPeriods(): Promise<{ data: Array<{ period: string; status: string; closed_date?: string }> }> {
    const { data } = await apiClient.get('/api/financial/periods');
    return data;
  },
};
