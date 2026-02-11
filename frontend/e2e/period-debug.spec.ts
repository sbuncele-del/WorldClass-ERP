import { test, expect } from '@playwright/test';

test('Debug Period Management', async ({ page }) => {
  // Capture all console messages
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));

  // Login
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input[id="email"], #email', 'admin@worldclass.erp');
  await page.fill('input[type="password"], input[id="password"], #password', 'Admin@123');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  
  // Navigate to periods
  await page.goto('https://siyabusaerp.co.za/financial/periods');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  // Take full page screenshot at larger viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/periods-full.png', fullPage: true });
  
  // Get page content
  const title = await page.title();
  const bodyText = await page.locator('body').innerText();
  const html = await page.content();
  
  console.log('=== PAGE TITLE ===');
  console.log(title);
  console.log('=== BODY TEXT (first 3000 chars) ===');
  console.log(bodyText.substring(0, 3000));
  console.log('=== CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));
  
  // Check for common elements
  const hasTable = await page.locator('table, .ant-table').count();
  const hasCards = await page.locator('.ant-card').count();
  const hasButtons = await page.locator('button').count();
  const hasPeriodText = bodyText.toLowerCase().includes('period');
  
  console.log('=== ELEMENT COUNTS ===');
  console.log('Tables:', hasTable);
  console.log('Cards:', hasCards);
  console.log('Buttons:', hasButtons);
  console.log('Has "period" text:', hasPeriodText);
  
  expect(bodyText.length).toBeGreaterThan(50);
});
