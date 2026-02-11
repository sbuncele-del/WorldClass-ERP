/**
 * Fix treasury controller - replace broken getTreasuryDashboard
 */
const fs = require('fs');
const file = '/app/dist/controllers/v2/treasury.controller.v2.js';

let code = fs.readFileSync(file, 'utf8');

// Find and replace the broken function
const funcStart = code.indexOf('async function getTreasuryDashboard');
if (funcStart === -1) {
  console.error('Could not find getTreasuryDashboard function');
  process.exit(1);
}

const exportsLine = 'exports.getTreasuryDashboard = getTreasuryDashboard;';
const exportsIdx = code.indexOf(exportsLine, funcStart);
if (exportsIdx === -1) {
  console.error('Could not find exports line');
  process.exit(1);
}

const replacement = `async function getTreasuryDashboard(req, res) {
    try {
        const { tenantId } = getTenantContext(req);
        const accountsResult = await (0, database_1.query)('SELECT id, account_name, bank_name, account_number, current_balance, currency FROM bank_accounts WHERE tenant_id = $1', [tenantId]);
        const totalBalance = accountsResult.rows.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);
        const recentResult = await (0, database_1.query)('SELECT bsl.id, bsl.transaction_date, bsl.description, bsl.amount, bsl.transaction_type, bsl.status, ba.account_name FROM bank_statement_lines bsl LEFT JOIN bank_accounts ba ON ba.id = bsl.bank_account_id WHERE bsl.tenant_id = $1 ORDER BY bsl.transaction_date DESC LIMIT 10', [tenantId]);
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
}
`;

code = code.substring(0, funcStart) + replacement + exportsLine + code.substring(exportsIdx + exportsLine.length);

fs.writeFileSync(file, code, 'utf8');
console.log('Treasury dashboard fixed successfully');
