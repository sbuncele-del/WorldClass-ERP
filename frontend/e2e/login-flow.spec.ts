import { test, expect } from '@playwright/test';

test('Login and verify', async ({ page }) => {
  const responses: string[] = [];
  const errors: string[] = [];
  
  page.on('response', r => {
    const url = r.url();
    if (url.includes('/api/')) {
      responses.push(`${r.status()} ${url}`);
    }
  });
  page.on('pageerror', e => errors.push(`PAGE ERROR: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
  });
  
  // Go to login
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  
  // Fill credentials
  await page.fill('input[type="email"], input[placeholder*="mail"], input:first-of-type', 'admin@worldclass.erp');
  await page.fill('input[type="password"], input[placeholder*="assword"]', 'Admin@123');
  
  console.log('Before submit - taking screenshot');
  await page.screenshot({ path: 'test-results/before-submit.png' });
  
  // Click sign in
  await page.click('button:has-text("Sign In")');
  
  // Wait for navigation
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  console.log('After login URL:', currentUrl);
  
  await page.screenshot({ path: 'test-results/after-submit.png', fullPage: true });
  
  // Check body text
  const bodyText = await page.locator('body').innerText();
  console.log('Body text (first 500):', bodyText.substring(0, 500));
  
  // Element counts
  console.log('Buttons:', await page.locator('button').count());
  console.log('Links:', await page.locator('a').count());
  console.log('Tables:', await page.locator('table').count());
  
  console.log('=== API RESPONSES ===');
  responses.forEach(r => console.log(r));
  
  console.log('=== ERRORS ===');
  errors.forEach(e => console.log(e));
  
  // Expect we landed somewhere after login
  expect(currentUrl).not.toContain('/login');
});
