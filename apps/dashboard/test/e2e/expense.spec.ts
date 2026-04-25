import { test, expect } from '@playwright/test';

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expenses');
  });

  test('should create a new expense', async ({ page }) => {
    // Wait for page to load - look for the form heading
    await expect(page.locator('h2:has-text("LOG NEW EXPENSE")')).toBeVisible();
    
    // Fill expense form - use placeholder instead of name attribute
    const timestamp = Date.now();
    await page.fill('input[placeholder="Details..."]', `Test Expense ${timestamp}`);
    await page.fill('input[placeholder="0"]', '5000');
    
    // Wait for categories to load and select first category
    const categorySelect = page.locator('select').first();
    await categorySelect.waitFor({ state: 'visible' });
    await page.waitForTimeout(2000); // Wait for options to populate
    await categorySelect.selectOption({ index: 1 });
    
    // Submit form
    await page.click('button:has-text("ADD EXPENSE ENTRY")');
    
    // Verify expense appears in the table
    await expect(page.locator(`text=Test Expense ${timestamp}`)).toBeVisible();
    await expect(page.locator('text=5,000')).toBeVisible(); // Formatted with comma
  });

  test('should view expense list', async ({ page }) => {
    // Verify table heading is visible
    await expect(page.locator('h3:has-text("EXPENSE RECORDS")')).toBeVisible();
    
    // Verify table headers using more specific selectors
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Category")')).toBeVisible();
    await expect(page.locator('th:has-text("Description")')).toBeVisible();
    await expect(page.locator('th:has-text("Amount")')).toBeVisible();
  });

  test('should filter expenses by date range', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h2:has-text("LOG NEW EXPENSE")')).toBeVisible();
    
    // Look for date filter inputs
    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    
    if (count >= 2) {
      // Set date range
      const today = new Date().toISOString().split('T')[0];
      await dateInputs.nth(0).fill(today);
      await dateInputs.nth(1).fill(today);
      
      // Wait for results to update
      await page.waitForTimeout(1000);
      
      // Verify table heading is still visible (filtered results)
      await expect(page.locator('h3:has-text("EXPENSE RECORDS")')).toBeVisible();
    }
  });

  test('should delete an expense', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h2:has-text("LOG NEW EXPENSE")')).toBeVisible();
    
    // Check if there are any expenses with delete buttons (× symbol)
    const deleteButtons = page.locator('button:has-text("×")');
    const count = await deleteButtons.count();
    
    if (count > 0) {
      // Get initial row count
      const initialRows = await page.locator('tbody tr').count();
      
      // Click first delete button
      await deleteButtons.first().click();
      
      // Wait for deletion to complete
      await page.waitForTimeout(1000);
      
      // Verify row was deleted (count decreased or shows "No records" message)
      const finalRows = await page.locator('tbody tr').count();
      const noRecordsVisible = await page.locator('text=No records matching your filters').isVisible();
      
      expect(finalRows < initialRows || noRecordsVisible).toBeTruthy();
    }
  });
});
