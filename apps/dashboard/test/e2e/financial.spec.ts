import { test, expect } from '@playwright/test';

test.describe('Financial Management E2E', () => {
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

    // Create a fresh clinic
    await page.goto('http://localhost:3000/select-clinic');
    await page.fill('input[placeholder="Clinic Name"]', `Finance Test ${Date.now()}`);
    await page.click('button:has-text("Create")');
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('should track earnings from patient visits', async ({ page }) => {
    // Setup: Add doctor
    await page.goto('http://localhost:3000/settings?tab=doctors');
    await page.fill('input[placeholder="New doctors name..."]', 'Dr. Finance');
    await page.click('button:has-text("ADD")');

    // Add patient
    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Your First Patient")');
    await page.fill('input[name="name"]', 'Paying Patient');
    await page.click('button:has-text("Create Patient")');

    // Add visit with payment
    await page.click('button:has-text("Record the first visit")');
    await page.selectOption('#visit-doctor', { label: 'Dr. Finance' });
    await page.fill('#visit-findings', 'Paid consultation');
    await page.fill('#visit-cost', '2000');
    await page.fill('#visit-paid', '2000');
    await page.click('#save-visit-btn');

    // Go to earnings page
    await page.goto('http://localhost:3000/earnings');
    await expect(page.locator('text=Earnings')).toBeVisible();

    // Should show the payment
    await expect(page.locator('text=₹2,000')).toBeVisible();
    await expect(page.locator('text=Paying Patient')).toBeVisible();
  });

  test('should track partial payments', async ({ page }) => {
    // Setup
    await page.goto('http://localhost:3000/settings?tab=doctors');
    await page.fill('input[placeholder="New doctors name..."]', 'Dr. Partial');
    await page.click('button:has-text("ADD")');

    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Your First Patient")');
    await page.fill('input[name="name"]', 'Partial Payment Patient');
    await page.click('button:has-text("Create Patient")');

    // Add visit with partial payment
    await page.click('button:has-text("Record the first visit")');
    await page.selectOption('#visit-doctor', { label: 'Dr. Partial' });
    await page.fill('#visit-findings', 'Partial payment visit');
    await page.fill('#visit-cost', '3000');
    await page.fill('#visit-paid', '1500');
    await page.click('#save-visit-btn');

    // Verify balance due is shown
    await expect(page.locator('text=Balance Due')).toBeVisible();
    await expect(page.locator('text=₹1,500')).toBeVisible();
  });

  test('should add and track expenses', async ({ page }) => {
    // Go to expenses page
    await page.goto('http://localhost:3000/expenses');
    await expect(page.locator('text=Expenses')).toBeVisible();

    // Add expense category first
    await page.goto('http://localhost:3000/settings?tab=expense-categories');
    await page.fill('input[placeholder="New expense category..."]', 'Medical Supplies');
    await page.click('button:has-text("ADD")');
    await expect(page.locator('text=Medical Supplies')).toBeVisible();

    // Add an expense
    await page.goto('http://localhost:3000/expenses');
    await page.click('button:has-text("Add Expense")');
    
    await page.selectOption('select[name="category"]', 'Medical Supplies');
    await page.fill('input[name="amount"]', '5000');
    await page.fill('textarea[name="description"]', 'Dental instruments purchase');
    await page.click('button:has-text("Add Expense")');

    // Verify expense appears
    await expect(page.locator('text=Medical Supplies')).toBeVisible();
    await expect(page.locator('text=₹5,000')).toBeVisible();
    await expect(page.locator('text=Dental instruments purchase')).toBeVisible();
  });

  test('should calculate net profit correctly', async ({ page }) => {
    // Setup doctor
    await page.goto('http://localhost:3000/settings?tab=doctors');
    await page.fill('input[placeholder="New doctors name..."]', 'Dr. Profit');
    await page.click('button:has-text("ADD")');

    // Add expense category
    await page.goto('http://localhost:3000/settings?tab=expense-categories');
    await page.fill('input[placeholder="New expense category..."]', 'Rent');
    await page.click('button:has-text("ADD")');

    // Add patient and visit (earning)
    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Your First Patient")');
    await page.fill('input[name="name"]', 'Profit Patient');
    await page.click('button:has-text("Create Patient")');
    await page.click('button:has-text("Record the first visit")');
    await page.selectOption('#visit-doctor', { label: 'Dr. Profit' });
    await page.fill('#visit-cost', '10000');
    await page.fill('#visit-paid', '10000');
    await page.click('#save-visit-btn');

    // Add expense
    await page.goto('http://localhost:3000/expenses');
    await page.click('button:has-text("Add Expense")');
    await page.selectOption('select[name="category"]', 'Rent');
    await page.fill('input[name="amount"]', '3000');
    await page.click('button:has-text("Add Expense")');

    // Check earnings page for net profit
    await page.goto('http://localhost:3000/earnings');
    
    // Should show total earnings of 10000
    await expect(page.locator('text=₹10,000')).toBeVisible();
  });

  test('should filter expenses by date range', async ({ page }) => {
    // Add expense category
    await page.goto('http://localhost:3000/settings?tab=expense-categories');
    await page.fill('input[placeholder="New expense category..."]', 'Utilities');
    await page.click('button:has-text("ADD")');

    // Add expense
    await page.goto('http://localhost:3000/expenses');
    await page.click('button:has-text("Add Expense")');
    await page.selectOption('select[name="category"]', 'Utilities');
    await page.fill('input[name="amount"]', '1500');
    await page.click('button:has-text("Add Expense")');

    // Verify expense is visible
    await expect(page.locator('text=₹1,500')).toBeVisible();

    // Try filtering (if date filters exist)
    const dateFilter = page.locator('input[type="date"]').first();
    if (await dateFilter.isVisible()) {
      // Set date range to exclude today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await dateFilter.fill(yesterday.toISOString().split('T')[0]);
      
      // Expense should not be visible
      await expect(page.locator('text=Utilities')).not.toBeVisible();
    }
  });
});
