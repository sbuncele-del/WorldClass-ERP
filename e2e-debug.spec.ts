import { test, expect } from '@playwright/test';

test('Debug Dashboard - Capture All Network', async ({ page }) => {
  const failedRequests: any[] = [];
  const allRequests: any[] = [];
  
  // Listen to ALL requests
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText
    });
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      allRequests.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  // Go to login
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  
  // Login
  await page.fill('input[name="email"], input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[name="password"], input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load and fail
  await page.waitForTimeout(5000);
  
  console.log('\n=== FAILED REQUESTS ===');
  failedRequests.forEach(r => console.log(r));
  
  console.log('\n=== 4XX/5XX RESPONSES ===');
  allRequests.forEach(r => console.log(`${r.status}: ${r.url}`));
  
  // Check localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const tenantId = await page.evaluate(() => localStorage.getItem('tenantId'));
  console.log('\n=== LOCAL STORAGE ===');
  console.log('token:', token ? token.substring(0, 30) + '...' : 'NULL');
  console.log('tenantId:', tenantId);
  
  await page.screenshot({ path: 'debug-final.png' });
});
