import { test, expect } from '@playwright/test';

const BASE_URL = 'https://siyabusaerp.co.za';

test.describe('Period Management', () => {
  test('full login and period test', async ({ page }) => {
    // Capture all network requests and responses
    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('api')) {
        requests.push(`REQ: ${req.method()} ${req.url()}`);
      }
    });
    page.on('response', res => {
      if (res.url().includes('api')) {
        requests.push(`RES: ${res.status()} ${res.url()}`);
      }
    });
    
    // Capture console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Go to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find and fill login form
    const emailInput = page.locator('input[name="email"], input#email, input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input#password, input[type="password"]').first();
    
    await emailInput.fill('admin@worldclass.erp');
    await passwordInput.fill('Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('After login URL:', page.url());
    
    // Go to periods
    await page.goto(`${BASE_URL}/financial/periods`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'test-results/periods-final.png', fullPage: true });
    console.log('Periods URL:', page.url());
    console.log('Network requests:', requests);
    console.log('Console errors:', errors);
    
    // Check for visible content
    const visibleText = await page.locator('body').textContent();
    console.log('Visible text length:', visibleText?.length);
  });
});
