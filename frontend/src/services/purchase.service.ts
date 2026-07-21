import apiClient from './api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  code: string;
  name: string;
  trading_name?: string;
  supplier_type?: string;
  tax_number?: string;
  registration_number?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  contact_person?: string;
  payment_terms?: string;
  currency_code?: string;
  notes?: string;
  is_active?: boolean;
  status?: string;
  total_spend?: number;
  outstanding_balance?: number;
  on_time_delivery?: number;
  quality_score?: number;
  credit_limit?: number;
  last_order_date?: string;
}

export interface PurchaseOrderLine {
  item_code?: string;
  description: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  discount_percentage?: number;
  vat_rate?: number;
  line_total?: number;
  notes?: string;
}

export interface PurchaseOrder {
  po_id?: string;
  id?: string;
  po_number?: string;
  supplier_id?: string | number;
  supplier_name?: string;
  supplier_code?: string;
  po_date?: string;
  order_date?: string;
  expected_date?: string;
  delivery_date?: string;
  payment_terms?: string;
  status?: string;
  subtotal?: number;
  discount_amount?: number;
  vat_rate?: number;
  vat_amount?: number;
  total?: number;
  total_amount?: number;
  currency_code?: string;
  notes?: string;
  item_count?: number;
  received_items?: number;
  requester?: string;
  department?: string;
  pr_number?: string;
  lines?: PurchaseOrderLine[];
}

export interface VendorInvoice {
  invoice_id?: string;
  id?: string;
  invoice_number?: string;
  supplier_id?: string | number;
  supplier_invoice_number?: string;
  vendor_name?: string;
  vendor_code?: string;
  invoice_date?: string;
  due_date?: string;
  status?: string;
  po_id?: string | number;
  po_number?: string;
  gr_id?: string | number;
  grn_number?: string;
  subtotal?: number;
  discount_amount?: number;
  vat_rate?: number;
  vat_amount?: number;
  total_amount?: number;
  amount?: number;
  amount_paid?: number;
  amount_outstanding?: number;
  outstanding?: number;
  currency_code?: string;
  payment_terms?: string;
  match_status?: string;
  days_overdue?: number;
  notes?: string;
}

export interface Requisition {
  id?: string;
  requisition_id?: string;
  number?: string;
  requester?: string;
  department?: string;
  date?: string;
  status?: string;
  priority?: string;
  estimated_value?: number;
  item_count?: number;
  approver?: string;
  approval_date?: string;
  po_number?: string;
  notes?: string;
  line_items?: RequisitionLine[];
}

export interface RequisitionLine {
  item_code?: string;
  description: string;
  quantity: number;
  unit_of_measure?: string;
  estimated_unit_price?: number;
  notes?: string;
}

export interface GoodsReceipt {
  id?: string;
  grn_number?: string;
  order_id?: string | number;
  po_number?: string;
  supplier_name?: string;
  supplier_code?: string;
  gr_date?: string;
  receipt_date?: string;
  received_by?: string;
  status?: string;
  total_items?: number;
  received_items?: number;
  rejected_items?: number;
  storage_location?: string;
  quality_score?: number | null;
  notes?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────

const extractData = (response: any): any => {
  return response.data?.data || response.data || response;
};

// ─── Service ──────────────────────────────────────────────────────────────

export const purchaseService = {
  // ── Dashboard ─────────────────────────────────────────────────────────
  async getDashboard(): Promise<any> {
    const { data } = await apiClient.get('/api/purchase/dashboard');
    return extractData({ data });
  },

  async getStats(): Promise<any> {
    const { data } = await apiClient.get('/api/purchase/workspace');
    return data.data?.summary || data.summary || data;
  },

  // ── Suppliers ─────────────────────────────────────────────────────────
  async getSuppliers(params?: { search?: string; is_active?: boolean; page?: number; limit?: number }): Promise<any> {
    const { data } = await apiClient.get('/api/purchase/suppliers', { params });
    return data;
  },

  async getSupplier(id: string | number): Promise<Supplier> {
    const { data } = await apiClient.get(`/api/purchase/suppliers/${id}`);
    return extractData({ data });
  },

  async createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
    const { data } = await apiClient.post('/api/purchase/suppliers', supplier);
    return extractData({ data });
  },

  async updateSupplier(id: string | number, supplier: Partial<Supplier>): Promise<Supplier> {
    const { data } = await apiClient.put(`/api/purchase/suppliers/${id}`, supplier);
    return extractData({ data });
  },

  async deleteSupplier(id: string | number): Promise<void> {
    await apiClient.delete(`/api/purchase/suppliers/${id}`);
  },

  // ── Purchase Orders ───────────────────────────────────────────────────
  async getOrders(params?: { status?: string; supplier_id?: string; page?: number; limit?: number }): Promise<any> {
    const { data } = await apiClient.get('/api/purchase/orders', { params });
    return data;
  },

  async getOrder(id: string | number): Promise<PurchaseOrder> {
    const { data } = await apiClient.get(`/api/purchase/orders/${id}`);
    return extractData({ data });
  },

  async createOrder(order: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const { data } = await apiClient.post('/api/purchase/orders', order);
    return extractData({ data });
  },

  async updateOrder(id: string | number, order: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const { data } = await apiClient.put(`/api/purchase/orders/${id}`, order);
    return extractData({ data });
  },

  async sendOrder(id: string | number): Promise<any> {
    const { data } = await apiClient.post(`/api/purchase/orders/${id}/send`);
    return extractData({ data });
  },

  async cancelOrder(id: string | number): Promise<any> {
    const { data } = await apiClient.post(`/api/purchase/orders/${id}/cancel`);
    return extractData({ data });
  },

  // ── Vendor Invoices ───────────────────────────────────────────────────
  async getInvoices(params?: { status?: string; supplier_id?: string; overdue?: string; page?: number; limit?: number }): Promise<any> {
    const { data } = await apiClient.get('/api/purchase/invoices', { params });
    return data;
  },

  async getInvoice(id: string | number): Promise<VendorInvoice> {
    const { data } = await apiClient.get(`/api/purchase/invoices/${id}`);
    return extractData({ data });
  },

  async createInvoice(invoice: Partial<VendorInvoice>): Promise<VendorInvoice> {
    const { data } = await apiClient.post('/api/purchase/invoices', invoice);
    return extractData({ data });
  },

  async updateInvoice(id: string | number, invoice: Partial<VendorInvoice>): Promise<VendorInvoice> {
    const { data } = await apiClient.put(`/api/purchase/invoices/${id}`, invoice);
    return extractData({ data });
  },

  async approveInvoice(id: string | number): Promise<any> {
    const { data } = await apiClient.post(`/api/purchase/invoices/${id}/approve`);
    return extractData({ data });
  },

  async rejectInvoice(id: string | number): Promise<any> {
    const { data } = await apiClient.post(`/api/purchase/invoices/${id}/reject`);
    return extractData({ data });
  },

  async payInvoice(id: string | number, payment: { amount: number; payment_method: string; reference?: string }): Promise<any> {
    const { data } = await apiClient.post(`/api/purchase/invoices/${id}/pay`, payment);
    return extractData({ data });
  },

  async deleteInvoice(id: string | number): Promise<void> {
    await apiClient.delete(`/api/purchase/invoices/${id}`);
  },

  async captureInvoice(file: File): Promise<{ invoice: VendorInvoice; extracted: any; supplierMatch: { supplierId: number | null; score: number }; needsReview: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post('/api/purchase/vendor-invoices/capture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData({ data });
  },

  // ── Requisitions ──────────────────────────────────────────────────────
  async getRequisitions(params?: { status?: string; department?: string; page?: number; limit?: number }): Promise<any> {
    const { data } = await apiClient.get('/api/purchase/requisitions', { params });
    return data;
  },

  async getRequisition(id: string | number): Promise<Requisition> {
    const { data } = await apiClient.get(`/api/purchase/requisitions/${id}`);
    return extractData({ data });
  },

  async createRequisition(requisition: Partial<Requisition>): Promise<Requisition> {
    const { data } = await apiClient.post('/api/purchase/requisitions', requisition);
    return extractData({ data });
  },

  async updateRequisition(id: string | number, requisition: Partial<Requisition>): Promise<Requisition> {
    const { data } = await apiClient.put(`/api/purchase/requisitions/${id}`, requisition);
    return extractData({ data });
  },

  async approveRequisition(id: string | number): Promise<any> {
    const { data } = await apiClient.post(`/api/purchase/requisitions/${id}/approve`);
    return extractData({ data });
  },

  async rejectRequisition(id: string | number, rejection_reason: string): Promise<any> {
    const { data } = await apiClient.post(`/api/purchase/requisitions/${id}/reject`, { rejection_reason });
    return extractData({ data });
  },

  async deleteRequisition(id: string | number): Promise<void> {
    await apiClient.delete(`/api/purchase/requisitions/${id}`);
  },

  // ── Goods Receipts ────────────────────────────────────────────────────
  async getGoodsReceipts(params?: { status?: string; order_id?: string; page?: number; limit?: number }): Promise<any> {
    const { data } = await apiClient.get('/api/purchase/goods-receipts', { params });
    return data;
  },

  async getGoodsReceipt(id: string | number): Promise<GoodsReceipt> {
    const { data } = await apiClient.get(`/api/purchase/goods-receipts/${id}`);
    return extractData({ data });
  },

  async createGoodsReceipt(receipt: Partial<GoodsReceipt> & { line_items?: any[] }): Promise<GoodsReceipt> {
    const { data } = await apiClient.post('/api/purchase/goods-receipts', receipt);
    return extractData({ data });
  },

  async confirmGoodsReceipt(id: string | number): Promise<any> {
    const { data } = await apiClient.post(`/api/purchase/goods-receipts/${id}/confirm`);
    return extractData({ data });
  },

  async deleteGoodsReceipt(id: string | number): Promise<void> {
    await apiClient.delete(`/api/purchase/goods-receipts/${id}`);
  },
};
