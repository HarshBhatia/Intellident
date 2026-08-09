import { test, expect } from '@playwright/test';

test.describe('Treatment Management', () => {
  test('should create a new treatment from settings', async ({ page }) => {
    await page.goto('/settings?tab=treatments');
    await expect(page.locator('h2:has-text("Treatments")')).toBeVisible();

    const timestamp = Date.now();
    const name = `Test Treatment ${timestamp}`;
    await page.fill('input[placeholder*="New treatments"]', name);
    await page.click('button:has-text("Add")');
    await expect(page.getByText(name)).toBeVisible();
  });
});
