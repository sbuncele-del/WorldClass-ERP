import { pool } from '../../config/database';

export interface ChartAccount {
  account_id: number;
  tenant_id: string;
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parent_account_id?: number;
  description?: string;
  is_active: boolean;
  is_system_account: boolean;
  created_at: Date;
  updated_at: Date;
}

export class ChartOfAccountsService {

  async getAllAccounts(tenantId: string, filters?: {
    accountType?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<ChartAccount[]> {
    let query = `
      SELECT
        account_id, tenant_id, account_code, account_name, account_type,
        parent_account_id, description, is_active, is_system_account,
        created_at, updated_at
      FROM chart_of_accounts
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters?.accountType) {
      query += ` AND account_type = $${paramIndex}`;
      params.push(filters.accountType);
      paramIndex++;
    }

    if (filters?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (account_code ILIKE $${paramIndex} OR account_name ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY account_code`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getAccountById(tenantId: string, accountId: number): Promise<ChartAccount | null> {
    const result = await pool.query(
      `SELECT
        account_id, tenant_id, account_code, account_name, account_type,
        parent_account_id, description, is_active, is_system_account,
        created_at, updated_at
      FROM chart_of_accounts
      WHERE account_id = $1 AND tenant_id = $2`,
      [accountId, tenantId]
    );
    return result.rows[0] || null;
  }

  async createAccount(tenantId: string, data: {
    account_code: string;
    account_name: string;
    account_type: string;
    parent_account_id?: number;
    description?: string;
    is_active?: boolean;
  }): Promise<ChartAccount> {
    const result = await pool.query(
      `INSERT INTO chart_of_accounts (
        tenant_id, account_code, account_name, account_type, parent_account_id,
        description, is_active, is_system_account, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW())
      RETURNING *`,
      [
        tenantId,
        data.account_code,
        data.account_name,
        data.account_type,
        data.parent_account_id || null,
        data.description || null,
        data.is_active !== undefined ? data.is_active : true,
      ]
    );
    return result.rows[0];
  }

  async updateAccount(
    tenantId: string,
    accountId: number,
    data: {
      account_name?: string;
      description?: string;
      is_active?: boolean;
    }
  ): Promise<ChartAccount | null> {
    const updates: string[] = [];
    const params: any[] = [tenantId, accountId];
    let paramIndex = 3;

    if (data.account_name !== undefined) {
      updates.push(`account_name = $${paramIndex}`);
      params.push(data.account_name);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.getAccountById(tenantId, accountId);
    }

    updates.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE chart_of_accounts
      SET ${updates.join(', ')}
      WHERE account_id = $2 AND tenant_id = $1
      RETURNING *`,
      params
    );

    return result.rows[0] || null;
  }

  async deleteAccount(tenantId: string, accountId: number): Promise<boolean> {
    // Ensure account belongs to this tenant before checking usage
    const ownership = await pool.query(
      `SELECT account_id FROM chart_of_accounts WHERE account_id = $1 AND tenant_id = $2`,
      [accountId, tenantId]
    );
    if (ownership.rows.length === 0) return false;

    // Check if account is used in journal entries
    const usageCheck = await pool.query(
      `SELECT COUNT(*) as count FROM journal_entry_lines WHERE account_id = $1`,
      [accountId]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete account that has transactions');
    }

    const result = await pool.query(
      `DELETE FROM chart_of_accounts WHERE account_id = $1 AND tenant_id = $2 AND is_system_account = false`,
      [accountId, tenantId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getChildAccounts(tenantId: string, parentId: number): Promise<ChartAccount[]> {
    const result = await pool.query(
      `SELECT * FROM chart_of_accounts WHERE parent_account_id = $1 AND tenant_id = $2 ORDER BY account_code`,
      [parentId, tenantId]
    );
    return result.rows;
  }

  async getAccountTree(tenantId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM chart_of_accounts WHERE is_active = true AND tenant_id = $1 ORDER BY account_code`,
      [tenantId]
    );

    const accounts = result.rows;
    const accountMap = new Map<number, any>();
    const rootAccounts: any[] = [];

    accounts.forEach((acc) => {
      accountMap.set(acc.account_id, { ...acc, children: [] });
    });

    accounts.forEach((acc) => {
      const node = accountMap.get(acc.account_id);
      if (acc.parent_account_id) {
        const parent = accountMap.get(acc.parent_account_id);
        if (parent) {
          parent.children.push(node);
        } else {
          rootAccounts.push(node);
        }
      } else {
        rootAccounts.push(node);
      }
    });

    return rootAccounts;
  }

  async seedDefaultAccounts(tenantId: string): Promise<{ created: number; accounts: ChartAccount[] }> {
    const defaultAccounts = [
      // Assets (1xxx)
      { code: '1000', name: 'Assets', type: 'ASSET' },
      { code: '1100', name: 'Bank Accounts', type: 'ASSET' },
      { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
      { code: '1300', name: 'Inventory', type: 'ASSET' },
      { code: '1400', name: 'Prepaid Expenses', type: 'ASSET' },
      { code: '1500', name: 'Fixed Assets', type: 'ASSET' },
      { code: '1510', name: 'Property & Equipment', type: 'ASSET' },
      { code: '1520', name: 'Accumulated Depreciation', type: 'ASSET' },

      // Liabilities (2xxx)
      { code: '2000', name: 'Liabilities', type: 'LIABILITY' },
      { code: '2100', name: 'Accounts Payable', type: 'LIABILITY' },
      { code: '2200', name: 'Accrued Expenses', type: 'LIABILITY' },
      { code: '2300', name: 'Short-term Loans', type: 'LIABILITY' },
      { code: '2400', name: 'Long-term Loans', type: 'LIABILITY' },
      { code: '2500', name: 'Tax Payable', type: 'LIABILITY' },

      // Equity (3xxx)
      { code: '3000', name: 'Equity', type: 'EQUITY' },
      { code: '3100', name: 'Share Capital', type: 'EQUITY' },
      { code: '3200', name: 'Retained Earnings', type: 'EQUITY' },
      { code: '3300', name: 'Current Year Earnings', type: 'EQUITY' },

      // Revenue (4xxx)
      { code: '4000', name: 'Revenue', type: 'REVENUE' },
      { code: '4100', name: 'Sales Revenue', type: 'REVENUE' },
      { code: '4200', name: 'Service Revenue', type: 'REVENUE' },
      { code: '4300', name: 'Other Income', type: 'REVENUE' },
      { code: '4400', name: 'Interest Income', type: 'REVENUE' },

      // Cost of Sales (5xxx)
      { code: '5000', name: 'Cost of Sales', type: 'EXPENSE' },
      { code: '5100', name: 'Bank Charges & Fees', type: 'EXPENSE' },
      { code: '5200', name: 'Purchase Costs', type: 'EXPENSE' },
      { code: '5300', name: 'Direct Labor', type: 'EXPENSE' },

      // Operating Expenses (6xxx)
      { code: '6000', name: 'Operating Expenses', type: 'EXPENSE' },
      { code: '6100', name: 'Salaries & Wages', type: 'EXPENSE' },
      { code: '6200', name: 'Rent Expense', type: 'EXPENSE' },
      { code: '6300', name: 'Utilities', type: 'EXPENSE' },
      { code: '6400', name: 'Office Supplies', type: 'EXPENSE' },
      { code: '6500', name: 'Insurance', type: 'EXPENSE' },
      { code: '6600', name: 'Marketing & Advertising', type: 'EXPENSE' },
      { code: '6700', name: 'Travel & Entertainment', type: 'EXPENSE' },
      { code: '6800', name: 'Professional Fees', type: 'EXPENSE' },
      { code: '6900', name: 'Depreciation Expense', type: 'EXPENSE' },
      { code: '6950', name: 'Miscellaneous Expenses', type: 'EXPENSE' },
    ];

    const createdAccounts: ChartAccount[] = [];

    for (const acc of defaultAccounts) {
      // Check if account already exists FOR THIS TENANT
      const existing = await pool.query(
        `SELECT account_id FROM chart_of_accounts WHERE account_code = $1 AND tenant_id = $2`,
        [acc.code, tenantId]
      );

      if (existing.rows.length === 0) {
        const result = await pool.query(
          `INSERT INTO chart_of_accounts (
            tenant_id, account_code, account_name, account_type, is_active, is_system_account, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
          RETURNING *`,
          [tenantId, acc.code, acc.name, acc.type]
        );
        createdAccounts.push(result.rows[0]);
      }
    }

    return { created: createdAccounts.length, accounts: createdAccounts };
  }
}
