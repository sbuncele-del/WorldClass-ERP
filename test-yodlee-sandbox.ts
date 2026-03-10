/**
 * Yodlee Sandbox Quick Test
 * 
 * Tests connectivity to Yodlee sandbox API using your credentials.
 * Run: npx ts-node test-yodlee-sandbox.ts
 *   or: node -e "require('./test-yodlee-sandbox.ts')"
 * 
 * From screenshot (sandbox):
 *   Admin Login: ffcf63a7-b141-4ebe-93e9-c0f69a824717_ADMIN
 *   API Endpoint: https://sandbox.api.yodlee.com/ysl
 *   FastLink URL: https://fl4.sandbox.yodlee.com/authenticate/restserver/fastlink
 *   API Version: 1.1
 */

// ============================================================
// CONFIG - Fill in your credentials from the Yodlee dashboard
// ============================================================
const CONFIG = {
  apiBaseUrl: 'https://sandbox.api.yodlee.com/ysl',
  adminLoginName: 'ffcf63a7-b141-4ebe-93e9-c0f69a824717_ADMIN',
  // IMPORTANT: Copy these from your Yodlee Developer Dashboard
  clientId: process.env.YODLEE_CLIENT_ID || 'PASTE_YOUR_CLIENT_ID_HERE',
  clientSecret: process.env.YODLEE_CLIENT_SECRET || 'PASTE_YOUR_CLIENT_SECRET_HERE',
  apiVersion: '1.1',
  // Yodlee sandbox comes with 5 pre-registered test users:
  testUsers: [
    'sbMemffcf63a7b1414ebe93e9c0f69a8247171', // Test user 1
    'sbMemffcf63a7b1414ebe93e9c0f69a8247172', // Test user 2  
    'sbMemffcf63a7b1414ebe93e9c0f69a8247173', // Test user 3
    'sbMemffcf63a7b1414ebe93e9c0f69a8247174', // Test user 4
    'sbMemffcf63a7b1414ebe93e9c0f69a8247175', // Test user 5
  ],
};

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function testAdminAuth(): Promise<string | null> {
  console.log('\n🔐 TEST 1: Admin Authentication');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Api-Version': CONFIG.apiVersion,
        'Content-Type': 'application/x-www-form-urlencoded',
        'loginName': CONFIG.adminLoginName,
      },
      body: new URLSearchParams({
        clientId: CONFIG.clientId,
        secret: CONFIG.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ FAILED (HTTP ${response.status})`);
      console.log(`   Error: ${errorText}`);
      
      if (response.status === 401) {
        console.log('\n💡 FIX: Your Client ID or Client Secret is incorrect.');
        console.log('   Go to developer.yodlee.com → Dashboard → Copy Client ID & Secret');
      }
      return null;
    }

    const data = await response.json();
    const token = data.token?.accessToken;
    console.log(`✅ SUCCESS - Admin token obtained`);
    console.log(`   Token: ${token?.substring(0, 30)}...`);
    console.log(`   Expires in: ${data.token?.expiresIn} seconds`);
    return token;
  } catch (err: any) {
    console.log(`❌ NETWORK ERROR: ${err.message}`);
    return null;
  }
}

async function testUserAuth(testUser: string): Promise<string | null> {
  console.log(`\n👤 TEST 2: User Authentication (${testUser})`);
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Api-Version': CONFIG.apiVersion,
        'Content-Type': 'application/x-www-form-urlencoded',
        'loginName': testUser,
      },
      body: new URLSearchParams({
        clientId: CONFIG.clientId,
        secret: CONFIG.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ FAILED (HTTP ${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    const token = data.token?.accessToken;
    console.log(`✅ SUCCESS - User token obtained`);
    return token;
  } catch (err: any) {
    console.log(`❌ ERROR: ${err.message}`);
    return null;
  }
}

async function testGetAccounts(userToken: string): Promise<void> {
  console.log('\n🏦 TEST 3: Get Linked Accounts');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/accounts`, {
      headers: {
        'Api-Version': CONFIG.apiVersion,
        'Authorization': `Bearer ${userToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ FAILED (HTTP ${response.status}): ${errorText}`);
      return;
    }

    const data = await response.json();
    const accounts = data.account || [];
    
    if (accounts.length === 0) {
      console.log('⚠️  No accounts linked yet (this is normal for sandbox)');
      console.log('   Use FastLink to connect test bank accounts first');
    } else {
      console.log(`✅ Found ${accounts.length} linked account(s):`);
      accounts.forEach((acc: any) => {
        console.log(`   • ${acc.accountName} (${acc.providerName}) - ${acc.accountType}`);
        if (acc.balance) {
          console.log(`     Balance: ${acc.balance.currency} ${acc.balance.amount}`);
        }
      });
    }
  } catch (err: any) {
    console.log(`❌ ERROR: ${err.message}`);
  }
}

async function testGetTransactions(userToken: string): Promise<void> {
  console.log('\n💳 TEST 4: Get Transactions');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/transactions?fromDate=2024-01-01&toDate=2026-03-10`, {
      headers: {
        'Api-Version': CONFIG.apiVersion,
        'Authorization': `Bearer ${userToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ FAILED (HTTP ${response.status}): ${errorText}`);
      return;
    }

    const data = await response.json();
    const transactions = data.transaction || [];
    
    if (transactions.length === 0) {
      console.log('⚠️  No transactions yet (link a test bank account via FastLink first)');
    } else {
      console.log(`✅ Found ${transactions.length} transaction(s):`);
      transactions.slice(0, 5).forEach((txn: any) => {
        const sign = txn.baseType === 'DEBIT' ? '-' : '+';
        console.log(`   ${txn.date} | ${sign}${txn.amount.currency} ${txn.amount.amount} | ${txn.description?.original || 'N/A'}`);
      });
      if (transactions.length > 5) {
        console.log(`   ... and ${transactions.length - 5} more`);
      }
    }
  } catch (err: any) {
    console.log(`❌ ERROR: ${err.message}`);
  }
}

async function testSearchProviders(userToken: string): Promise<void> {
  console.log('\n🔍 TEST 5: Search for SA Banks');
  console.log('─'.repeat(50));
  
  const banks = ['FNB', 'ABSA', 'Standard Bank', 'Nedbank', 'Capitec'];
  
  for (const bank of banks) {
    try {
      const response = await fetch(
        `${CONFIG.apiBaseUrl}/providers?name=${encodeURIComponent(bank)}`,
        {
          headers: {
            'Api-Version': CONFIG.apiVersion,
            'Authorization': `Bearer ${userToken}`,
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const providers = data.provider || [];
      
      if (providers.length > 0) {
        console.log(`✅ ${bank}: Found ${providers.length} provider(s)`);
        providers.slice(0, 2).forEach((p: any) => {
          console.log(`   • ${p.name} (ID: ${p.id}, Country: ${p.countryISOCode || 'N/A'})`);
        });
      } else {
        console.log(`⚠️  ${bank}: Not found in sandbox`);
      }
    } catch {
      console.log(`❌ ${bank}: Search failed`);
    }
  }
}

// ============================================================
// RUN ALL TESTS
// ============================================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     🏦 SiyaBusa ERP - Yodlee Sandbox Test      ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\nAPI Endpoint: ${CONFIG.apiBaseUrl}`);
  console.log(`Admin Login:  ${CONFIG.adminLoginName}`);
  console.log(`Client ID:    ${CONFIG.clientId.substring(0, 20)}...`);
  console.log(`Timestamp:    ${new Date().toISOString()}`);

  // Check credentials
  if (CONFIG.clientId === 'PASTE_YOUR_CLIENT_ID_HERE') {
    console.log('\n⚠️  CREDENTIALS NOT SET!');
    console.log('');
    console.log('Option 1: Edit this file and paste your Client ID & Secret');
    console.log('Option 2: Run with environment variables:');
    console.log('  YODLEE_CLIENT_ID=your_id YODLEE_CLIENT_SECRET=your_secret npx ts-node test-yodlee-sandbox.ts');
    console.log('');
    console.log('Get credentials from: developer.yodlee.com → Dashboard → Sandbox tab');
    return;
  }

  // Test 1: Admin auth
  const adminToken = await testAdminAuth();
  if (!adminToken) {
    console.log('\n❌ STOPPED: Cannot proceed without admin authentication');
    console.log('   Check your Client ID and Client Secret');
    return;
  }

  // Test 2: User auth (try sandbox test user)
  let userToken: string | null = null;
  for (const testUser of CONFIG.testUsers) {
    userToken = await testUserAuth(testUser);
    if (userToken) break;
  }

  if (!userToken) {
    console.log('\n⚠️  No pre-registered test users found. Trying with admin token...');
    userToken = adminToken;
  }

  // Test 3: Get accounts
  await testGetAccounts(userToken);

  // Test 4: Get transactions
  await testGetTransactions(userToken);

  // Test 5: Search for SA banks
  await testSearchProviders(userToken);

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(50));
  console.log('✅ Yodlee API connectivity: WORKING');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Use FastLink to connect a test bank account');
  console.log('   (Sandbox has simulated banks like "Dag Site")');
  console.log('2. After linking, re-run this test to see accounts & transactions');
  console.log('3. Test the sync endpoint to import into SiyaBusa ERP');
  console.log('');
  console.log('FastLink URL for testing:');
  console.log(`  ${CONFIG.apiBaseUrl.replace('/ysl', '')}`);
  console.log('  Or use the Configuration Tool Demo on developer.yodlee.com');
}

runAllTests().catch(console.error);
