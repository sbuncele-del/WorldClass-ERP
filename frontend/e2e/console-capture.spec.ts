import { test } from '@playwright/test';

test('Capture console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    pageErrors.push(err.message + '\n' + err.stack);
  });
  
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input:first-of-type', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(3000);
  
  console.log('=== CONSOLE ERRORS ===');
  consoleErrors.forEach(e => console.log(e));
  
  console.log('\n=== PAGE ERRORS (with stack trace) ===');
  pageErrors.forEach(e => console.log(e));
});
