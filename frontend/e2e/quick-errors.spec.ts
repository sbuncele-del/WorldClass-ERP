import { test } from '@playwright/test';

test('Quick error check', async ({ page }) => {
  const allResponses: string[] = [];
  
  page.on('response', r => allResponses.push(`${r.status()} ${r.url()}`));
  
  await page.goto('https://siyabusaerp.co.za/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input:first-of-type', 'admin@worldclass.erp');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(3000);
  
  console.log('=== API RESPONSES ===');
  allResponses.filter(r => r.includes('/api/')).forEach(r => console.log(r));
  
  console.log('\n=== API FAILURES ===');
  allResponses.filter(r => r.includes('/api/') && !r.startsWith('200')).forEach(f => console.log(f));
});
