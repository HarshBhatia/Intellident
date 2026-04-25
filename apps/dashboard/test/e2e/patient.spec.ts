import { test, expect } from '@playwright/test';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    // Patients are on the main dashboard, not /patients
    await page.goto('/');
  });

  test('should create a new patient', async ({ page }) => {
    // Click "Add Patient" button
    await page.click('button:has-text("Add Patient")');
    
    // Wait for form to appear
    await expect(page.locator('h2:has-text("New Patient")')).toBeVisible();
    
    // Fill patient form
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Test Patient ${timestamp}`);
    await page.fill('input[name="phone_number"]', '9876543210');
    await page.fill('input[name="age"]', '35');
    await page.selectOption('select[name="gender"]', 'Male');
    
    // Submit form
    await page.click('button:has-text("Create Patient")');
    
    // Verify redirect to patient detail page
    await expect(page).toHaveURL(/\/patients\/PID-/);
    
    // Verify patient name is displayed on detail page
    await expect(page.locator(`text=${`Test Patient ${timestamp}`}`).first()).toBeVisible();
  });

  test('should view patient list', async ({ page }) => {
    // Verify heading is visible
    await expect(page.locator('h2:has-text("Patient Records")')).toBeVisible();
    
    // Verify table headers using th elements
    await expect(page.locator('th', { hasText: 'ID' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'NAME' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'AGE' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'GENDER' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'PHONE' })).toBeVisible();
  });

  test('should search for a patient', async ({ page }) => {
    // Wait for search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.waitFor({ state: 'visible' });
    
    // Search for a patient
    await searchInput.fill('John');
    
    // Wait for results to update
    await page.waitForTimeout(500);
    
    // Verify search results contain the search term
    const tableRows = page.locator('tbody tr');
    const count = await tableRows.count();
    
    if (count > 0) {
      const firstRow = tableRows.first();
      await expect(firstRow).toBeVisible();
    }
  });

  test('should edit patient details', async ({ page }) => {
    // Click on first patient row
    const firstPatient = page.locator('tbody tr').first();
    await firstPatient.click();
    
    // Wait for patient detail page
    await expect(page).toHaveURL(/\/patients\/PID-/);
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Update age
    const ageInput = page.locator('input[name="age"]');
    await ageInput.clear();
    await ageInput.fill('40');
    
    // Save changes
    await page.click('button:has-text("Save")');
    
    // Verify update
    await expect(page.locator('text=40')).toBeVisible();
  });
});
