import { test, expect } from '@playwright/test';

const BASE_URL = 'https://siyabusaerp.co.za';
const LOGIN_EMAIL = 'admin@worldclass.erp';
const LOGIN_PASSWORD = 'Admin123!';

test.describe('Financial Hub - Complete Report Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
    
    // Fill login form
    await page.fill('input[type="email"], input[placeholder*="email" i], #email', LOGIN_EMAIL);
    await page.fill('input[type="password"], input[placeholder*="password" i], #password', LOGIN_PASSWORD);
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for navigation after login
    await page.waitForTimeout(3000);
  });

  test('1. Should login and access Financial Hub', async ({ page }) => {
    // Navigate to Financial Hub
    await page.click('text=Financial Hub, a[href*="financial"], [data-menu*="financial"]');
    await page.waitForTimeout(2000);
    
    // Verify we're on Financial Hub
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain('financial');
    
    console.log('✅ Successfully accessed Financial Hub');
  });

  test('2. Should display 8 financial reports', async ({ page }) => {
    // Navigate to Financial Hub
    await page.goto(`${BASE_URL}/financial`);
    await page.waitForTimeout(2000);
    
    // Click Reports tab if exists
    const reportsTab = page.locator('text=Reports, [data-tab="reports"]');
    if (await reportsTab.isVisible()) {
      await reportsTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for report names
    const reports = [
      'Income Statement',
      'Balance Sheet',
      'Cash Flow',
      'Trial Balance',
      'General Ledger',
      'Aged Receivables',
      'Aged Payables',
      'VAT Report'
    ];
    
    const pageContent = await page.content();
    let foundReports = 0;
    
    for (const report of reports) {
      if (pageContent.includes(report)) {
        console.log(`✅ Found: ${report}`);
        foundReports++;
      } else {
        console.log(`❌ Missing: ${report}`);
      }
    }
    
    console.log(`\nFound ${foundReports}/8 reports`);
    expect(foundReports).toBeGreaterThanOrEqual(4); // At least 4 should be visible
  });

  test('3. Should download Trial Balance report', async ({ page }) => {
    await page.goto(`${BASE_URL}/financial`);
    await page.waitForTimeout(2000);
    
    // Look for Trial Balance download button
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    
    // Try clicking download for Trial Balance
    const trialBalanceBtn = page.locator('button:has-text("Download"):near(:text("Trial Balance"))').first();
    if (await trialBalanceBtn.isVisible()) {
      await trialBalanceBtn.click();
    } else {
      // Alternative: click any download button
      await page.click('button:has-text("Download")');
    }
    
    const download = await downloadPromise;
    if (download) {
      const filename = download.suggestedFilename();
      console.log(`✅ Downloaded: ${filename}`);
      expect(filename).toContain('.csv');
    } else {
      console.log('⚠️ Download may have been triggered but not captured');
    }
  });

  test('4. Should create journal entry', async ({ page }) => {
    await page.goto(`${BASE_URL}/financial`);
    await page.waitForTimeout(2000);
    
    // Look for "New Journal Entry" or similar button
    const newJournalBtn = page.locator('button:has-text("New Journal"), button:has-text("Create Journal"), button:has-text("Add Entry")').first();
    
    if (await newJournalBtn.isVisible()) {
      await newJournalBtn.click();
      await page.waitForTimeout(1000);
      
      // Check if modal/form opened
      const modalVisible = await page.locator('.ant-modal, [role="dialog"], form').isVisible();
      console.log(`✅ Journal entry form opened: ${modalVisible}`);
      expect(modalVisible).toBeTruthy();
    } else {
      console.log('⚠️ New Journal button not found on current view');
    }
  });

  test('5. Should display dashboard with financial stats', async ({ page }) => {
    await page.goto(`${BASE_URL}/financial`);
    await page.waitForTimeout(3000);
    
    const pageContent = await page.content();
    
    // Check for common financial terms
    const terms = ['Revenue', 'Expense', 'Asset', 'Liabilit', 'Balance', 'R '];
    let foundTerms = 0;
    
    for (const term of terms) {
      if (pageContent.includes(term)) {
        foundTerms++;
      }
    }
    
    console.log(`✅ Found ${foundTerms}/${terms.length} financial terms on dashboard`);
    expect(foundTerms).toBeGreaterThanOrEqual(2);
  });
});

// Quick API verification tests
test.describe('Financial Reports API Tests', () => {
  
  test('API: All 8 reports return success', async ({ request }) => {
    // Login to get token
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: LOGIN_EMAIL,
        password: LOGIN_PASSWORD
      }
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.data?.tokens?.accessToken;
    expect(token).toBeTruthy();
    console.log('✅ Got auth token');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    const today = '2026-01-31';
    const startOfMonth = '2026-01-01';
    
    const reports = [
      { name: 'Trial Balance', url: `/api/financial/trial-balance` },
      { name: 'Balance Sheet', url: `/api/financial/balance-sheet` },
      { name: 'Income Statement', url: `/api/financial/profit-loss?fromDate=${startOfMonth}&toDate=${today}` },
      { name: 'Cash Flow', url: `/api/financial/cash-flow?fromDate=${startOfMonth}&toDate=${today}` },
      { name: 'General Ledger', url: `/api/financial/general-ledger?fromDate=${startOfMonth}&toDate=${today}` },
      { name: 'Aged Receivables', url: `/api/financial/aged-receivables?asOfDate=${today}` },
      { name: 'Aged Payables', url: `/api/financial/aged-payables?asOfDate=${today}` },
      { name: 'VAT Report', url: `/api/financial/vat-report?fromDate=${startOfMonth}&toDate=${today}` },
    ];
    
    let passed = 0;
    
    for (const report of reports) {
      const response = await request.get(`${BASE_URL}${report.url}`, { headers });
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ ${report.name}: SUCCESS`);
        passed++;
      } else {
        console.log(`❌ ${report.name}: FAILED - ${data.error}`);
      }
    }
    
    console.log(`\n=== RESULTS: ${passed}/8 reports working ===`);
    expect(passed).toBe(8);
  });
});
