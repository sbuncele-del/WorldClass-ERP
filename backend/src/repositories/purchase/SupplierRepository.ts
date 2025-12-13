/**
 * Supplier Repository
 * 
 * Handles all database operations for suppliers/vendors
 * with automatic tenant isolation.
 */

import { BaseRepository, TenantContext, PaginatedResult, PaginationOptions } from '../BaseRepository';

export interface Supplier {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  trading_name?: string;
  supplier_type: 'individual' | 'company';
  tax_number?: string;
  registration_number?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  bank_details?: {
    bank_name?: string;
    account_number?: string;
    branch_code?: string;
    swift_code?: string;
  };
  payment_terms?: number;
  currency_code?: string;
  default_gl_account_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
  deleted_at?: Date;
}

export interface SupplierBalance {
  supplier_id: string;
  total_invoiced: number;
  total_paid: number;
  balance_owed: number;
  overdue_amount: number;
}

export class SupplierRepository extends BaseRepository<Supplier> {
  protected tableName = 'suppliers';
  protected schema = 'purchase';

  /**
   * Get all active suppliers
   */
  async getActiveSuppliers(ctx: TenantContext): Promise<Supplier[]> {
    const result = await this.findAll(ctx, { is_active: true }, { limit: 1000 });
    return result.data;
  }

  /**
   * Search suppliers
   */
  async search(
    ctx: TenantContext,
    searchTerm: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Supplier>> {
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
        )
    `;

    const [data, countResult] = await Promise.all([
      this.rawQuery<Supplier>(ctx, sql, [searchPattern, limit, offset]),
      this.rawQuery<{ count: string }>(ctx, countSql, [searchPattern])
    ]);

    const total = parseInt(countResult[0]?.count || '0', 10);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Get supplier with balance
   */
  async getSupplierWithBalance(ctx: TenantContext, supplierId: string): Promise<(Supplier & SupplierBalance) | null> {
    const sql = `
      SELECT 
        s.*,
        COALESCE(SUM(pi.total_amount), 0) as total_invoiced,
        COALESCE(SUM(pi.amount_paid), 0) as total_paid,
        COALESCE(SUM(pi.total_amount - pi.amount_paid), 0) as balance_owed,
        COALESCE(SUM(CASE WHEN pi.due_date < CURRENT_DATE AND pi.status != 'paid' 
          THEN pi.total_amount - pi.amount_paid ELSE 0 END), 0) as overdue_amount
      FROM ${this.fullTableName} s
      LEFT JOIN purchase.invoices pi ON pi.supplier_id = s.id AND pi.tenant_id = s.tenant_id
      WHERE s.tenant_id = $1 AND s.id = $2 AND s.deleted_at IS NULL
      GROUP BY s.id
    `;

    const result = await this.rawQuery(ctx, sql, [supplierId]);
    return result[0] || null;
  }

  /**
   * Get suppliers with outstanding balances
   */
  async getSuppliersWithBalances(ctx: TenantContext): Promise<(Supplier & SupplierBalance)[]> {
    const sql = `
      SELECT 
        s.*,
        COALESCE(SUM(pi.total_amount), 0) as total_invoiced,
        COALESCE(SUM(pi.amount_paid), 0) as total_paid,
        COALESCE(SUM(pi.total_amount - pi.amount_paid), 0) as balance_owed
      FROM ${this.fullTableName} s
      LEFT JOIN purchase.invoices pi ON pi.supplier_id = s.id AND pi.tenant_id = s.tenant_id
      WHERE s.tenant_id = $1 AND s.deleted_at IS NULL AND s.is_active = true
      GROUP BY s.id
      HAVING COALESCE(SUM(pi.total_amount - pi.amount_paid), 0) > 0
      ORDER BY balance_owed DESC
    `;

    return this.rawQuery(ctx, sql);
  }

  /**
   * Check if supplier code is unique
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findOne(ctx, { code });
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }
}

// Singleton instance
export const supplierRepository = new SupplierRepository();
export default supplierRepository;
