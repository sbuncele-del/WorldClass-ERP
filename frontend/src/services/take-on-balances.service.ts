import apiClient from './api';

export const takeOnBalancesService = {
  // Summary
  async getSummary() {
    const { data } = await apiClient.get('/api/take-on-balances/summary');
    return data;
  },

  // GL
  async getGLBalances() {
    const { data } = await apiClient.get('/api/take-on-balances/gl');
    return data;
  },
  async saveGLBalances(balances: { id: string; opening_balance: number }[]) {
    const { data } = await apiClient.post('/api/take-on-balances/gl', { balances });
    return data;
  },

  // Customers
  async getCustomerBalances() {
    const { data } = await apiClient.get('/api/take-on-balances/customers');
    return data;
  },
  async saveCustomerBalances(balances: { id: string; opening_balance: number }[]) {
    const { data } = await apiClient.post('/api/take-on-balances/customers', { balances });
    return data;
  },

  // Suppliers
  async getSupplierBalances() {
    const { data } = await apiClient.get('/api/take-on-balances/suppliers');
    return data;
  },
  async saveSupplierBalances(balances: { id: string; opening_balance: number }[]) {
    const { data } = await apiClient.post('/api/take-on-balances/suppliers', { balances });
    return data;
  },

  // Bank accounts
  async getBankBalances() {
    const { data } = await apiClient.get('/api/take-on-balances/bank-accounts');
    return data;
  },
  async saveBankBalances(balances: { id: string; opening_balance: number; opening_balance_date?: string }[]) {
    const { data } = await apiClient.post('/api/take-on-balances/bank-accounts', { balances });
    return data;
  },

  // Validate & finalize
  async validate() {
    const { data } = await apiClient.post('/api/take-on-balances/validate');
    return data;
  },
  async finalize(effective_date?: string) {
    const { data } = await apiClient.post('/api/take-on-balances/finalize', { effective_date });
    return data;
  },
};
