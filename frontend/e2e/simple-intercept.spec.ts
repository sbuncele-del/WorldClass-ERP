import { test } from '@playwright/test';
test('Quick intercept', async ({ page }) => {
  const reqs: string[] = [];
  page.on('response', r => reqs.push(`${r.status()} ${r.url()}`));
  await page.goto('https://siyabusaerp.co.za/login');
  await page.fill('input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  reqs.filter(r => r.includes('/api/')).forEach(r => console.log(r));
});
