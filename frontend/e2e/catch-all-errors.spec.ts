import { test, expect } from '@playwright/test';

test('Catch all errors', async ({ page }) => {
  const allResponses: string[] = [];
  const errors: string[] = [];
  
  page.on('response', r => {
    allResponses.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', r => {
    errors.push(`REQUEST FAILED: ${r.url()} - ${r.failure()?.errorText}`);
  });
  page.on('pageerror', e => errors.push(`PAGE ERROR: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
  });
  
  // Login
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"], input:first-of-type', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("Sign In")');
  
  // Wait longer to capture all requests
  await page.waitForTimeout(10000);
  
  console.log('=== ALL HTTP RESPONSES ===');
  allResponses.forEach(r => console.log(r));
  
  console.log('\n=== ERRORS ===');
  errors.forEach(e => console.log(e));
  
  // Filter for API failures
  const apiFailures = allResponses.filter(r => r.includes('/api/') && !r.startsWith('200'));
  console.log('\n=== API FAILURES ===');
  apiFailures.forEach(f => console.log(f));
});
