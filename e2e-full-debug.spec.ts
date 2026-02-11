import { test, expect } from '@playwright/test';

test('Full Debug - Catch React Error', async ({ page }) => {
  const errors: string[] = [];
  const failedResponses: any[] = [];
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Capture page errors (uncaught exceptions)
  page.on('pageerror', error => {
    errors.push('PAGE ERROR: ' + error.message);
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()}: ${response.url()}`);
    }
  });

  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[name="email"], input[type="email"]', 'admin@worldclass.erp');
  await page.fill('input[name="password"], input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  
  // Wait longer for all requests
  await page.waitForTimeout(8000);
  
  // Check for error boundary
  const hasError = await page.locator('text=Something went wrong').count() > 0;
  
  console.log('\n=== RESULT ===');
  console.log('Has "Something went wrong":', hasError);
  console.log('Current URL:', page.url());
  
  console.log('\n=== CONSOLE ERRORS ===');
  errors.forEach(e => console.log(e));
  
  console.log('\n=== FAILED RESPONSES ===');
  failedResponses.forEach(r => console.log(r));
  
  await page.screenshot({ path: 'full-debug.png', fullPage: true });
  
  if (hasError) {
    // Try to get more info
    const pageContent = await page.content();
    if (pageContent.includes('Cannot read properties')) {
      console.log('\n=== LIKELY CAUSE: Undefined property access ===');
    }
  }
});
