const https = require('https');

const BASE_URL = 'siyabusaerp.co.za';
const LOGIN_EMAIL = 'admin@worldclass.erp';
const LOGIN_PASSWORD = 'Admin123!';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: 443,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testFinancialReports() {
  console.log('\n========================================');
  console.log('   FINANCIAL HUB API TESTS');
  console.log('========================================\n');
  
  // Login
  console.log('1. Logging in...');
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD
  });
  
  if (!loginRes.data?.data?.tokens?.accessToken) {
    console.log('❌ Login failed');
    console.log(loginRes.data);
    return;
  }
  
  const token = loginRes.data.data.tokens.accessToken;
  console.log('✅ Login successful\n');
  
  const headers = { 'Authorization': 'Bearer ' + token };
  const today = '2026-01-31';
  const startOfMonth = '2026-01-01';
  
  const reports = [
    { name: 'Trial Balance', url: '/api/financial/trial-balance' },
    { name: 'Balance Sheet', url: '/api/financial/balance-sheet' },
    { name: 'Income Statement', url: '/api/financial/profit-loss?fromDate=' + startOfMonth + '&toDate=' + today },
    { name: 'Cash Flow', url: '/api/financial/cash-flow?fromDate=' + startOfMonth + '&toDate=' + today },
    { name: 'General Ledger', url: '/api/financial/general-ledger?fromDate=' + startOfMonth + '&toDate=' + today },
    { name: 'Aged Receivables', url: '/api/financial/aged-receivables?asOfDate=' + today },
    { name: 'Aged Payables', url: '/api/financial/aged-payables?asOfDate=' + today },
    { name: 'VAT Report', url: '/api/financial/vat-report?fromDate=' + startOfMonth + '&toDate=' + today },
  ];
  
  let passed = 0;
  let failed = 0;
  
  console.log('2. Testing Financial Reports:\n');
  
  for (const report of reports) {
    try {
      const res = await makeRequest(report.url, 'GET', null, headers);
      if (res.data?.success) {
        console.log('✅ ' + report.name + ': SUCCESS');
        passed++;
      } else {
        console.log('❌ ' + report.name + ': FAILED - ' + (res.data?.error || 'Unknown error'));
        failed++;
      }
    } catch (err) {
      console.log('❌ ' + report.name + ': ERROR - ' + err.message);
      failed++;
    }
  }
  
  console.log('\n========================================');
  console.log('   RESULTS: ' + passed + '/8 PASSED, ' + failed + ' FAILED');
  console.log('========================================\n');
  
  if (passed === 8) {
    console.log('🎉 ALL FINANCIAL REPORTS WORKING!');
  }
}

testFinancialReports().catch(console.error);
