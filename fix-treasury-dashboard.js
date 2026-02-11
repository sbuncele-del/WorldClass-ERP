/**
 * Patch treasury dashboard to return real bank account data
 */
const fs = require('fs');
const file = '/app/dist/controllers/v2/treasury.controller.v2.js';

let code = fs.readFileSync(file, 'utf8');

const oldFunc = `async function getTreasuryDashboard(req, res) {
    try {
        const { tenantId } = getTenantContext(req);
        // Return empty dashboard structure - tables will be created during full implementation
        res.json({
            success: true,
            data: {
                cash: { total_cash: 0, account_count: 0 },
                investments: { total_investment_value: 0, investment_count: 0 },
                pendingPayments: { pending_count: 0, pending_amount: 0 }
            }
        });
    }
    catch (error) {
        console.error('[Treasury V2] Get dashboard error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch treasury dashboard' });
    }
}`;

const newFunc = `async function getTreasuryDashboard(req, res) {
    try {
        const { tenantId } = getTenantContext(req);
        const accountsResult = await (0, database_1.query)(
            'SELECT id, account_name, bank_name, account_number, current_balance, currency FROM bank_accounts WHERE tenant_id = $1',
            [tenantId]
        );
        const totalBalance = accountsResult.rows.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);
        const recentResult = await (0, database_1.query)(
            \`SELECT bsl.id, bsl.transaction_date, bsl.description, bsl.amount, 
              bsl.transaction_type, bsl.status, ba.account_name
            FROM bank_statement_lines bsl
            LEFT JOIN bank_accounts ba ON ba.id = bsl.bank_account_id
            WHERE bsl.tenant_id = $1
            ORDER BY bsl.transaction_date DESC LIMIT 10\`,
            [tenantId]
        );
        res.json({
            success: true,
            data: {
                cash: { total_cash: totalBalance, account_count: accountsResult.rows.length },
                investments: { total_investment_value: 0, investment_count: 0 },
                pendingPayments: { pending_count: 0, pending_amount: 0 },
                dashboard: {
                    totalBalance,
                    accountCount: accountsResult.rows.length,
                    accounts: accountsResult.rows,
                    recentTransactions: recentResult.rows,
                }
            }
        });
    }
    catch (error) {
        console.error('[Treasury V2] Get dashboard error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch treasury dashboard' });
    }
}`;

// Try to find the old function - need to be flexible with whitespace
const searchPatterns = [
    "Return empty dashboard structure - tables will be created during full implementation",
    "Return empty dashboard structure"
];

let found = false;
for (const pat of searchPatterns) {
    if (code.includes(pat)) {
        // Find the function start
        const patIdx = code.indexOf(pat);
        let funcStart = code.lastIndexOf('async function getTreasuryDashboard', patIdx);
        if (funcStart === -1) continue;
        
        // Find the function end - it's the next exports. line
        const afterPat = code.indexOf('exports.getTreasuryDashboard', patIdx);
        if (afterPat === -1) continue;
        
        const oldCode = code.substring(funcStart, afterPat);
        code = code.substring(0, funcStart) + newFunc + '\\n' + code.substring(afterPat);
        found = true;
        break;
    }
}

if (!found) {
    console.error('Could not find treasury dashboard function to patch');
    process.exit(1);
}

fs.writeFileSync(file, code, 'utf8');
console.log('Treasury dashboard patched successfully');
