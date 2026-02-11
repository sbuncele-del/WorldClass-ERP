import { test } from '@playwright/test';

test('Check raw HTML', async ({ page }) => {
  const responses: string[] = [];
  const errors: string[] = [];
  
  page.on('response', r => {
    if (r.status() >= 400) responses.push(`${r.status()} ${r.url()}`);
  });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  // Go to login
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  const loginHtml = await page.content();
  console.log('=== LOGIN PAGE HTML (500 chars) ===');
  console.log(loginHtml.substring(0, 500));
  
  // Try to login
  const emailInput = page.locator('input').first();
  const allInputs = await page.locator('input').count();
  console.log('Number of inputs on login page:', allInputs);
  
  // Screenshot
  await page.screenshot({ path: 'test-results/login-raw.png', fullPage: true });
  
  // Try filling form
  await page.fill('input[name="email"]', 'admin@worldclass.erp').catch(() => {});
  await page.fill('#email', 'admin@worldclass.erp').catch(() => {});
  await page.fill('input:first-of-type', 'admin@worldclass.erp').catch(() => {});
  
  await page.waitForTimeout(1000);
  
  // Check visible text
  const bodyText = await page.locator('body').innerText().catch(() => 'FAILED TO GET TEXT');
  console.log('Login page body text:', bodyText.substring(0, 300));
  
  console.log('HTTP Errors:', responses);
  console.log('JS Errors:', errors);
});
