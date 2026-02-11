import { test } from '@playwright/test';
test('Get error text', async ({ page }) => {
  await page.goto('https://siyabusaerp.co.za/login');
  await page.fill('input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  
  // Try to get the error text from the pre element
  const errorText = await page.locator('pre').textContent().catch(() => 'No error pre found');
  console.log('\n=== ERROR TEXT ===');
  console.log(errorText);
  await page.screenshot({ path: 'error-details.png', fullPage: true });
});
