/**
 * Fix income-statement.controller.v2.js
 * Replace the stub generateIncomeStatement with real SQL
 */
const fs = require('fs');
const path = '/app/dist/controllers/income-statement.controller.v2.js';

if (!fs.existsSync(path)) {
  console.log('❌ Income statement controller not found at', path);
  process.exit(1);
}

let content = fs.readFileSync(path, 'utf8');

const methodPattern = /static\s+async\s+generateIncomeStatement\s*\(req,\s*res\)\s*\{[\s\S]*?catch\s*\(error\)\s*\{[\s\S]*?\}\s*\}/;

const replacement = `static async generateIncomeStatement(req, res) {
        try {
            const tenantId = req.user?.tenantId || req.tenant?.id || req.headers['x-tenant-id'];
            if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant context required' });
            
            const { query: dbQuery } = require('../config/database');
            const { start_date, end_date, fromDate, from_date, toDate, to_date } = req.query;
            
            // Determine date range
            const now = new Date();
            const startDate = start_date || fromDate || from_date || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            const endDate = end_date || toDate || to_date || now.toISOString().split('T')[0];

            // Get revenue accounts
            const revenueResult = await dbQuery(\`
              SELECT 
                COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
                COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
                SUM(COALESCE(jel.credit_amount, 0)) AS credits,
                SUM(COALESCE(jel.debit_amount, 0)) AS debits,
                SUM(COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0)) AS balance
              FROM journal_entries je
              INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND jel.tenant_id = je.tenant_id
              INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND coa.tenant_id = jel.tenant_id
              WHERE je.tenant_id = $1
                AND LOWER(je.status) = 'posted'
                AND COALESCE(je.journal_date, je.entry_date, je.posting_date) >= $2
                AND COALESCE(je.journal_date, je.entry_date, je.posting_date) <= $3
                AND LOWER(coa.account_type) = 'revenue'
              GROUP BY coa.code, coa.account_code, coa.name, coa.account_name
              ORDER BY coa.code
            \`, [tenantId, startDate, endDate]);

            // Get expense accounts  
            const expenseResult = await dbQuery(\`
              SELECT 
                COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
                COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
                SUM(COALESCE(jel.debit_amount, 0)) AS debits,
                SUM(COALESCE(jel.credit_amount, 0)) AS credits,
                SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)) AS balance
              FROM journal_entries je
              INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND jel.tenant_id = je.tenant_id
              INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND coa.tenant_id = jel.tenant_id
              WHERE je.tenant_id = $1
                AND LOWER(je.status) = 'posted'
                AND COALESCE(je.journal_date, je.entry_date, je.posting_date) >= $2
                AND COALESCE(je.journal_date, je.entry_date, je.posting_date) <= $3
                AND LOWER(coa.account_type) = 'expense'
              GROUP BY coa.code, coa.account_code, coa.name, coa.account_name
              ORDER BY coa.code
            \`, [tenantId, startDate, endDate]);

            const mapAccount = (r) => ({ code: r.account_code, name: r.account_name, balance: parseFloat(r.balance || 0) });
            const totalRevenue = revenueResult.rows.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
            const cosAccounts = expenseResult.rows.filter(r => (r.account_code || '').startsWith('51'));
            const opExAccounts = expenseResult.rows.filter(r => !(r.account_code || '').startsWith('51'));
            const totalCOS = cosAccounts.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
            const totalOpEx = opExAccounts.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
            const totalExpenses = totalCOS + totalOpEx;
            const grossProfit = totalRevenue - totalCOS;
            const netIncome = totalRevenue - totalExpenses;

            // Format dates for label
            const startLabel = new Date(startDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
            const endLabel = new Date(endDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

            res.json({
                success: true,
                data: {
                    period: { start_date: startDate, end_date: endDate, label: startLabel + ' to ' + endLabel },
                    revenue: { title: 'Revenue', accounts: revenueResult.rows.map(mapAccount), subtotal: totalRevenue },
                    cost_of_sales: { title: 'Cost of Sales', accounts: cosAccounts.map(mapAccount), subtotal: totalCOS },
                    gross_profit: grossProfit,
                    operating_expenses: { title: 'Operating Expenses', accounts: opExAccounts.map(mapAccount), subtotal: totalOpEx },
                    operating_profit: netIncome,
                    other_income: { title: 'Other Income', accounts: [], subtotal: 0 },
                    other_expenses: { title: 'Other Expenses', accounts: [], subtotal: 0 },
                    net_profit_before_tax: netIncome,
                    tax_expense: 0,
                    net_profit_after_tax: netIncome,
                    revenue_total: totalRevenue,
                    expenses_total: totalExpenses,
                    net_income: netIncome,
                    details: [...revenueResult.rows, ...expenseResult.rows]
                },
                meta: { generated_at: new Date().toISOString(), tenant_id: tenantId }
            });
        } catch (error) {
            if (error.message === 'Tenant context required') {
                res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
                return;
            }
            console.error('[IncomeStatement] Error:', error);
            res.status(500).json({ success: false, message: 'Failed to generate income statement', error: error.message });
        }
    }`;

if (methodPattern.test(content)) {
  content = content.replace(methodPattern, replacement);
  fs.writeFileSync(path, content);
  console.log('✅ Fixed income-statement controller (generateIncomeStatement)');
} else {
  console.log('⚠️ Pattern not found in income-statement controller');
}
