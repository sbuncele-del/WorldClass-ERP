/**
 * Customer Repository
 * 
 * Handles all database operations for customers/clients
 * with automatic tenant isolation.
 */

import { BaseRepository, TenantContext, PaginatedResult, PaginationOptions } from '../BaseRepository';

export interface Customer {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  trading_name?: string;
  customer_type: 'individual' | 'company';
  tax_number?: string;
  registration_number?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  shipping_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  credit_limit?: number;
  payment_terms?: number;  // Days
  currency_code?: string;
  price_list_id?: string;
  sales_rep_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
  deleted_at?: Date;
}

export interface CustomerBalance {
  customer_id: string;
  total_invoiced: number;
  total_paid: number;
  balance_due: number;
  overdue_amount: number;
}

export class CustomerRepository extends BaseRepository<Customer> {
  protected tableName = 'customers';
  protected schema = 'sales';

  /**
   * Get all active customers
   */
  async getActiveCustomers(ctx: TenantContext): Promise<Customer[]> {
    const result = await this.findAll(ctx, { is_active: true }, { limit: 1000 });
    return result.data;
  }

  /**
   * Search customers by name, code, email, or phone
   */
  async search(
    ctx: TenantContext,
    searchTerm: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Customer>> {
    const { page = 1, limit = 50 } = pagination || {};
    const offset = (page - 1) * limit;
    const searchPattern = `%${searchTerm}%`;

    const sql = `
      SELECT * FROM ${this.fullTableName}
      WHERE tenant_id = $1 
        AND deleted_at IS NULL
        AND (
          name ILIKE $2 
          OR code ILIKE $2 
          OR trading_name ILIKE $2
          OR email ILIKE $2 
          OR phone ILIKE $2
          OR tax_number ILIKE $2
        )
      ORDER BY name
      LIMIT $3 OFFSET $4
    `;

    const countSql = `
      SELECT COUNT(*) FROM ${this.fullTableName}
      WHERE tenant_id = $1 
        AND deleted_at IS NULL
        AND (
          name ILIKE $2 
          OR code ILIKE $2 
          OR trading_name ILIKE $2
          OR email ILIKE $2 
          OR phone ILIKE $2
          OR tax_number ILIKE $2
        )
    `;

    const [data, countResult] = await Promise.all([
      this.rawQuery<Customer>(ctx, sql, [searchPattern, limit, offset]),
      this.rawQuery<{ count: string }>(ctx, countSql, [searchPattern])
    ]);

    const total = parseInt(countResult[0]?.count || '0', 10);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Get customer with balance information
   */
  async getCustomerWithBalance(ctx: TenantContext, customerId: string): Promise<(Customer & CustomerBalance) | null> {
    const sql = `
      SELECT 
        c.*,
        COALESCE(SUM(i.total_amount), 0) as total_invoiced,
        COALESCE(SUM(i.amount_paid), 0) as total_paid,
        COALESCE(SUM(i.total_amount - i.amount_paid), 0) as balance_due,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' 
          THEN i.total_amount - i.amount_paid ELSE 0 END), 0) as overdue_amount
      FROM ${this.fullTableName} c
      LEFT JOIN sales.invoices i ON i.customer_id = c.id AND i.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1 AND c.id = $2 AND c.deleted_at IS NULL
      GROUP BY c.id
    `;

    const result = await this.rawQuery(ctx, sql, [customerId]);
    return result[0] || null;
  }

  /**
   * Get customers with outstanding balances
   */
  async getCustomersWithBalances(ctx: TenantContext): Promise<(Customer & CustomerBalance)[]> {
    const sql = `
      SELECT 
        c.*,
        COALESCE(SUM(i.total_amount), 0) as total_invoiced,
        COALESCE(SUM(i.amount_paid), 0) as total_paid,
        COALESCE(SUM(i.total_amount - i.amount_paid), 0) as balance_due,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' 
          THEN i.total_amount - i.amount_paid ELSE 0 END), 0) as overdue_amount
      FROM ${this.fullTableName} c
      LEFT JOIN sales.invoices i ON i.customer_id = c.id AND i.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1 AND c.deleted_at IS NULL AND c.is_active = true
      GROUP BY c.id
      HAVING COALESCE(SUM(i.total_amount - i.amount_paid), 0) > 0
      ORDER BY balance_due DESC
    `;

    return this.rawQuery(ctx, sql);
  }

  /**
   * Get overdue customers
   */
  async getOverdueCustomers(ctx: TenantContext): Promise<(Customer & { overdue_amount: number; oldest_overdue: Date })[]> {
    const sql = `
      SELECT 
        c.*,
        SUM(i.total_amount - i.amount_paid) as overdue_amount,
        MIN(i.due_date) as oldest_overdue
      FROM ${this.fullTableName} c
      INNER JOIN sales.invoices i ON i.customer_id = c.id AND i.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1 
        AND c.deleted_at IS NULL
        AND i.due_date < CURRENT_DATE 
        AND i.status != 'paid'
      GROUP BY c.id
      ORDER BY overdue_amount DESC
    `;

    return this.rawQuery(ctx, sql);
  }

  /**
   * Check if customer code is unique
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findOne(ctx, { code });
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }

  /**
   * Get customer by email
   */
  async findByEmail(ctx: TenantContext, email: string): Promise<Customer | null> {
    return this.findOne(ctx, { email });
  }

  /**
   * Update customer credit limit
   */
  async updateCreditLimit(ctx: TenantContext, customerId: string, newLimit: number): Promise<Customer | null> {
    return this.update(ctx, customerId, { credit_limit: newLimit });
  }

  /**
   * Get customers by sales rep
   */
  async getCustomersBySalesRep(ctx: TenantContext, salesRepId: string): Promise<Customer[]> {
    return this.findBy(ctx, 'sales_rep_id', salesRepId);
  }

  /**
   * Get top customers by revenue within invoices
   */
  async getTopCustomersByRevenue(ctx: TenantContext, limit: number = 5): Promise<Array<Customer & { revenue: number }>> {
    const sql = `
      SELECT c.*, COALESCE(SUM(i.total_amount), 0) AS revenue
      FROM ${this.fullTableName} c
      LEFT JOIN sales.invoices i ON i.customer_id = c.id AND i.tenant_id = c.tenant_id AND i.deleted_at IS NULL
      WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY revenue DESC
      LIMIT $2
    `;

    return this.rawQuery(ctx, sql, [limit]);
  }
}

// Singleton instance
export const customerRepository = new CustomerRepository();
export default customerRepository;
