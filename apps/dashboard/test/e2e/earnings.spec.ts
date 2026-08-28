import { test, expect } from '@playwright/test';
import { snap } from './helpers/screenshot';

test.describe('Earnings', () => {
  test('loads earnings totals and monthly trend', async ({ page }) => {
    await page.goto('/earnings');
    await expect(page.getByRole('button', { name: 'CATEGORIES' })).toBeVisible();
    await expect(page.getByText('Period Revenue')).toBeVisible();
    await expect(page.getByText('Period Expenses')).toBeVisible();
    await expect(page.getByText('Net Profit')).toBeVisible();
    await snap(page, 'earnings-categories');

    await page.getByRole('button', { name: 'MONTHLY TREND' }).click();
    await expect(page.getByText('Select Year')).toBeVisible();
    await snap(page, 'earnings-monthly');
  });
});
