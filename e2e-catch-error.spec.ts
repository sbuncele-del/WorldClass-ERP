import { test, expect } from '@playwright/test';

test('Catch exact JS error', async ({ page }) => {
  const jsErrors: string[] = [];
  
  // Capture all JS errors with full stack
  page.on('pageerror', error => {
    jsErrors.push(`ERROR: ${error.message}\nSTACK: ${error.stack}`);
  });

  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[name="email"], input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[name="password"], input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard and potential errors
  await page.waitForTimeout(10000);
  
  console.log('\n========== JAVASCRIPT ERRORS ==========');
  if (jsErrors.length === 0) {
    console.log('No JS errors captured by pageerror event');
  } else {
    jsErrors.forEach(e => console.log(e));
  }
  
  // Also check if error boundary is showing
  const errorBoundary = await page.locator('text=Something went wrong').count() > 0;
  console.log('\nError boundary shown:', errorBoundary);
  
  // Try to get React error if visible
  const reactError = await page.locator('.ant-result-subtitle, .error-message').textContent().catch(() => null);
  if (reactError) console.log('React Error Text:', reactError);
  
  await page.screenshot({ path: 'catch-error.png', fullPage: true });
});
