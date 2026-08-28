import { test, expect } from '@playwright/test';
import { uniqueSuffix } from './helpers/auth';
import { snap } from './helpers/screenshot';

test.describe('Treatment Management', () => {
  test('should create a new treatment from settings', async ({ page }) => {
    await page.goto('/settings?tab=treatments');
    await expect(page.getByRole('heading', { name: 'Treatments' })).toBeVisible();

    const name = `Test Treatment ${uniqueSuffix()}`;
    await page.fill('input[placeholder*="New treatments"]', name);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText(name)).toBeVisible();
    await snap(page, 'treatment-created');
  });
});
