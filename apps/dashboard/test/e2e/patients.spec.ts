import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set mock E2E bypass
    await page.context().addCookies([
      {
        name: 'x-e2e-secret',
        value: 'e2e-secret-key',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Create a fresh clinic for this test to avoid sharing data
    await page.goto('/select-clinic');
    await page.fill('input[placeholder="Clinic Name"]', `Test Clinic ${Date.now()}`);
    await page.click('button:has-text("Create")');
    await expect(page).toHaveURL('/');
  });

  test('should load the dashboard', async ({ page }) => {
    await page.goto('/');
    // The current title is just "Dashboard"
    await expect(page).toHaveTitle(/Dashboard/i);
  });

  test('should navigate to patients page', async ({ page }) => {
    await page.goto('/');
    // Check if the empty state CTA is visible
    await expect(page.getByRole('button', { name: /Add Your First Patient/i })).toBeVisible();
  });

  test('should add a new patient', async ({ page }) => {
    await page.goto('/');
    
    // Use the empty state CTA button
    const addPatientBtn = page.getByRole('button', { name: /Add Your First Patient/i }).first();
    await addPatientBtn.click();

    // Fill form
    await page.fill('input[name="name"]', 'E2E Test Patient');
    await page.fill('input[name="phone_number"]', '9999999999');
    await page.fill('input[name="age"]', '25');

    // Submit
    await page.click('button:has-text("Create Patient")');

    // Verify redirect to detail page
    await expect(page).toHaveURL(/\/patients\/PID-/);
    await expect(page.locator('h1')).toContainText('E2E Test Patient');
  });
});
