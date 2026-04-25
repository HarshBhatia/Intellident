import { test, expect } from '@playwright/test';

test.describe('Visit Management', () => {
  test.beforeEach(async ({ page }) => {
    // Start at dashboard where patients are listed
    await page.goto('/');
  });

  test('should create a new visit for a patient', async ({ page }) => {
    // Click on first patient
    const firstPatient = page.locator('tbody tr').first();
    await firstPatient.click();
    
    // Wait for patient detail page
    await expect(page).toHaveURL(/\/patients\/PID-/);
    
    // Click "Add Visit" button
    await page.click('button:has-text("Add Visit")');
    
    // Fill visit form
    await page.fill('textarea[name="chief_complaint"]', 'Routine checkup');
    await page.fill('textarea[name="diagnosis"]', 'Healthy teeth');
    await page.fill('textarea[name="treatment_plan"]', 'Continue regular brushing');
    
    // Submit form
    await page.click('button:has-text("Create Visit")');
    
    // Verify visit appears in the list
    await expect(page.locator('text=Routine checkup')).toBeVisible();
  });

  test('should view visit details', async ({ page }) => {
    // Click on first patient
    const firstPatient = page.locator('tbody tr').first();
    await firstPatient.click();
    
    // Wait for patient detail page
    await expect(page).toHaveURL(/\/patients\/PID-/);
    
    // Check if there are any visits
    const visitCards = page.locator('[data-testid="visit-card"]').or(page.locator('text=Chief Complaint'));
    const hasVisits = await visitCards.count() > 0;
    
    if (hasVisits) {
      // Click on first visit
      await visitCards.first().click();
      
      // Verify visit details are visible
      await expect(page.locator('text=Chief Complaint')).toBeVisible();
    }
  });

  test('should add billing items to a visit', async ({ page }) => {
    // Click on first patient
    const firstPatient = page.locator('tbody tr').first();
    await firstPatient.click();
    
    // Wait for patient detail page
    await expect(page).toHaveURL(/\/patients\/PID-/);
    
    // Click "Add Visit" button
    await page.click('button:has-text("Add Visit")');
    
    // Fill visit form
    await page.fill('textarea[name="chief_complaint"]', 'Dental cleaning');
    
    // Add billing item
    await page.click('button:has-text("Add Item")');
    await page.fill('input[name="description"]', 'Cleaning');
    await page.fill('input[name="amount"]', '1000');
    
    // Submit form
    await page.click('button:has-text("Create Visit")');
    
    // Verify billing item appears
    await expect(page.locator('text=Cleaning')).toBeVisible();
    await expect(page.locator('text=1000').or(page.locator('text=1,000'))).toBeVisible();
  });
});
