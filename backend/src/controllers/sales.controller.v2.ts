/**
 * SALES MANAGEMENT CONTROLLER (Repository Pattern)
 * 
 * This controller uses the Repository Pattern for automatic multi-tenant isolation.
 * All data operations go through repositories which handle tenant filtering.
 * 
 * IMPORTANT: Uses TenantRequest for typed tenant context from middleware.
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import { TenantContext } from '../repositories/BaseRepository';
import {
  customerRepository,
  salesOrderRepository,
  invoiceRepository,
  quotationRepository
} from '../repositories/sales';

/**
 * Helper to extract tenant context from request
 */
function getTenantContext(req: TenantRequest): TenantContext {
  if (!req.tenant) {
    throw new Error('Tenant context not available');
  }
  return {
    tenantId: req.tenant.id,
    userId: req.user?.id
  };
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export const getCustomers = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { search, is_active, customer_type, page, limit } = req.query;

    if (search) {
      const result = await customerRepository.search(ctx, search as string, {
        page: Number(page) || 1,
        limit: Number(limit) || 50
      });
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    }

    const filters: Record<string, any> = {};
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (customer_type) filters.customer_type = customer_type;

    const result = await customerRepository.findAll(ctx, filters, {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      sortBy: 'name',
      sortOrder: 'ASC'
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getCustomer = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    const customer = await customerRepository.getCustomerWithBalance(ctx, id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createCustomer = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const customerData = req.body;

    // Check if code is unique
    const isUnique = await customerRepository.isCodeUnique(ctx, customerData.code);
    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: 'Customer code already exists'
      });
    }

    const customer = await customerRepository.create(ctx, customerData);

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateCustomer = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const customerData = req.body;

    // Check if code is unique (excluding this customer)
    if (customerData.code) {
      const isUnique = await customerRepository.isCodeUnique(ctx, customerData.code, id);
      if (!isUnique) {
        return res.status(400).json({
          success: false,
          message: 'Customer code already exists'
        });
      }
    }

    const customer = await customerRepository.update(ctx, id, customerData);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteCustomer = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    // Check if customer has orders or invoices
    const orders = await salesOrderRepository.getCustomerOrders(ctx, id, { limit: 1 });
    if (orders.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing orders'
      });
    }

    const deleted = await customerRepository.delete(ctx, id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getCustomerOrders = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { page, limit } = req.query;

    const result = await salesOrderRepository.getCustomerOrders(ctx, id, {
      page: Number(page) || 1,
      limit: Number(limit) || 50
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getCustomerInvoices = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { page, limit } = req.query;

    const result = await invoiceRepository.getCustomerInvoices(ctx, id, {
      page: Number(page) || 1,
      limit: Number(limit) || 50
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer invoices',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// SALES ORDERS
// ============================================================================

export const getSalesOrders = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { status, customer_id, start_date, end_date, page, limit } = req.query;

    if (start_date && end_date) {
      const result = await salesOrderRepository.getOrdersByDateRange(
        ctx,
        new Date(start_date as string),
        new Date(end_date as string),
        {
          page: Number(page) || 1,
          limit: Number(limit) || 50
        }
      );
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    }

    const filters: Record<string, any> = {};
    if (status) filters.status = status;
    if (customer_id) filters.customer_id = customer_id;

    const result = await salesOrderRepository.findAll(ctx, filters, {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      sortBy: 'order_date',
      sortOrder: 'DESC'
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getSalesOrder = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    const order = await salesOrderRepository.getOrderWithLines(ctx, id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createSalesOrder = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const orderData = req.body;

    const order = await salesOrderRepository.createOrderWithLines(
      ctx,
      {
        ...orderData,
        status: orderData.status || 'draft'
      },
      orderData.lines || []
    );

    res.status(201).json({
      success: true,
      data: order,
      message: 'Sales order created successfully'
    });
  } catch (error) {
    console.error('Error creating sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sales order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateSalesOrder = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const orderData = req.body;

    // Check if order can be modified
    const existingOrder = await salesOrderRepository.findById(ctx, id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (!['draft', 'confirmed'].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify order in current status'
      });
    }

    const order = await salesOrderRepository.update(ctx, id, orderData);

    res.json({
      success: true,
      data: order,
      message: 'Sales order updated successfully'
    });
  } catch (error) {
    console.error('Error updating sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sales order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const confirmSalesOrder = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    const existingOrder = await salesOrderRepository.findById(ctx, id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (existingOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft orders can be confirmed'
      });
    }

    const order = await salesOrderRepository.update(ctx, id, { status: 'confirmed' });

    res.json({
      success: true,
      data: order,
      message: 'Sales order confirmed successfully'
    });
  } catch (error) {
    console.error('Error confirming sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm sales order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const cancelSalesOrder = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { reason } = req.body;

    const existingOrder = await salesOrderRepository.findById(ctx, id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (['delivered', 'cancelled'].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order in current status'
      });
    }

    const order = await salesOrderRepository.update(ctx, id, {
      status: 'cancelled',
      notes: reason ? `${existingOrder.notes || ''}\nCancelled: ${reason}` : existingOrder.notes
    });

    res.json({
      success: true,
      data: order,
      message: 'Sales order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel sales order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// INVOICES
// ============================================================================

export const getInvoices = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { status, customer_id, start_date, end_date, overdue, page, limit } = req.query;

    if (overdue === 'true') {
      const invoices = await invoiceRepository.getOverdueInvoices(ctx);
      return res.json({
        success: true,
        data: invoices,
        pagination: { page: 1, limit: invoices.length, total: invoices.length, totalPages: 1 }
      });
    }

    if (start_date && end_date) {
      const result = await invoiceRepository.getInvoicesByDateRange(
        ctx,
        new Date(start_date as string),
        new Date(end_date as string),
        {
          page: Number(page) || 1,
          limit: Number(limit) || 50,
          sortBy: 'invoice_date',
          sortOrder: 'DESC'
        }
      );
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    }

    const filters: Record<string, any> = {};
    if (status) filters.status = status;
    if (customer_id) filters.customer_id = customer_id;

    const result = await invoiceRepository.findAll(ctx, filters, {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      sortBy: 'invoice_date',
      sortOrder: 'DESC'
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getInvoice = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    const invoice = await invoiceRepository.getInvoiceWithLines(ctx, id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createInvoice = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const invoiceData = req.body;

    const invoice = await invoiceRepository.createInvoiceWithLines(
      ctx,
      {
        ...invoiceData,
        status: invoiceData.status || 'draft',
        amount_paid: invoiceData.amount_paid || 0,
        balance_due: invoiceData.balance_due ?? invoiceData.total_amount
      },
      invoiceData.lines || []
    );

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createInvoiceFromOrder = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { orderId } = req.params;

    // Get order with lines
    const order = await salesOrderRepository.getOrderWithLines(ctx, orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Can only invoice confirmed orders'
      });
    }

    const invoice = await invoiceRepository.createFromOrder(ctx, orderId);

    // Update order status
    await salesOrderRepository.updateStatus(ctx, orderId, 'processing');

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created from order successfully'
    });
  } catch (error) {
    console.error('Error creating invoice from order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice from order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const sendInvoice = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    const invoice = await invoiceRepository.findById(ctx, id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft invoices can be sent'
      });
    }

    // TODO: Send invoice via email

    const updatedInvoice = await invoiceRepository.update(ctx, id, { status: 'sent' });

    res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice sent successfully'
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const voidInvoice = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await invoiceRepository.findById(ctx, id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.amount_paid > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot void invoice with payments'
      });
    }

    const updatedInvoice = await invoiceRepository.update(ctx, id, {
      status: 'void',
      notes: reason ? `${invoice.notes || ''}\nVoided: ${reason}` : invoice.notes
    });

    res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice voided successfully'
    });
  } catch (error) {
    console.error('Error voiding invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to void invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// QUOTATIONS
// ============================================================================

export const getQuotations = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { status, customer_id, page, limit } = req.query;

    const filters: Record<string, any> = {};
    if (status) filters.status = status;
    if (customer_id) filters.customer_id = customer_id;

    const result = await quotationRepository.findAll(ctx, filters, {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      sortBy: 'quotation_date',
      sortOrder: 'DESC'
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quotations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getQuotation = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    const quotation = await quotationRepository.getQuotationWithLines(ctx, id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quotation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createQuotation = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const quotationData = req.body;

    const quotation = await quotationRepository.createQuotationWithLines(
      ctx,
      {
        ...quotationData,
        status: quotationData.status || 'draft'
      },
      quotationData.lines || []
    );

    res.status(201).json({
      success: true,
      data: quotation,
      message: 'Quotation created successfully'
    });
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quotation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const convertQuotationToOrder = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;

    const orderId = await quotationRepository.convertToOrder(ctx, id);
    const order = await salesOrderRepository.getOrderWithLines(ctx, orderId);

    res.status(201).json({
      success: true,
      data: order,
      message: 'Quotation converted to order successfully'
    });
  } catch (error) {
    console.error('Error converting quotation to order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert quotation to order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// DASHBOARD & REPORTS
// ============================================================================

export const getSalesDashboard = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);

    const [
      customerCount,
      pendingOrders,
      unpaidInvoices,
      overdueInvoices,
      recentOrders,
      topCustomers
    ] = await Promise.all([
      customerRepository.count(ctx, { is_active: true }),
      salesOrderRepository.count(ctx, { status: 'draft' }),
      invoiceRepository.getUnpaidInvoices(ctx),
      invoiceRepository.getOverdueInvoices(ctx),
      salesOrderRepository.findAll(ctx, {}, { limit: 5, sortBy: 'created_at', sortOrder: 'DESC' }),
      customerRepository.getTopCustomersByRevenue(ctx, 5)
    ]);

    const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

    res.json({
      success: true,
      data: {
        summary: {
          total_customers: customerCount,
          pending_orders: pendingOrders,
          unpaid_invoices: unpaidInvoices.length,
          unpaid_amount: unpaidTotal,
          overdue_invoices: overdueInvoices.length,
          overdue_amount: overdueTotal
        },
        recent_orders: recentOrders.data,
        top_customers: topCustomers
      }
    });
  } catch (error) {
    console.error('Error fetching sales dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales dashboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getSalesReport = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { start_date, end_date, group_by } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const report = await invoiceRepository.getSalesReport(
      ctx,
      new Date(start_date as string),
      new Date(end_date as string),
      (group_by as 'day' | 'week' | 'month' | 'customer') || 'day'
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
