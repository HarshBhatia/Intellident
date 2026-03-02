import { test, expect } from '@playwright/test';

test.describe('Visits and Billing E2E', () => {
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

    // Create a fresh clinic for this test
    await page.goto('http://localhost:3000/select-clinic');
    await page.fill('input[placeholder="Clinic Name"]', `Visit Test Clinic ${Date.now()}`);
    await page.click('button:has-text("Create")');
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('should create a visit', async ({ page }) => {
    // 1. Create a patient first in this new clinic
    await page.click('button:has-text("Add Your First Patient")');
    await page.fill('input[name="name"]', 'Visit Patient');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/patients\/PID-/);

    // 2. Ensure a doctor exists
    await page.goto('http://localhost:3000/settings?tab=doctors');
    const doctorInput = page.locator('input[placeholder="New doctors name..."]');
    await expect(doctorInput).toBeVisible({ timeout: 10000 });
    await doctorInput.fill('E2E Doctor');
    await page.click('button:has-text("ADD")');
    await expect(page.locator('text=E2E Doctor')).toBeVisible();

    // 3. Go back to dashboard
    await page.goto('http://localhost:3000/');
    await page.click('text=Visit Patient');
    
    // 4. Click "Record the first visit" or "NEW VISIT"
    const recordFirstVisit = page.getByRole('button', { name: /record the first visit/i });
    if (await recordFirstVisit.isVisible()) {
        await recordFirstVisit.click();
    } else {
        const newVisitBtn = page.getByRole('button', { name: /NEW VISIT/i });
        await expect(newVisitBtn).toBeVisible();
        await newVisitBtn.click();
    }

    // 5. Fill visit details
    const doctorSelect = page.locator('select').first();
    await expect(doctorSelect).toBeVisible();
    await page.waitForTimeout(1000);
    await doctorSelect.selectOption({ label: 'E2E Doctor' });
    
    await page.fill('textarea[placeholder="Details..."]', 'Routine Checkup');
    const costInput = page.locator('input[type="number"]');
    await costInput.fill('500');

    // 6. Submit
    await page.click('button:has-text("Save Visit")');

    // 7. Verify visit appears
    await expect(page.locator('text=Routine Checkup')).toBeVisible();
    await expect(page.locator('text=₹500')).toBeVisible();
  });
});
