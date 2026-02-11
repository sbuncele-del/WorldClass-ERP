import { test, expect } from '@playwright/test';

test('Final check', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[PAGE_ERR] ${e.message}`));

  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/app/**', { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  const bodyText = await page.locator('body').innerText();
  console.log('URL:', page.url());
  console.log('Body preview:', bodyText.substring(0, 300));
  console.log('Logs:', logs.slice(0, 20).join('\n'));
  
  // Check if error page
  const hasError = bodyText.includes('Something went wrong');
  console.log('Has Error Page:', hasError);
  
  expect(hasError).toBe(false);
});
