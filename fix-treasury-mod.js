/**
 * Fix the modules/financial/treasury.controller.v2.js getTreasuryDashboard
 */
const fs = require('fs');
const file = '/tmp/treasury-mod.controller.v2.js';

let code = fs.readFileSync(file, 'utf8');

// This file uses database_1.default (imported as __importDefault)
// Check what query pattern to use
const usesDefault = code.includes('database_1.default');
const qFn = usesDefault ? 'database_1.default.query' : '(0, database_1.query)';

// But actually let me check how existing functions call the DB
const dbCallMatch = code.match(/await\s+([\w._()]+)\s*\(/);
console.log('DB call pattern found:', dbCallMatch ? dbCallMatch[1] : 'none');

// Check the imports
if (code.includes('require("../../config/database")')) {
  console.log('Import: require("../../config/database")');
}

// The file uses: const database_1 = __importDefault(require("../../config/database"));
// So we need: database_1.default.query(...)
// But wait, let me check how getCashPositions calls it
const cashPosMatch = code.match(/getCashPositions[\s\S]{0,500}?(database_1\.[^(]+)\(/);
console.log('getCashPositions uses:', cashPosMatch ? cashPosMatch[1] : 'unknown');

// Find the getTreasuryDashboard function
const funcMatch = 'const getTreasuryDashboard = async (req, res) => {';
const funcIdx = code.indexOf(funcMatch);
if (funcIdx === -1) {
  console.error('Could not find getTreasuryDashboard');
  process.exit(1);
}

const exportLine = 'exports.getTreasuryDashboard = getTreasuryDashboard;';
const exportIdx = code.indexOf(exportLine, funcIdx);
if (exportIdx === -1) {
  console.error('Could not find exports line');
  process.exit(1);
}

// Get the actual DB query pattern from getCashPositions
let dbPattern = 'database_1.default.query';
const existingCall = code.match(/await\s+(database_1\.\S+?)\s*\(/);
if (existingCall) {
  dbPattern = existingCall[1];
}
console.log('Using DB pattern:', dbPattern);

const newFunc = `const getTreasuryDashboard = async (req, res) => {
    try {
        const { tenantId } = getTenantContext(req);
        const accountsResult = await ${dbPattern}('SELECT id, account_name, bank_name, account_number, current_balance, currency FROM bank_accounts WHERE tenant_id = $1', [tenantId]);
        const totalBalance = accountsResult.rows.reduce((sum, a) => sum + parseFloat(a.current_balance || 0), 0);
        const recentResult = await ${dbPattern}('SELECT bsl.id, bsl.transaction_date, bsl.description, bsl.amount, bsl.transaction_type, bsl.status, ba.account_name FROM bank_statement_lines bsl LEFT JOIN bank_accounts ba ON ba.id = bsl.bank_account_id WHERE bsl.tenant_id = $1 ORDER BY bsl.transaction_date DESC LIMIT 10', [tenantId]);
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
            },
            dashboard: {
                cashPosition: { total_balance: totalBalance, account_count: accountsResult.rows.length },
                pendingTransfers: { count: 0, total_amount: 0 },
                weekForecast: { total_inflows: 0, total_outflows: 0, net_change: 0 }
            }
        });
    }
    catch (error) {
        if (error.message === 'Tenant ID not found') {
            return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard', error: error.message });
    }
};
`;

code = code.substring(0, funcIdx) + newFunc + code.substring(exportIdx);

fs.writeFileSync(file, code, 'utf8');
console.log('Treasury modules/financial controller fixed successfully');
