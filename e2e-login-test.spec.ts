import { test, expect } from '@playwright/test';

test('Login and Dashboard flow', async ({ page }) => {
  // Clear storage first
  await page.context().clearCookies();
  
  console.log('Step 1: Going to login page...');
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  
  // Screenshot login page
  await page.screenshot({ path: 'test-1-login-page.png' });
  console.log('Screenshot: test-1-login-page.png');
  
  console.log('Step 2: Filling login form...');
  await page.fill('input[name="email"], input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[name="password"], input[type="password"]', 'Admin123!');
  await page.screenshot({ path: 'test-2-filled-form.png' });
  
  console.log('Step 3: Clicking login button...');
  await page.click('button[type="submit"]');
  
  // Wait for navigation or error
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-3-after-login.png' });
  
  console.log('Step 4: Current URL:', page.url());
  
  // Check console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Wait more and screenshot
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-4-dashboard.png' });
  
  // Check for error message on page
  const errorText = await page.locator('text=Something went wrong').count();
  if (errorText > 0) {
    console.log('ERROR: "Something went wrong" displayed!');
    
    // Check network requests
    console.log('Checking failed requests...');
  }
  
  console.log('Final URL:', page.url());
  console.log('Console errors:', errors);
  
  await page.screenshot({ path: 'test-5-final.png' });
});
