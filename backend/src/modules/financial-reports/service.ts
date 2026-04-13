import { Pool } from 'pg';

export class FinancialReportsService {
  private pool: Pool;

  constructor() {
    // Determine SSL config for managed databases (AWS RDS and DigitalOcean)
    const dbHost = process.env.DB_HOST || '';
    const needsSsl = dbHost.includes('rds.amazonaws.com') || 
                     dbHost.includes('.db.ondigitalocean.com') ||
                     process.env.DB_SSL === 'true';
    const sslConfig = needsSsl
      ? { rejectUnauthorized: false }
      : (process.env.DB_SSL === 'false' ? false : undefined);

    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslConfig
    });
  }

  /**
   * Get Trial Balance
   * Shows all accounts with their debit/credit totals and balances
   */
  async getTrialBalance(filters: {
    asOfDate?: string;
    tenantId: string;
    includeZeroBalances?: boolean;
  }) {
    const asOfCondition = filters.asOfDate
      ? 'AND je.entry_date <= $1'
      : '';
    const params = filters.asOfDate ? [filters.asOfDate] : [];

    const query = `
      SELECT 
        coa.account_code as account_code,
        coa.account_name as account_name,
        coa.account_type,
        coa.parent_account_id,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits,
        COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.account_id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE coa.is_active = true
        AND (UPPER(je.status) = 'POSTED' OR jel.journal_entry_id IS NULL)
        ${asOfCondition}
      GROUP BY coa.account_id, coa.account_code, coa.account_name, coa.account_type, coa.parent_account_id
      ${filters.includeZeroBalances ? '' : 'HAVING COALESCE(SUM(jel.debit_amount), 0) <> 0 OR COALESCE(SUM(jel.credit_amount), 0) <> 0'}
      ORDER BY coa.account_code
    `;

    const result = await this.pool.query(query, params);

    // Calculate totals
    const totals = result.rows.reduce(
      (acc, row) => ({
        totalDebits: acc.totalDebits + parseFloat(row.total_debits),
        totalCredits: acc.totalCredits + parseFloat(row.total_credits),
      }),
      { totalDebits: 0, totalCredits: 0 }
    );

    return {
      accounts: result.rows,
      totals,
      asOfDate: filters.asOfDate || new Date().toISOString().split('T')[0],
      inBalance: Math.abs(totals.totalDebits - totals.totalCredits) < 0.01,
    };
  }

  /**
   * Get Balance Sheet
   * Assets, Liabilities, and Equity
   */
  async getBalanceSheet(filters: {
    asOfDate?: string;
    tenantId: string;
  }) {
    const trialBalance = await this.getTrialBalance({
      ...filters,
      includeZeroBalances: false,
    });

    const assets = trialBalance.accounts.filter(
      (a) => a.account_type.toUpperCase() === 'ASSET'
    );
    const liabilities = trialBalance.accounts.filter(
      (a) => a.account_type.toUpperCase() === 'LIABILITY'
    );
    const equity = trialBalance.accounts.filter(
      (a) => a.account_type.toUpperCase() === 'EQUITY'
    );

    const totalAssets = assets.reduce(
      (sum, a) => sum + parseFloat(a.balance),
      0
    );
    const totalLiabilities = liabilities.reduce(
      (sum, a) => sum + parseFloat(a.balance),
      0
    );
    const totalEquity = equity.reduce((sum, a) => sum + parseFloat(a.balance), 0);

    return {
      assets,
      liabilities,
      equity,
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        netWorth: totalAssets - totalLiabilities,
      },
      asOfDate: filters.asOfDate || new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Get Profit & Loss Statement (Income Statement)
   * Revenue and Expenses for a period
   */
  async getProfitAndLoss(filters: {
    fromDate: string;
    toDate: string;
    tenantId: string;
  }) {
    const query = `
      SELECT 
        coa.account_code as account_code,
        coa.account_name as account_name,
        coa.account_type,
        COALESCE(SUM(jel.debit_amount), 0) as debits,
        COALESCE(SUM(jel.credit_amount), 0) as credits
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE UPPER(je.status) = 'POSTED'
        AND je.posting_date BETWEEN $1 AND $2
        AND UPPER(coa.account_type) IN ('REVENUE', 'EXPENSE')
      GROUP BY coa.account_code, coa.account_name, coa.account_type
      ORDER BY coa.account_type DESC, coa.account_code
    `;

    const result = await this.pool.query(query, [
      filters.fromDate,
      filters.toDate,
    ]);

    const revenue = result.rows
      .filter((r) => r.account_type.toUpperCase() === 'REVENUE')
      .map((r) => ({
        ...r,
        amount: parseFloat(r.credits) - parseFloat(r.debits),
      }));

    const expenses = result.rows
      .filter((r) => r.account_type.toUpperCase() === 'EXPENSE')
      .map((r) => ({
        ...r,
        amount: parseFloat(r.debits) - parseFloat(r.credits),
      }));

    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, r) => sum + r.amount, 0);

    return {
      revenue,
      expenses,
      totals: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        grossMargin:
          totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      },
      period: {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      },
    };
  }

  /**
   * Get Account Transactions
   * All GL transactions for a specific account
   */
  async getAccountTransactions(filters: {
    accountId: number;
    fromDate?: string;
    toDate?: string;
    tenantId: string;
    limit?: number;
    offset?: number;
  }) {
    const dateCondition =
      filters.fromDate && filters.toDate
        ? 'AND je.entry_date BETWEEN $2 AND $3'
        : '';
    
    const params: any[] = [filters.accountId];
    if (filters.fromDate && filters.toDate) {
      params.push(filters.fromDate, filters.toDate);
    }

    const query = `
      SELECT 
        jel.id as id,
        je.posting_date as transaction_date,
        je.posting_date,
        jel.description as description,
        je.reference,
        jel.debit_amount,
        jel.credit_amount,
        0 as running_balance,
        je.source_type,
        je.source_id,
        je.entry_number as journal_entry_number,
        je.posted_at
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_id = $1 
        AND UPPER(je.status) = 'POSTED'
        ${dateCondition}
      ORDER BY je.entry_date DESC, jel.line_id DESC
      ${filters.limit ? `LIMIT ${filters.limit}` : ''}
      ${filters.offset ? `OFFSET ${filters.offset}` : ''}
    `;

    const result = await this.pool.query(query, params);

    // Get account info - calculate current balance from all transactions
    const accountQuery = `
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as current_balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.account_id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.account_id = $1
        AND (UPPER(je.status) = 'POSTED' OR jel.journal_entry_id IS NULL)
      GROUP BY coa.account_id, coa.account_code, coa.account_name, coa.account_type
    `;
    const accountResult = await this.pool.query(accountQuery, [
      filters.accountId,
    ]);

    return {
      account: accountResult.rows[0] || null,
      transactions: result.rows,
      count: result.rows.length,
    };
  }

  /**
   * Get Cash Flow Statement
   * Operating, Investing, and Financing activities
   */
  async getCashFlow(filters: {
    fromDate: string;
    toDate: string;
    tenantId: string;
  }) {
    // Get all cash/bank account transactions
    const query = `
      SELECT 
        je.posting_date as transaction_date,
        coa.account_code,
        coa.account_name,
        jel.description as description,
        jel.debit_amount,
        jel.credit_amount,
        je.source_type
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE UPPER(je.status) = 'POSTED'
        AND je.posting_date BETWEEN $1 AND $2
        AND coa.account_type = 'ASSET'
        AND (coa.account_code LIKE '11%' OR coa.account_name ILIKE '%cash%' OR coa.account_name ILIKE '%bank%')
      ORDER BY je.entry_date, jel.line_id
    `;

    const result = await this.pool.query(query, [
      filters.fromDate,
      filters.toDate,
    ]);

    // Simple cash flow: total cash in - total cash out
    const cashIn = result.rows.reduce(
      (sum, t) => sum + parseFloat(t.debit_amount || '0'),
      0
    );
    const cashOut = result.rows.reduce(
      (sum, t) => sum + parseFloat(t.credit_amount || '0'),
      0
    );

    return {
      transactions: result.rows,
      summary: {
        cashIn,
        cashOut,
        netCashFlow: cashIn - cashOut,
      },
      period: {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      },
    };
  }

  /**
   * Get General Ledger Report
   * All account transactions with running balances
   */
  async getGeneralLedger(filters: {
    fromDate?: string;
    toDate?: string;
    accountId?: string;
    tenantId: string;
  }) {
    let whereClause = "UPPER(je.status) = 'POSTED'";
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.fromDate) {
      whereClause += ` AND je.posting_date >= $${paramIndex}`;
      params.push(filters.fromDate);
      paramIndex++;
    }
    if (filters.toDate) {
      whereClause += ` AND je.posting_date <= $${paramIndex}`;
      params.push(filters.toDate);
      paramIndex++;
    }
    if (filters.accountId) {
      whereClause += ` AND coa.account_id = $${paramIndex}`;
      params.push(filters.accountId);
      paramIndex++;
    }

    const query = `
      SELECT 
        coa.account_id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        je.posting_date,
        je.entry_number,
        je.reference,
        jel.description,
        jel.debit_amount,
        jel.credit_amount,
        je.source_type
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE ${whereClause}
      ORDER BY coa.account_code, je.posting_date, je.entry_number
    `;

    const result = await this.pool.query(query, params);

    // Group by account and calculate running balances
    const accountsMap = new Map<string, any>();
    
    for (const row of result.rows) {
      const key = row.account_id;
      if (!accountsMap.has(key)) {
        accountsMap.set(key, {
          accountId: row.account_id,
          accountCode: row.account_code,
          accountName: row.account_name,
          accountType: row.account_type,
          transactions: [],
          openingBalance: 0,
          closingBalance: 0,
        });
      }
      
      const account = accountsMap.get(key);
      const debit = parseFloat(row.debit_amount || '0');
      const credit = parseFloat(row.credit_amount || '0');
      account.closingBalance += (debit - credit);
      
      account.transactions.push({
        date: row.posting_date,
        entryNumber: row.entry_number,
        reference: row.reference,
        description: row.description,
        debit,
        credit,
        runningBalance: account.closingBalance,
        sourceType: row.source_type,
      });
    }

    const accounts = Array.from(accountsMap.values());
    
    // Calculate totals
    const totals = accounts.reduce((acc, a) => ({
      totalDebits: acc.totalDebits + a.transactions.reduce((s: number, t: any) => s + t.debit, 0),
      totalCredits: acc.totalCredits + a.transactions.reduce((s: number, t: any) => s + t.credit, 0),
    }), { totalDebits: 0, totalCredits: 0 });

    return {
      accounts,
      totals,
      period: {
        fromDate: filters.fromDate || 'Beginning',
        toDate: filters.toDate || new Date().toISOString().split('T')[0],
      },
    };
  }

  /**
   * Get Aged Receivables Report
   * Customer balances broken down by aging buckets (Current, 30, 60, 90+ days)
   */
  async getAgedReceivables(filters: {
    asOfDate: string;
    tenantId: string;
  }) {
    // Get all AR transactions from accounts receivable accounts (without requiring customers table)
    const query = `
      WITH ar_transactions AS (
        SELECT 
          je.reference as customer_ref,
          jel.description,
          je.posting_date,
          jel.debit_amount,
          jel.credit_amount,
          $1::date - je.posting_date as days_old
        FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE UPPER(je.status) = 'POSTED'
          AND je.posting_date <= $1
          AND (coa.account_code LIKE '12%' OR coa.account_name ILIKE '%receivable%')
      )
      SELECT 
        COALESCE(customer_ref, 'General') as customer_id,
        COALESCE(customer_ref, 'General Receivables') as customer_name,
        NULL as customer_email,
        SUM(CASE WHEN days_old <= 0 THEN debit_amount - credit_amount ELSE 0 END) as current_amount,
        SUM(CASE WHEN days_old BETWEEN 1 AND 30 THEN debit_amount - credit_amount ELSE 0 END) as days_1_30,
        SUM(CASE WHEN days_old BETWEEN 31 AND 60 THEN debit_amount - credit_amount ELSE 0 END) as days_31_60,
        SUM(CASE WHEN days_old BETWEEN 61 AND 90 THEN debit_amount - credit_amount ELSE 0 END) as days_61_90,
        SUM(CASE WHEN days_old > 90 THEN debit_amount - credit_amount ELSE 0 END) as over_90,
        SUM(debit_amount - credit_amount) as total_balance
      FROM ar_transactions
      GROUP BY customer_ref
      HAVING SUM(debit_amount - credit_amount) <> 0
      ORDER BY total_balance DESC
    `;

    const result = await this.pool.query(query, [filters.asOfDate]);

    // Calculate totals
    const totals = result.rows.reduce((acc, row) => ({
      current: acc.current + parseFloat(row.current_amount || '0'),
      days1_30: acc.days1_30 + parseFloat(row.days_1_30 || '0'),
      days31_60: acc.days31_60 + parseFloat(row.days_31_60 || '0'),
      days61_90: acc.days61_90 + parseFloat(row.days_61_90 || '0'),
      over90: acc.over90 + parseFloat(row.over_90 || '0'),
      total: acc.total + parseFloat(row.total_balance || '0'),
    }), { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 });

    return {
      customers: result.rows.map(row => ({
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        current: parseFloat(row.current_amount || '0'),
        days1_30: parseFloat(row.days_1_30 || '0'),
        days31_60: parseFloat(row.days_31_60 || '0'),
        days61_90: parseFloat(row.days_61_90 || '0'),
        over90: parseFloat(row.over_90 || '0'),
        total: parseFloat(row.total_balance || '0'),
      })),
      totals,
      asOfDate: filters.asOfDate,
    };
  }

  /**
   * Get Aged Payables Report
   * Vendor balances broken down by aging buckets (Current, 30, 60, 90+ days)
   */
  async getAgedPayables(filters: {
    asOfDate: string;
    tenantId: string;
  }) {
    // Get all AP transactions from accounts payable accounts (without requiring suppliers table)
    const query = `
      WITH ap_transactions AS (
        SELECT 
          je.reference as vendor_ref,
          jel.description,
          je.posting_date,
          jel.debit_amount,
          jel.credit_amount,
          $1::date - je.posting_date as days_old
        FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE UPPER(je.status) = 'POSTED'
          AND je.posting_date <= $1
          AND (coa.account_code LIKE '21%' OR coa.account_name ILIKE '%payable%')
      )
      SELECT 
        COALESCE(vendor_ref, 'General') as vendor_id,
        COALESCE(vendor_ref, 'General Payables') as vendor_name,
        NULL as vendor_email,
        SUM(CASE WHEN days_old <= 0 THEN credit_amount - debit_amount ELSE 0 END) as current_amount,
        SUM(CASE WHEN days_old BETWEEN 1 AND 30 THEN credit_amount - debit_amount ELSE 0 END) as days_1_30,
        SUM(CASE WHEN days_old BETWEEN 31 AND 60 THEN credit_amount - debit_amount ELSE 0 END) as days_31_60,
        SUM(CASE WHEN days_old BETWEEN 61 AND 90 THEN credit_amount - debit_amount ELSE 0 END) as days_61_90,
        SUM(CASE WHEN days_old > 90 THEN credit_amount - debit_amount ELSE 0 END) as over_90,
        SUM(credit_amount - debit_amount) as total_balance
      FROM ap_transactions
      GROUP BY vendor_ref
      HAVING SUM(credit_amount - debit_amount) <> 0
      ORDER BY total_balance DESC
    `;

    const result = await this.pool.query(query, [filters.asOfDate]);

    // Calculate totals
    const totals = result.rows.reduce((acc, row) => ({
      current: acc.current + parseFloat(row.current_amount || '0'),
      days1_30: acc.days1_30 + parseFloat(row.days_1_30 || '0'),
      days31_60: acc.days31_60 + parseFloat(row.days_31_60 || '0'),
      days61_90: acc.days61_90 + parseFloat(row.days_61_90 || '0'),
      over90: acc.over90 + parseFloat(row.over_90 || '0'),
      total: acc.total + parseFloat(row.total_balance || '0'),
    }), { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 });

    return {
      vendors: result.rows.map(row => ({
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        vendorEmail: row.vendor_email,
        current: parseFloat(row.current_amount || '0'),
        days1_30: parseFloat(row.days_1_30 || '0'),
        days31_60: parseFloat(row.days_31_60 || '0'),
        days61_90: parseFloat(row.days_61_90 || '0'),
        over90: parseFloat(row.over_90 || '0'),
        total: parseFloat(row.total_balance || '0'),
      })),
      totals,
      asOfDate: filters.asOfDate,
    };
  }

  /**
   * Get VAT Report
   * Input VAT vs Output VAT for SARS compliance (South Africa)
   */
  async getVatReport(filters: {
    fromDate: string;
    toDate: string;
    tenantId: string;
  }) {
    // Output VAT (collected from sales) - typically account code starts with 22 or contains "VAT Output"
    const outputVatQuery = `
      SELECT 
        coa.account_code,
        coa.account_name,
        je.posting_date,
        je.entry_number,
        je.reference,
        jel.description,
        jel.credit_amount as vat_amount
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE UPPER(je.status) = 'POSTED'
        AND je.posting_date BETWEEN $1 AND $2
        AND (coa.account_name ILIKE '%vat output%' OR coa.account_name ILIKE '%output vat%' OR coa.account_code LIKE '2200%')
        AND jel.credit_amount > 0
      ORDER BY je.posting_date
    `;

    // Input VAT (paid on purchases) - typically account code starts with 14 or contains "VAT Input"
    const inputVatQuery = `
      SELECT 
        coa.account_code,
        coa.account_name,
        je.posting_date,
        je.entry_number,
        je.reference,
        jel.description,
        jel.debit_amount as vat_amount
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.account_id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE UPPER(je.status) = 'POSTED'
        AND je.posting_date BETWEEN $1 AND $2
        AND (coa.account_name ILIKE '%vat input%' OR coa.account_name ILIKE '%input vat%' OR coa.account_code LIKE '1400%')
        AND jel.debit_amount > 0
      ORDER BY je.posting_date
    `;

    const [outputResult, inputResult] = await Promise.all([
      this.pool.query(outputVatQuery, [filters.fromDate, filters.toDate]),
      this.pool.query(inputVatQuery, [filters.fromDate, filters.toDate]),
    ]);

    const totalOutputVat = outputResult.rows.reduce(
      (sum, r) => sum + parseFloat(r.vat_amount || '0'), 0
    );
    const totalInputVat = inputResult.rows.reduce(
      (sum, r) => sum + parseFloat(r.vat_amount || '0'), 0
    );

    return {
      outputVat: {
        transactions: outputResult.rows.map(r => ({
          date: r.posting_date,
          entryNumber: r.entry_number,
          reference: r.reference,
          description: r.description,
          amount: parseFloat(r.vat_amount || '0'),
        })),
        total: totalOutputVat,
      },
      inputVat: {
        transactions: inputResult.rows.map(r => ({
          date: r.posting_date,
          entryNumber: r.entry_number,
          reference: r.reference,
          description: r.description,
          amount: parseFloat(r.vat_amount || '0'),
        })),
        total: totalInputVat,
      },
      summary: {
        totalOutputVat,
        totalInputVat,
        netVatPayable: totalOutputVat - totalInputVat,
        vatRate: 15, // South Africa VAT rate
      },
      period: {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      },
    };
  }
}
