import { test } from '@playwright/test';

test('Intercept all after login', async ({ page }) => {
  const allRequests: string[] = [];
  
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      allRequests.push(`REQUEST: ${req.method()} ${req.url()}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('/api/')) {
      allRequests.push(`RESPONSE: ${res.status()} ${res.url()}`);
    }
  });
  
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input:first-of-type', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(5000);
  
  console.log('=== ALL API TRAFFIC ===');
  allRequests.forEach(r => console.log(r));
  
  // Screenshot
  await page.screenshot({ path: 'test-results/after-login-full.png', fullPage: true });
  
  // Page content
  const text = await page.locator('body').innerText();
  console.log('\n=== BODY TEXT ===');
  console.log(text);
});
