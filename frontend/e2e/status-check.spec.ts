import { test } from '@playwright/test';

test('Status check', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('response', r => {
    if (r.url().includes('/api/')) apiCalls.push(`${r.status()} ${r.url().split('?')[0]}`);
  });

  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(4000);
  
  const url = page.url();
  const text = await page.locator('body').innerText();
  
  console.log('URL:', url);
  console.log('Page shows:', text.substring(0, 200));
  console.log('API calls:', apiCalls.join('\n'));
});
