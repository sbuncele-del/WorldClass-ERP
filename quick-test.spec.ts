import { test } from '@playwright/test';
test('Quick', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  
  await page.goto('https://siyabusaerp.co.za/login');
  await page.fill('input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  
  console.log('URL:', page.url());
  console.log('Errors:', errors);
  console.log('Error shown:', await page.locator('text=Something went wrong').count() > 0);
});
