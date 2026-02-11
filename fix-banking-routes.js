/**
 * Patch script to add missing cash-management routes to v2.routes.js
 * Adds: overview-dashboard, cash-flow-dashboard, statement-lines, treasury/dashboard
 */
const fs = require('fs');
const routesFile = '/app/dist/routes/v2.routes.js';

let code = fs.readFileSync(routesFile, 'utf8');

// Check if already patched
if (code.includes('overview-dashboard')) {
  console.log('Routes already patched, skipping...');
  process.exit(0);
}

// Find the last cash-management route to insert after
const insertAfter = "router.get('/cash-management/bank-accounts'";
const insertIdx = code.indexOf(insertAfter);
if (insertIdx === -1) {
  console.error('Could not find insertion point');
  process.exit(1);
}

// Find the end of that route handler
let braceCount = 0;
let foundStart = false;
let endIdx = insertIdx;
for (let i = insertIdx; i < code.length; i++) {
  if (code[i] === '{') { braceCount++; foundStart = true; }
  if (code[i] === '}') { braceCount--; }
  if (foundStart && braceCount === 0) {
    // Find the closing });
    const rest = code.substring(i);
    const closeMatch = rest.match(/\}\s*\)\s*;/);
    if (closeMatch) {
      endIdx = i + closeMatch[0].length;
    } else {
      endIdx = i + 1;
    }
    break;
  }
}

const newRoutes = `

// ========== BANKING HUB ROUTES (auto-patched) ==========

// Overview Dashboard - comprehensive banking overview
router.get('/cash-management/overview-dashboard', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant required' });

    // Get bank accounts
    const accountsResult = await dbQuery(
      'SELECT id, account_name, bank_name, current_balance, currency FROM bank_accounts WHERE tenant_id = $1',
      [tenantId]
    );

    // Get current month summary from statement lines
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const monthSummaryResult = await dbQuery(\`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END), 0) as total_debits,
        COUNT(CASE WHEN transaction_type = 'credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN transaction_type = 'debit' THEN 1 END) as debit_count
      FROM bank_statement_lines 
      WHERE tenant_id = $1 AND transaction_date >= $2 AND transaction_date <= $3
    \`, [tenantId, monthStart, monthEnd]);

    // Get all-time summary if no current month data
    const allTimeSummaryResult = await dbQuery(\`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END), 0) as total_debits,
        COUNT(CASE WHEN transaction_type = 'credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN transaction_type = 'debit' THEN 1 END) as debit_count
      FROM bank_statement_lines 
      WHERE tenant_id = $1
    \`, [tenantId]);

    const monthRow = monthSummaryResult.rows[0] || {};
    const allTimeRow = allTimeSummaryResult.rows[0] || {};
    
    // Use monthly data if available, otherwise show all-time
    const summaryRow = parseInt(monthRow.total_transactions) > 0 ? monthRow : allTimeRow;

    // Reconciliation stats
    const reconResult = await dbQuery(\`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('allocated', 'reconciled') THEN 1 END) as allocated,
        COUNT(CASE WHEN status = 'unmatched' OR status IS NULL THEN 1 END) as unmatched
      FROM bank_statement_lines WHERE tenant_id = $1
    \`, [tenantId]);
    const reconRow = reconResult.rows[0] || {};
    const reconTotal = parseInt(reconRow.total) || 0;
    const reconAllocated = parseInt(reconRow.allocated) || 0;

    // Recent transactions
    const recentResult = await dbQuery(\`
      SELECT id, transaction_date, description, amount, transaction_type, status, category, reference
      FROM bank_statement_lines WHERE tenant_id = $1
      ORDER BY transaction_date DESC, created_at DESC LIMIT 15
    \`, [tenantId]);

    // Top spending categories (debits grouped by category)
    const spendingResult = await dbQuery(\`
      SELECT COALESCE(category, 'Uncategorized') as category, 
        SUM(ABS(amount)) as total, COUNT(*) as count
      FROM bank_statement_lines 
      WHERE tenant_id = $1 AND transaction_type = 'debit'
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total DESC LIMIT 5
    \`, [tenantId]);

    // Top income sources (credits grouped by category)
    const incomeResult = await dbQuery(\`
      SELECT COALESCE(category, 'Uncategorized') as category,
        SUM(amount) as total, COUNT(*) as count
      FROM bank_statement_lines
      WHERE tenant_id = $1 AND transaction_type = 'credit'
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total DESC LIMIT 5
    \`, [tenantId]);

    // Total balance across all bank accounts
    const totalBalance = accountsResult.rows.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);

    res.json({
      success: true,
      data: {
        totalBalance,
        accounts: accountsResult.rows,
        monthSummary: {
          totalTransactions: parseInt(summaryRow.total_transactions) || 0,
          totalCredits: parseFloat(summaryRow.total_credits) || 0,
          totalDebits: parseFloat(summaryRow.total_debits) || 0,
          creditCount: parseInt(summaryRow.credit_count) || 0,
          debitCount: parseInt(summaryRow.debit_count) || 0,
        },
        reconciliation: {
          reconPercent: reconTotal > 0 ? Math.round((reconAllocated / reconTotal) * 100) : 0,
          allocated: reconAllocated,
          total: reconTotal,
          unmatched: parseInt(reconRow.unmatched) || 0,
        },
        recentTransactions: recentResult.rows,
        topSpending: spendingResult.rows.map(r => ({ category: r.category, amount: parseFloat(r.total), count: parseInt(r.count) })),
        topIncome: incomeResult.rows.map(r => ({ category: r.category, amount: parseFloat(r.total), count: parseInt(r.count) })),
      }
    });
  } catch (err) {
    console.error('Overview dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load overview', error: String(err) });
  }
});

// Cash Flow Dashboard
router.get('/cash-management/cash-flow-dashboard', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant required' });

    // Monthly cash flow for last 6 months
    const monthlyResult = await dbQuery(\`
      SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as inflows,
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END), 0) as outflows,
        COUNT(*) as transactions
      FROM bank_statement_lines 
      WHERE tenant_id = $1 AND transaction_date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
      ORDER BY month
    \`, [tenantId]);

    // Current balance
    const balanceResult = await dbQuery(
      'SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE tenant_id = $1',
      [tenantId]
    );

    // Category breakdown
    const categoryResult = await dbQuery(\`
      SELECT COALESCE(category, 'Uncategorized') as category, transaction_type,
        SUM(ABS(amount)) as total, COUNT(*) as count
      FROM bank_statement_lines WHERE tenant_id = $1
      GROUP BY COALESCE(category, 'Uncategorized'), transaction_type
      ORDER BY total DESC
    \`, [tenantId]);

    res.json({
      success: true,
      data: {
        currentBalance: parseFloat(balanceResult.rows[0]?.total) || 0,
        monthly: monthlyResult.rows.map(r => ({
          month: r.month,
          inflows: parseFloat(r.inflows),
          outflows: parseFloat(r.outflows),
          net: parseFloat(r.inflows) - parseFloat(r.outflows),
          transactions: parseInt(r.transactions),
        })),
        categories: categoryResult.rows.map(r => ({
          category: r.category,
          type: r.transaction_type,
          amount: parseFloat(r.total),
          count: parseInt(r.count),
        })),
      }
    });
  } catch (err) {
    console.error('Cash flow dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load cash flow', error: String(err) });
  }
});

// Statement Lines for a bank account
router.get('/cash-management/statement-lines', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant required' });

    const bankAccountId = req.query.bank_account_id;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    let whereClause = 'WHERE bsl.tenant_id = $1';
    const params = [tenantId];
    
    if (bankAccountId) {
      params.push(bankAccountId);
      whereClause += ' AND bsl.bank_account_id = $' + params.length;
    }

    const result = await dbQuery(\`
      SELECT bsl.id, bsl.transaction_date, bsl.description, bsl.reference,
        bsl.amount, bsl.transaction_type, bsl.balance, bsl.status,
        bsl.category, bsl.allocated_gl_account_id,
        bsl.suggested_gl_account_code, bsl.suggested_gl_account_name,
        bsl.ai_confidence, bsl.ai_reason
      FROM bank_statement_lines bsl
      \${whereClause}
      ORDER BY bsl.transaction_date DESC, bsl.created_at DESC
      LIMIT $\${params.length + 1} OFFSET $\${params.length + 2}
    \`, [...params, limit, offset]);

    const countResult = await dbQuery(
      'SELECT COUNT(*) as total FROM bank_statement_lines bsl ' + whereClause,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0]?.total) || 0,
        limit,
        offset,
      }
    });
  } catch (err) {
    console.error('Statement lines error:', err);
    res.status(500).json({ success: false, message: 'Failed to load statement lines', error: String(err) });
  }
});

// Treasury Dashboard
router.get('/treasury/dashboard', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant required' });

    // Bank accounts with balances
    const accountsResult = await dbQuery(
      'SELECT id, account_name, bank_name, account_number, current_balance, currency FROM bank_accounts WHERE tenant_id = $1',
      [tenantId]
    );

    const totalBalance = accountsResult.rows.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);

    // Recent transactions from statement lines
    const recentResult = await dbQuery(\`
      SELECT bsl.id, bsl.transaction_date, bsl.description, bsl.amount, 
        bsl.transaction_type, bsl.status, ba.account_name
      FROM bank_statement_lines bsl
      LEFT JOIN bank_accounts ba ON ba.id = bsl.bank_account_id
      WHERE bsl.tenant_id = $1
      ORDER BY bsl.transaction_date DESC LIMIT 10
    \`, [tenantId]);

    res.json({
      success: true,
      data: {
        dashboard: {
          totalBalance,
          accountCount: accountsResult.rows.length,
          accounts: accountsResult.rows,
          recentTransactions: recentResult.rows,
        }
      }
    });
  } catch (err) {
    console.error('Treasury dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load treasury dashboard', error: String(err) });
  }
});

`;

// Insert the new routes after the existing bank-accounts route
code = code.substring(0, endIdx) + newRoutes + code.substring(endIdx);
fs.writeFileSync(routesFile, code, 'utf8');
console.log('Successfully added banking routes: overview-dashboard, cash-flow-dashboard, statement-lines, treasury/dashboard');
