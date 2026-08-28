import { test, expect } from '@playwright/test';
import { snap } from './helpers/screenshot';

test.describe('Clinic selection', () => {
  test('select-clinic lists a workspace', async ({ page }) => {
    await page.goto('/select-clinic');
    await expect(page.getByRole('heading', { name: 'Select Clinic' })).toBeVisible();
    await expect(page.getByText('Choose a workspace to continue')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /.+/ }).first()).toBeVisible();
    await snap(page, 'select-clinic');
  });

  test('sign-in page is reachable without a session', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/sign-in/);
    await snap(page, 'sign-in');
    await context.close();
  });

  test('unauthenticated API calls are rejected', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await context.request.get('/api/patients', { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    await context.close();
  });
});
