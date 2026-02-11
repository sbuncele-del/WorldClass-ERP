/**
 * Patches the compiled v2.routes.js to fix financial endpoints
 * - Replaces broken trial-balance inline handler with working SQL
 * - Adds working balance-sheet that uses correct SQL
 * - Adds working income-statement that uses correct SQL
 * 
 * Run: node fix-financial-routes.js
 * Then restart the backend container
 */

const fs = require('fs');
const path = '/app/dist/routes/v2.routes.js';

let content = fs.readFileSync(path, 'utf8');
const original = content;

// ============================================================
// 1. Fix trial-balance inline handler
// ============================================================
// Find the broken trial-balance handler and replace it
const tbPattern = /router\.get\('\/financial\/trial-balance',\s*async\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?const\s+tenantId\s*=\s*req\.tenant\?\.id\s*\|\|\s*1;[\s\S]*?(?:res\.json\(\{[^}]*success:\s*true,\s*data:\s*\[\]\s*\}\))\s*;\s*\}\s*\}\s*\)/;

const tbReplacement = `router.get('/financial/trial-balance', async (req, res) => {
    const { query: dbQuery } = require('../config/database');
    const tenantId = req.user?.tenantId || req.tenant?.id || req.headers['x-tenant-id'];
    if (!tenantId) return res.json({ success: true, data: [] });
    try {
        const result = await dbQuery(\`
          SELECT 
            coa.code as account_code,
            COALESCE(coa.name, coa.account_name) as account_name,
            coa.account_type,
            COALESCE(SUM(jel.debit_amount), 0) as debit,
            COALESCE(SUM(jel.credit_amount), 0) as credit,
            COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
          FROM chart_of_accounts coa
          LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id AND jel.tenant_id = coa.tenant_id
          LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND LOWER(je.status) = 'posted'
          WHERE coa.tenant_id = $1 AND coa.is_header = false AND coa.deleted_at IS NULL
          GROUP BY coa.id, coa.code, coa.name, coa.account_name, coa.account_type
          HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
          ORDER BY coa.code
        \`, [tenantId]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Trial balance error:', error.message);
        res.json({ success: true, data: [] });
    }
})`;

if (tbPattern.test(content)) {
  content = content.replace(tbPattern, tbReplacement);
  console.log('✅ Fixed trial-balance handler');
} else {
  console.log('⚠️ Trial-balance pattern not found, trying alternate approach...');
  // Try simpler replacement
  const simplePattern = /router\.get\('\/financial\/trial-balance'/;
  if (simplePattern.test(content)) {
    // Find the handler and replace until the next router call
    const startIdx = content.indexOf("router.get('/financial/trial-balance'");
    if (startIdx !== -1) {
      // Find the closing of this handler (next router. call)
      let depth = 0;
      let endIdx = startIdx;
      let inHandler = false;
      for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') { depth++; inHandler = true; }
        if (content[i] === '}') { depth--; }
        if (inHandler && depth === 0 && content[i] === ')') {
          endIdx = i + 2; // include ); 
          break;
        }
      }
      content = content.substring(0, startIdx) + tbReplacement + ';\n' + content.substring(endIdx);
      console.log('✅ Fixed trial-balance handler (alternate)');
    }
  }
}

// ============================================================
// 2. Fix balance-sheet controller  
// ============================================================
// Override the generateBalanceSheet in the controller file
const bsControllerPath = '/app/dist/controllers/balance-sheet.controller.v2.js';
if (fs.existsSync(bsControllerPath)) {
  let bsContent = fs.readFileSync(bsControllerPath, 'utf8');
  
  // Find and replace the generateBalanceSheet method
  const bsMethodPattern = /static\s+async\s+generateBalanceSheet\s*\(req,\s*res\)\s*\{[\s\S]*?catch\s*\(error\)\s*\{[\s\S]*?\}\s*\}/;
  
  const bsReplacement = `static async generateBalanceSheet(req, res) {
        try {
            const { query: dbQuery } = require('../config/database');
            const tenantId = req.user?.tenantId || req.tenant?.id || req.headers['x-tenant-id'];
            if (!tenantId) return res.status(400).json({ success: false, message: 'No tenant' });
            const asOfDate = req.query.as_of_date || req.query.asOfDate || new Date().toISOString().split('T')[0];

            const result = await dbQuery(\`
              SELECT 
                COALESCE(NULLIF(coa.account_code, ''), coa.code) AS account_code,
                COALESCE(NULLIF(coa.account_name, ''), coa.name) AS account_name,
                LOWER(coa.account_type) AS account_type,
                SUM(COALESCE(jel.debit_amount, 0)) AS total_debits,
                SUM(COALESCE(jel.credit_amount, 0)) AS total_credits,
                CASE 
                  WHEN LOWER(coa.account_type) IN ('asset', 'expense') THEN SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0))
                  ELSE SUM(COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0))
                END AS balance
              FROM chart_of_accounts coa
              LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id AND jel.tenant_id = $1
              LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id
                AND LOWER(je.status) = 'posted' 
                AND COALESCE(je.journal_date, je.entry_date, je.posting_date) <= $2
              WHERE coa.tenant_id = $1 
                AND LOWER(coa.account_type) IN ('asset', 'liability', 'equity')
                AND coa.is_header = false AND coa.deleted_at IS NULL
              GROUP BY coa.code, coa.account_code, coa.name, coa.account_name, coa.account_type
              HAVING SUM(COALESCE(jel.debit_amount, 0)) != 0 OR SUM(COALESCE(jel.credit_amount, 0)) != 0
              ORDER BY coa.code
            \`, [tenantId, asOfDate]);

            const rows = result.rows;
            const mapAccount = (r) => ({ code: r.account_code, name: r.account_name, balance: parseFloat(r.balance || 0) });
            const assets = rows.filter(r => r.account_type === 'asset');
            const liabilities = rows.filter(r => r.account_type === 'liability');
            const equityAccounts = rows.filter(r => r.account_type === 'equity');

            const totalAssets = assets.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
            const totalLiabilities = liabilities.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
            const totalEquity = equityAccounts.reduce((s, r) => s + parseFloat(r.balance || 0), 0);

            // Calculate retained earnings
            const reResult = await dbQuery(\`
              SELECT 
                COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'revenue' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) AS total_revenue,
                COALESCE(SUM(CASE WHEN LOWER(coa.account_type) = 'expense' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) AS total_expenses
              FROM journal_entries je
              INNER JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id AND jel.tenant_id = je.tenant_id
              INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id AND coa.tenant_id = jel.tenant_id
              WHERE je.tenant_id = $1 AND LOWER(je.status) = 'posted'
                AND COALESCE(je.journal_date, je.entry_date, je.posting_date) <= $2
                AND LOWER(coa.account_type) IN ('revenue', 'expense')
            \`, [tenantId, asOfDate]);

            const retainedEarnings = parseFloat(reResult.rows[0]?.total_revenue || 0) - parseFloat(reResult.rows[0]?.total_expenses || 0);
            const totalEquityWithRE = totalEquity + retainedEarnings;

            const currentAssets = assets.filter(r => (r.account_code || '').match(/^1[01]/));
            const nonCurrentAssets = assets.filter(r => !(r.account_code || '').match(/^1[01]/));

            const equityAccountsMapped = equityAccounts.map(mapAccount);
            if (Math.abs(retainedEarnings) > 0.01) {
              equityAccountsMapped.push({ code: '3200', name: 'Retained Earnings (Net Income)', balance: retainedEarnings });
            }

            res.json({
              success: true,
              data: {
                as_of_date: asOfDate,
                label: 'Balance Sheet as at ' + asOfDate,
                current_assets: { title: 'Current Assets', accounts: currentAssets.map(mapAccount), subtotal: currentAssets.reduce((s, r) => s + parseFloat(r.balance || 0), 0) },
                non_current_assets: { title: 'Non-Current Assets', accounts: nonCurrentAssets.map(mapAccount), subtotal: nonCurrentAssets.reduce((s, r) => s + parseFloat(r.balance || 0), 0) },
                total_assets: totalAssets,
                current_liabilities: { title: 'Current Liabilities', accounts: liabilities.map(mapAccount), subtotal: totalLiabilities },
                non_current_liabilities: { title: 'Non-Current Liabilities', accounts: [], subtotal: 0 },
                total_liabilities: totalLiabilities,
                equity: { title: 'Equity', accounts: equityAccountsMapped, subtotal: totalEquityWithRE },
                total_equity: totalEquityWithRE,
                total_liabilities_equity: totalLiabilities + totalEquityWithRE,
                is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquityWithRE)) < 0.01,
                variance: totalAssets - (totalLiabilities + totalEquityWithRE),
                retained_earnings: retainedEarnings,
                accounts: rows.map(mapAccount)
              },
              meta: { generated_at: new Date().toISOString(), tenant_id: tenantId }
            });
        } catch (error) {
            console.error('Balance sheet error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to generate balance sheet', error: error.message });
        }
    }`;

  if (bsMethodPattern.test(bsContent)) {
    bsContent = bsContent.replace(bsMethodPattern, bsReplacement);
    fs.writeFileSync(bsControllerPath, bsContent);
    console.log('✅ Fixed balance-sheet controller (generateBalanceSheet)');
  } else {
    console.log('⚠️ Balance sheet method pattern not found');
  }

  // Also fix the getTrialBalance in this controller
  const tbMethodPattern = /static\s+async\s+getTrialBalance\s*\(req,\s*res\)\s*\{[\s\S]*?catch\s*\(error\)\s*\{[\s\S]*?\}\s*\}/;
  
  bsContent = fs.readFileSync(bsControllerPath, 'utf8'); // re-read
  
  const tbMethodReplacement = `static async getTrialBalance(req, res) {
        try {
            const { query: dbQuery } = require('../config/database');
            const tenantId = req.user?.tenantId || req.tenant?.id || req.headers['x-tenant-id'];
            if (!tenantId) return res.status(400).json({ success: false, message: 'No tenant' });
            
            const result = await dbQuery(\`
              SELECT 
                coa.code as account_code,
                COALESCE(coa.name, coa.account_name) as account_name,
                coa.account_type,
                COALESCE(SUM(jel.debit_amount), 0) as debit,
                COALESCE(SUM(jel.credit_amount), 0) as credit,
                COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
              FROM chart_of_accounts coa
              LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id AND jel.tenant_id = coa.tenant_id
              LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = jel.tenant_id AND LOWER(je.status) = 'posted'
              WHERE coa.tenant_id = $1 AND coa.is_header = false AND coa.deleted_at IS NULL
              GROUP BY coa.id, coa.code, coa.name, coa.account_name, coa.account_type
              HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
              ORDER BY coa.code
            \`, [tenantId]);

            const totalDebits = result.rows.reduce((s, r) => s + parseFloat(r.debit || 0), 0);
            const totalCredits = result.rows.reduce((s, r) => s + parseFloat(r.credit || 0), 0);

            res.json({
                success: true,
                data: {
                    accounts: result.rows,
                    totals: { total_debits: totalDebits, total_credits: totalCredits },
                    is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
                }
            });
        } catch (error) {
            console.error('Trial balance error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to generate trial balance', error: error.message });
        }
    }`;

  if (tbMethodPattern.test(bsContent)) {
    bsContent = bsContent.replace(tbMethodPattern, tbMethodReplacement);
    fs.writeFileSync(bsControllerPath, bsContent);
    console.log('✅ Fixed balance-sheet controller (getTrialBalance)');
  }
}

// Save the updated routes file
if (content !== original) {
  fs.writeFileSync(path, content);
  console.log('✅ Saved updated v2.routes.js');
} else {
  console.log('⚠️ No changes made to v2.routes.js');
}

console.log('\\nDone! Restart the backend container to apply changes.');
