import { test, expect } from '@playwright/test';

test.describe('Earnings', () => {
  test('loads earnings totals', async ({ page }) => {
    await page.goto('/earnings');
    await expect(page.locator('text=CATEGORIES').or(page.locator('text=Total')).first()).toBeVisible({ timeout: 15000 });
  });
});
