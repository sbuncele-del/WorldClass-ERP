import apiClient from './api';

export const statementsService = {
  // Customer statements
  async listCustomerStatements() {
    const { data } = await apiClient.get('/api/sales/customers/statements');
    return data;
  },
  async getCustomerStatement(customerId: string, from?: string, to?: string) {
    const params: Record<string, string> = {};
    if (from) params.date_from = from;
    if (to) params.date_to = to;
    const { data } = await apiClient.get(`/api/sales/customers/${customerId}/statement`, { params });
    return data;
  },

  // Supplier statements
  async listSupplierStatements() {
    const { data } = await apiClient.get('/api/purchase/suppliers/statements');
    return data;
  },
  async getSupplierStatement(supplierId: string, from?: string, to?: string) {
    const params: Record<string, string> = {};
    if (from) params.date_from = from;
    if (to) params.date_to = to;
    const { data } = await apiClient.get(`/api/purchase/suppliers/${supplierId}/statement`, { params });
    return data;
  },
};
