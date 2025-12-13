/**
 * Purchase Order Repository
 * 
 * Handles all database operations for purchase orders
 * with automatic tenant isolation.
 */

import { BaseRepository, TenantContext, PaginatedResult, PaginationOptions } from '../BaseRepository';

export type PurchaseOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrderLine {
  id: string;
  order_id: string;
  item_id: string;
  item_code?: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate?: number;
  tax_amount?: number;
  line_total: number;
  quantity_received?: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  supplier_id: string;
  supplier_name?: string;
  order_date: Date;
  expected_date?: Date;
  status: PurchaseOrderStatus;
  warehouse_id?: string;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  currency_code: string;
  exchange_rate?: number;
  payment_terms?: number;
  notes?: string;
  internal_notes?: string;
  approved_by?: string;
  approved_at?: Date;
  lines?: PurchaseOrderLine[];
  created_at: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
  deleted_at?: Date;
}

export class PurchaseOrderRepository extends BaseRepository<PurchaseOrder> {
  protected tableName = 'orders';
  protected schema = 'purchase';

  /**
   * Get orders by status
   */
  async getOrdersByStatus(
    ctx: TenantContext,
    status: PurchaseOrderStatus,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<PurchaseOrder>> {
    return this.findAll(ctx, { status }, pagination);
  }

  /**
   * Get orders pending approval
   */
  async getPendingApproval(ctx: TenantContext): Promise<PurchaseOrder[]> {
    const result = await this.findAll(ctx, { status: 'pending_approval' });
    return result.data;
  }

  /**
   * Get order with lines
   */
  async getOrderWithLines(ctx: TenantContext, orderId: string): Promise<PurchaseOrder | null> {
    const order = await this.findById(ctx, orderId);
    if (!order) return null;

    const linesSql = `
      SELECT pol.*, i.code as item_code, i.name as item_name
      FROM purchase.order_lines pol
      LEFT JOIN inventory.items i ON i.id = pol.item_id
      WHERE pol.order_id = $2 AND pol.tenant_id = $1
      ORDER BY pol.line_number
    `;

    const lines = await this.rawQuery<PurchaseOrderLine>(ctx, linesSql, [orderId]);
    return { ...order, lines };
  }

  /**
   * Create order with lines
   */
  async createOrderWithLines(
    ctx: TenantContext,
    orderData: Partial<PurchaseOrder>,
    lines: Partial<PurchaseOrderLine>[]
  ): Promise<PurchaseOrder> {
    const client = await this.beginTransaction();

    try {
      // Generate order number
      const numResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
        FROM ${this.fullTableName}
        WHERE tenant_id = $1
      `, [ctx.tenantId]);
      const orderNumber = `PO-${String(numResult.rows[0].next_num).padStart(6, '0')}`;

      // Create order
      const orderResult = await client.query(`
        INSERT INTO ${this.fullTableName}
        (tenant_id, order_number, supplier_id, order_date, expected_date, status, warehouse_id,
         subtotal, discount_amount, tax_amount, shipping_amount, total_amount,
         currency_code, payment_terms, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `, [
        ctx.tenantId, orderNumber, orderData.supplier_id,
        orderData.order_date || new Date(), orderData.expected_date,
        orderData.status || 'draft', orderData.warehouse_id,
        orderData.subtotal || 0, orderData.discount_amount || 0,
        orderData.tax_amount || 0, orderData.shipping_amount || 0,
        orderData.total_amount || 0, orderData.currency_code || 'ZAR',
        orderData.payment_terms, orderData.notes, ctx.userId
      ]);

      const order = orderResult.rows[0];

      // Create lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        await client.query(`
          INSERT INTO purchase.order_lines
          (tenant_id, order_id, line_number, item_id, quantity, unit_price,
           discount_percent, tax_rate, tax_amount, line_total, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          ctx.tenantId, order.id, i + 1, line.item_id, line.quantity, line.unit_price,
          line.discount_percent || 0, line.tax_rate || 0, line.tax_amount || 0,
          line.line_total, line.notes
        ]);
      }

      await this.commitTransaction(client);
      return order;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Approve a purchase order
   */
  async approveOrder(ctx: TenantContext, orderId: string): Promise<PurchaseOrder | null> {
    const client = await this.beginTransaction();

    try {
      await client.query(`
        UPDATE ${this.fullTableName}
        SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND status = 'pending_approval'
      `, [ctx.userId, orderId, ctx.tenantId]);

      await this.commitTransaction(client);
      return this.findById(ctx, orderId);
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Receive goods against a purchase order
   */
  async receiveGoods(
    ctx: TenantContext,
    orderId: string,
    receivedItems: { lineId: string; quantityReceived: number }[]
  ): Promise<PurchaseOrder | null> {
    const client = await this.beginTransaction();

    try {
      const order = await this.getOrderWithLines(ctx, orderId);
      if (!order) throw new Error('Order not found');

      let allReceived = true;

      for (const item of receivedItems) {
        // Update line quantity received
        await client.query(`
          UPDATE purchase.order_lines
          SET quantity_received = COALESCE(quantity_received, 0) + $1
          WHERE id = $2 AND tenant_id = $3
        `, [item.quantityReceived, item.lineId, ctx.tenantId]);

        // Check if fully received
        const lineResult = await client.query(`
          SELECT quantity, quantity_received FROM purchase.order_lines
          WHERE id = $1 AND tenant_id = $2
        `, [item.lineId, ctx.tenantId]);

        const line = lineResult.rows[0];
        if (line && line.quantity_received < line.quantity) {
          allReceived = false;
        }
      }

      // Update order status
      const newStatus = allReceived ? 'received' : 'partial';
      await client.query(`
        UPDATE ${this.fullTableName}
        SET status = $1, updated_at = NOW(), updated_by = $2
        WHERE id = $3 AND tenant_id = $4
      `, [newStatus, ctx.userId, orderId, ctx.tenantId]);

      await this.commitTransaction(client);
      return this.findById(ctx, orderId);
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Get purchase summary
   */
  async getPurchaseSummary(ctx: TenantContext, startDate: Date, endDate: Date): Promise<{
    total_orders: number;
    total_amount: number;
    average_order_value: number;
    orders_by_status: Record<string, number>;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM ${this.fullTableName}
      WHERE tenant_id = $1 
        AND deleted_at IS NULL
        AND order_date BETWEEN $2 AND $3
    `;

    const statusSql = `
      SELECT status, COUNT(*) as count
      FROM ${this.fullTableName}
      WHERE tenant_id = $1 
        AND deleted_at IS NULL
        AND order_date BETWEEN $2 AND $3
      GROUP BY status
    `;

    const [summary, statusCounts] = await Promise.all([
      this.rawQuery(ctx, sql, [startDate, endDate]),
      this.rawQuery<{ status: string; count: string }>(ctx, statusSql, [startDate, endDate])
    ]);

    const orders_by_status: Record<string, number> = {};
    statusCounts.forEach(row => {
      orders_by_status[row.status] = parseInt(row.count, 10);
    });

    return {
      total_orders: parseInt(summary[0]?.total_orders || '0', 10),
      total_amount: parseFloat(summary[0]?.total_amount || '0'),
      average_order_value: parseFloat(summary[0]?.average_order_value || '0'),
      orders_by_status
    };
  }
}

// Singleton instance
export const purchaseOrderRepository = new PurchaseOrderRepository();
export default purchaseOrderRepository;
