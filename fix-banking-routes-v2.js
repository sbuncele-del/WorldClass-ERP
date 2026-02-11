/**
 * Patch script to add missing cash-management routes to v2.routes.js
 * Uses (0, database_1.query) pattern matching existing routes
 */
const fs = require('fs');
const routesFile = '/app/dist/routes/v2.routes.js';

let code = fs.readFileSync(routesFile, 'utf8');

// Remove any previously patched routes
if (code.includes('BANKING HUB ROUTES (auto-patched)')) {
  // Remove everything between the marker and the next non-patched section
  const startMarker = '\n// ========== BANKING HUB ROUTES (auto-patched) ==========';
  const startIdx = code.indexOf(startMarker);
  if (startIdx !== -1) {
    // Find the end - look for the next router. or module.exports after the patched section
    // Count through all the patched route handlers
    let searchFrom = startIdx + startMarker.length;
    let endIdx = searchFrom;
    let depth = 0;
    let routerCount = 0;
    // We added 4 routes, find the end of the 4th one
    for (let i = searchFrom; i < code.length; i++) {
      if (code.substring(i, i + 10) === 'router.get') routerCount++;
      if (routerCount >= 5) { // Next route after our 4
        endIdx = i;
        break;
      }
      if (i >= code.length - 1) endIdx = i + 1;
    }
    // Actually, just find the last }); of our 4th route by looking for the pattern
    // Let's be simpler - just remove everything from marker to next non-blank section
    // Actually, let's find the exact end by counting the router.get blocks
    let remaining = code.substring(searchFrom);
    let routeEnds = 0;
    let pos = 0;
    let braceDepth = 0;
    let inRoute = false;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining.substring(i, i+10) === 'router.get' || remaining.substring(i, i+11) === 'router.post') {
        inRoute = true;
        braceDepth = 0;
      }
      if (inRoute) {
        if (remaining[i] === '{') braceDepth++;
        if (remaining[i] === '}') {
          braceDepth--;
          if (braceDepth === 0 && remaining.substring(i, i+3) === '});') {
            routeEnds++;
            pos = i + 3;
            inRoute = false;
            if (routeEnds >= 4) break;
          }
        }
      }
    }
    if (pos > 0) {
      code = code.substring(0, startIdx) + code.substring(searchFrom + pos);
    }
  }
}

// Find insertion point - after the bank-accounts route
const insertAfter = "router.get('/cash-management/bank-accounts'";
const insertIdx = code.indexOf(insertAfter);
if (insertIdx === -1) {
  console.error('Could not find insertion point for bank-accounts route');
  process.exit(1);
}

// Find the end of that route handler block
let braceCount = 0;
let foundStart = false;
let endIdx = insertIdx;
for (let i = insertIdx; i < code.length; i++) {
  if (code[i] === '{') { braceCount++; foundStart = true; }
  if (code[i] === '}') { braceCount--; }
  if (foundStart && braceCount === 0) {
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

const dbq = '(0, database_1.query)';

const newRoutes = `

// ========== BANKING HUB ROUTES (auto-patched) ==========

// Overview Dashboard
router.get('/cash-management/overview-dashboard', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant required' });

    const accountsResult = await ${dbq}(
      'SELECT id, account_name, bank_name, current_balance, currency FROM bank_accounts WHERE tenant_id = $1',
      [tenantId]
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const monthSummaryResult = await ${dbq}(\`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END), 0) as total_debits,
        COUNT(CASE WHEN transaction_type = 'credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN transaction_type = 'debit' THEN 1 END) as debit_count
      FROM bank_statement_lines 
      WHERE tenant_id = $1 AND transaction_date >= $2 AND transaction_date <= $3
    \`, [tenantId, monthStart, monthEnd]);

    const allTimeSummaryResult = await ${dbq}(\`
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
    const summaryRow = parseInt(monthRow.total_transactions) > 0 ? monthRow : allTimeRow;

    const reconResult = await ${dbq}(\`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('allocated', 'reconciled') THEN 1 END) as allocated,
        COUNT(CASE WHEN status = 'unmatched' OR status IS NULL THEN 1 END) as unmatched
      FROM bank_statement_lines WHERE tenant_id = $1
    \`, [tenantId]);
    const reconRow = reconResult.rows[0] || {};
    const reconTotal = parseInt(reconRow.total) || 0;
    const reconAllocated = parseInt(reconRow.allocated) || 0;

    const recentResult = await ${dbq}(\`
      SELECT id, transaction_date, description, amount, transaction_type, status, category, reference
      FROM bank_statement_lines WHERE tenant_id = $1
      ORDER BY transaction_date DESC, created_at DESC LIMIT 15
    \`, [tenantId]);

    const spendingResult = await ${dbq}(\`
      SELECT COALESCE(category, 'Uncategorized') as category, 
        SUM(ABS(amount)) as total, COUNT(*) as count
      FROM bank_statement_lines 
      WHERE tenant_id = $1 AND transaction_type = 'debit'
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total DESC LIMIT 5
    \`, [tenantId]);

    const incomeResult = await ${dbq}(\`
      SELECT COALESCE(category, 'Uncategorized') as category,
        SUM(amount) as total, COUNT(*) as count
      FROM bank_statement_lines
      WHERE tenant_id = $1 AND transaction_type = 'credit'
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total DESC LIMIT 5
    \`, [tenantId]);

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

    const monthlyResult = await ${dbq}(\`
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

    const balanceResult = await ${dbq}(
      'SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE tenant_id = $1',
      [tenantId]
    );

    const categoryResult = await ${dbq}(\`
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

// Statement Lines
router.get('/cash-management/statement-lines', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant required' });

    const bankAccountId = req.query.bank_account_id;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    let params = [tenantId];
    let accountFilter = '';
    if (bankAccountId) {
      params.push(bankAccountId);
      accountFilter = ' AND bsl.bank_account_id = $' + params.length;
    }

    const result = await ${dbq}(\`
      SELECT bsl.id, bsl.transaction_date, bsl.description, bsl.reference,
        bsl.amount, bsl.transaction_type, bsl.balance, bsl.status,
        bsl.category, bsl.allocated_gl_account_id,
        bsl.suggested_gl_account_code, bsl.suggested_gl_account_name,
        bsl.ai_confidence, bsl.ai_reason
      FROM bank_statement_lines bsl
      WHERE bsl.tenant_id = $1\${accountFilter}
      ORDER BY bsl.transaction_date DESC, bsl.created_at DESC
      LIMIT \${limit} OFFSET \${offset}
    \`, params);

    const countResult = await ${dbq}(
      \`SELECT COUNT(*) as total FROM bank_statement_lines bsl WHERE bsl.tenant_id = $1\${accountFilter}\`,
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

    const accountsResult = await ${dbq}(
      'SELECT id, account_name, bank_name, account_number, current_balance, currency FROM bank_accounts WHERE tenant_id = $1',
      [tenantId]
    );

    const totalBalance = accountsResult.rows.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);

    const recentResult = await ${dbq}(\`
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

code = code.substring(0, endIdx) + newRoutes + code.substring(endIdx);
fs.writeFileSync(routesFile, code, 'utf8');
console.log('Successfully added banking routes with correct database_1.query pattern');
