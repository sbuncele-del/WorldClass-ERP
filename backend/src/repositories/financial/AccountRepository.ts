/**
 * Account Repository (Chart of Accounts)
 * 
 * Handles all database operations for GL accounts
 * with automatic tenant isolation.
 */

import { BaseRepository, TenantContext, PaginatedResult, PaginationOptions } from '../BaseRepository';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  tenant_id: string;
  account_number: string;
  name: string;
  description?: string;
  account_type: AccountType;
  parent_id?: string;
  is_header: boolean;
  is_active: boolean;
  is_system: boolean;  // System accounts can't be deleted
  currency_code?: string;
  opening_balance?: number;
  current_balance?: number;
  created_at: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
  deleted_at?: Date;
}

export class AccountRepository extends BaseRepository<Account> {
  protected tableName = 'accounts';
  protected schema = 'financial';

  /**
   * Get chart of accounts tree
   */
  async getChartOfAccounts(ctx: TenantContext): Promise<Account[]> {
    const sql = `
      WITH RECURSIVE account_tree AS (
        SELECT *, 0 as level
        FROM ${this.fullTableName}
        WHERE tenant_id = $1 AND parent_id IS NULL AND deleted_at IS NULL
        
        UNION ALL
        
        SELECT a.*, at.level + 1
        FROM ${this.fullTableName} a
        INNER JOIN account_tree at ON a.parent_id = at.id
        WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
      )
      SELECT * FROM account_tree ORDER BY account_number
    `;

    return this.rawQuery(ctx, sql);
  }

  /**
   * Get accounts by type
   */
  async getAccountsByType(ctx: TenantContext, accountType: AccountType): Promise<Account[]> {
    return this.findBy(ctx, 'account_type', accountType);
  }

  /**
   * Get posting accounts only (non-header accounts)
   */
  async getPostingAccounts(ctx: TenantContext): Promise<Account[]> {
    const result = await this.findAll(ctx, { is_header: false, is_active: true });
    return result.data;
  }

  /**
   * Check if account number is unique
   */
  async isAccountNumberUnique(ctx: TenantContext, accountNumber: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findOne(ctx, { account_number: accountNumber });
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }

  /**
   * Get account balance
   */
  async getAccountBalance(ctx: TenantContext, accountId: string, asOfDate?: Date): Promise<number> {
    const dateCondition = asOfDate ? 'AND je.posting_date <= $3' : '';
    const params: any[] = [accountId];
    if (asOfDate) params.push(asOfDate);

    const sql = `
      SELECT 
        COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
      FROM financial.journal_entry_lines jel
      JOIN financial.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.tenant_id = $1 AND jel.account_id = $2 AND je.status = 'posted' ${dateCondition}
    `;

    const result = await this.rawQuery(ctx, sql, params);
    return parseFloat(result[0]?.balance || '0');
  }

  /**
   * Get trial balance
   */
  async getTrialBalance(ctx: TenantContext, asOfDate: Date): Promise<{
    account_id: string;
    account_number: string;
    account_name: string;
    account_type: AccountType;
    debit_balance: number;
    credit_balance: number;
  }[]> {
    const sql = `
      SELECT 
        a.id as account_id,
        a.account_number,
        a.name as account_name,
        a.account_type,
        CASE WHEN SUM(jel.debit_amount - jel.credit_amount) > 0 
          THEN SUM(jel.debit_amount - jel.credit_amount) ELSE 0 END as debit_balance,
        CASE WHEN SUM(jel.debit_amount - jel.credit_amount) < 0 
          THEN ABS(SUM(jel.debit_amount - jel.credit_amount)) ELSE 0 END as credit_balance
      FROM ${this.fullTableName} a
      LEFT JOIN financial.journal_entry_lines jel ON jel.account_id = a.id AND jel.tenant_id = a.tenant_id
      LEFT JOIN financial.journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted' AND je.posting_date <= $2
      WHERE a.tenant_id = $1 AND a.deleted_at IS NULL AND a.is_header = false
      GROUP BY a.id, a.account_number, a.name, a.account_type
      HAVING SUM(jel.debit_amount - jel.credit_amount) != 0 OR SUM(jel.debit_amount - jel.credit_amount) IS NULL
      ORDER BY a.account_number
    `;

    return this.rawQuery(ctx, sql, [asOfDate]);
  }
}

// Singleton instance
export const accountRepository = new AccountRepository();
export default accountRepository;
