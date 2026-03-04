import { test, expect } from '@playwright/test';

test.describe('Complete User Flow E2E', () => {
  let clinicName: string;

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
    clinicName = `E2E Clinic ${Date.now()}`;
    await page.goto('http://localhost:3000/select-clinic');
    await page.fill('input[placeholder="Clinic Name"]', clinicName);
    await page.click('button:has-text("Create")');
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('complete workflow: setup clinic, add doctor, add patient, record visit', async ({ page }) => {
    // Step 1: Verify dashboard loads with empty state
    await expect(page.locator('text=Total Patients')).toBeVisible();
    await expect(page.locator('text=0').first()).toBeVisible();

    // Step 2: Add a doctor first
    await page.goto('http://localhost:3000/settings?tab=doctors');
    const doctorInput = page.locator('input[placeholder="New doctors name..."]');
    await expect(doctorInput).toBeVisible({ timeout: 10000 });
    await doctorInput.fill('Dr. John Smith');
    await page.click('button:has-text("ADD")');
    await expect(page.locator('text=Dr. John Smith')).toBeVisible();

    // Step 3: Update clinic information
    await page.click('button:has-text("Clinic Info")');
    await page.fill('input[name="phone"]', '+919876543210');
    await page.fill('input[name="address"]', '123 Test Street, Test City');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Clinic information updated successfully')).toBeVisible();

    // Step 4: Add a patient
    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Your First Patient")');
    await page.fill('input[name="name"]', 'Alice Johnson');
    await page.fill('input[name="phone_number"]', '9876543210');
    await page.fill('input[name="age"]', '35');
    await page.selectOption('select[name="gender"]', 'Female');
    await page.selectOption('select[name="patient_type"]', 'New');
    await page.click('button:has-text("Create Patient")');

    // Verify patient detail page
    await expect(page).toHaveURL(/\/patients\/PID-/);
    await expect(page.locator('h1')).toContainText('Alice Johnson');
    await expect(page.locator('text=35')).toBeVisible();
    await expect(page.locator('text=Female')).toBeVisible();

    // Step 5: Record a visit
    const recordFirstVisit = page.getByRole('button', { name: /record the first visit/i });
    await expect(recordFirstVisit).toBeVisible();
    await recordFirstVisit.click();

    // Fill visit form
    await page.selectOption('#visit-doctor', { label: 'Dr. John Smith' });
    await page.selectOption('#visit-type', 'Consultation');
    await page.fill('#visit-findings', 'Patient complains of tooth sensitivity');
    await page.fill('#visit-procedure', 'Dental examination and cleaning');
    await page.fill('#visit-tooth', '16');
    await page.fill('#visit-medicine', 'Sensodyne toothpaste');
    await page.fill('#visit-cost', '1500');
    await page.fill('#visit-paid', '1500');

    // Save visit
    await page.click('#save-visit-btn');

    // Verify visit appears in history
    await expect(page.locator('text=Patient complains of tooth sensitivity')).toBeVisible();
    await expect(page.locator('text=Dental examination and cleaning')).toBeVisible();
    await expect(page.locator('span.text-green-600:has-text("₹1,500")')).toBeVisible();

    // Step 6: Add another patient
    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Patient")');
    await page.fill('input[name="name"]', 'Bob Williams');
    await page.fill('input[name="phone_number"]', '9123456789');
    await page.fill('input[name="age"]', '42');
    await page.selectOption('select[name="gender"]', 'Male');
    await page.click('button:has-text("Create Patient")');

    // Step 7: Verify dashboard shows 2 patients
    await page.goto('http://localhost:3000/');
    await expect(page.locator('text=2').first()).toBeVisible();
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
    await expect(page.locator('text=Bob Williams')).toBeVisible();

    // Step 8: Search for a patient
    await page.fill('input[placeholder="Search..."]', 'Alice');
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
    await expect(page.locator('text=Bob Williams')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder="Search..."]', '');
    await expect(page.locator('text=Bob Williams')).toBeVisible();
  });

  test('should handle patient with multiple visits', async ({ page }) => {
    // Setup: Add doctor
    await page.goto('http://localhost:3000/settings?tab=doctors');
    const doctorInput = page.locator('input[placeholder="New doctors name..."]');
    await doctorInput.fill('Dr. Sarah Lee');
    await page.click('button:has-text("ADD")');

    // Add patient
    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Your First Patient")');
    await page.fill('input[name="name"]', 'Charlie Brown');
    await page.fill('input[name="phone_number"]', '9988776655');
    await page.fill('input[name="age"]', '28');
    await page.click('button:has-text("Create Patient")');

    // Add first visit
    await page.click('button:has-text("Record the first visit")');
    await page.selectOption('#visit-doctor', { label: 'Dr. Sarah Lee' });
    await page.fill('#visit-findings', 'First visit - routine checkup');
    await page.fill('#visit-cost', '800');
    await page.fill('#visit-paid', '800');
    await page.click('#save-visit-btn');

    // Add second visit
    await page.click('button:has-text("NEW VISIT")');
    await page.selectOption('#visit-doctor', { label: 'Dr. Sarah Lee' });
    await page.fill('#visit-findings', 'Second visit - follow-up');
    await page.fill('#visit-cost', '600');
    await page.fill('#visit-paid', '300');
    await page.click('#save-visit-btn');

    // Verify both visits appear
    await expect(page.locator('text=First visit - routine checkup')).toBeVisible();
    await expect(page.locator('text=Second visit - follow-up')).toBeVisible();

    // Verify total amounts
    const totalCost = page.locator('text=Total Cost').locator('..').locator('text=₹1,400');
    await expect(totalCost).toBeVisible();
  });

  test('should validate required fields when adding patient', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Your First Patient")');

    // Try to submit without filling required fields
    await page.click('button:has-text("Create Patient")');

    // Form should not submit (still on same page)
    await expect(page.locator('text=Add New Patient')).toBeVisible();

    // Fill only name and submit
    await page.fill('input[name="name"]', 'Test Patient');
    await page.click('button:has-text("Create Patient")');

    // Should succeed and redirect
    await expect(page).toHaveURL(/\/patients\/PID-/);
  });

  test('should cancel patient creation', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Your First Patient")');

    // Fill some data
    await page.fill('input[name="name"]', 'Cancelled Patient');
    await page.fill('input[name="phone_number"]', '9999999999');

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Should return to dashboard
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('text=Cancelled Patient')).not.toBeVisible();
  });
});
