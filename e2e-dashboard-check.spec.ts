/**
 * E2E Test: Dashboard Error Check
 * Logs in and captures any errors on the dashboard page
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Error Check', () => {
  test('should login and check dashboard for errors', async ({ page }) => {
    const errors: string[] = [];
    const logs: string[] = [];

    // Capture all console messages
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', err => {
      errors.push(`PAGE ERROR: ${err.message}`);
    });

    // Navigate to login
    console.log('Navigating to login page...');
    await page.goto('https://siyabusaerp.co.za/login', { waitUntil: 'networkidle', timeout: 60000 });

    // Check if we're on login page
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible({ timeout: 10000 });

    // Fill login credentials
    console.log('Filling credentials...');
    await page.fill('input[name="email"], input[type="email"]', 'sibusiso.khuzwayo@outlook.com');
    await page.fill('input[type="password"]', 'Sipho@2011');

    // Click login
    console.log('Clicking login...');
    await page.click('button[type="submit"]');

    // Wait for either redirect to dashboard OR error message
    console.log('Waiting for navigation...');
    
    // Wait for either success (dashboard) or error (stays on login)
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(3000); // Give React time to render

    // Get current URL
    const url = page.url();
    console.log('Current URL:', url);

    // Check if we hit the error boundary
    const errorTitle = await page.locator('text=Something went wrong').isVisible().catch(() => false);
    
    if (errorTitle) {
      console.log('ERROR BOUNDARY CAUGHT AN ERROR');
      
      // Try to find the error details
      const errorPre = await page.locator('pre').textContent().catch(() => null);
      if (errorPre) {
        console.log('Error details:', errorPre);
        errors.push(`ERROR BOUNDARY: ${errorPre}`);
      } else {
        console.log('No error details found in pre element');
      }
      
      // Take a screenshot
      await page.screenshot({ path: 'dashboard-error.png', fullPage: true });
    }

    // Print all console messages
    console.log('\n=== Console Messages ===');
    for (const log of logs) {
      console.log(log);
    }

    console.log('\n=== Errors ===');
    for (const err of errors) {
      console.log(err);
    }

    // If there's an error boundary, fail the test with details
    if (errorTitle) {
      throw new Error(`Dashboard crashed. Errors: ${JSON.stringify(errors)}`);
    }

    // Otherwise check we're on dashboard
    expect(url).toContain('/app');
  });
});
