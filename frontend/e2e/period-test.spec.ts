import { test, expect } from '@playwright/test';

test('Period Management page loads', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', response => {
    if (response.status() >= 400) {
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForTimeout(2000);
  
  const emailInput = page.locator('input').first();
  await emailInput.fill('admin@worldclass.erp');
  await page.locator('input[type="password"]').fill('Admin@123');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'test-results/after-login.png', fullPage: true });
  
  await page.goto('https://siyabusaerp.co.za/financial/periods');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'test-results/periods-page.png', fullPage: true });
  
  console.log('Errors:', errors);
  console.log('Current URL:', page.url());
  
  const html = await page.content();
  console.log('HTML length:', html.length);
  
  expect(errors.filter(e => e.includes('500'))).toHaveLength(0);
});
