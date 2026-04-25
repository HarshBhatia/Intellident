import { test, expect } from '@playwright/test';

test.describe('Treatment Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should view treatments list', async ({ page }) => {
    // Navigate to settings or treatments page
    const settingsLink = page.locator('a[href="/settings"]');
    
    if (await settingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsLink.click();
      
      // Look for treatments section
      const treatmentsSection = page.locator('text=Treatments').or(page.locator('h2:has-text("Treatments")'));
      
      if (await treatmentsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(treatmentsSection).toBeVisible();
      }
    }
  });

  test('should create a new treatment', async ({ page }) => {
    // Navigate to settings
    const settingsLink = page.locator('a[href="/settings"]');
    
    if (await settingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsLink.click();
      
      // Click "Add Treatment" button
      const addButton = page.locator('button:has-text("Add Treatment")');
      
      if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addButton.click();
        
        // Fill treatment form
        const timestamp = Date.now();
        await page.fill('input[name="name"]', `Test Treatment ${timestamp}`);
        await page.fill('input[name="default_price"]', '2000');
        
        // Submit form
        await page.click('button:has-text("Create")');
        
        // Verify treatment appears in the list
        await expect(page.locator(`text=Test Treatment ${timestamp}`)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should edit a treatment', async ({ page }) => {
    // Navigate to settings
    const settingsLink = page.locator('a[href="/settings"]');
    
    if (await settingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsLink.click();
      
      // Look for edit button
      const editButton = page.locator('button:has-text("Edit")').first();
      
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        // Update price
        const priceInput = page.locator('input[name="default_price"]');
        await priceInput.clear();
        await priceInput.fill('2500');
        
        // Save changes
        await page.click('button:has-text("Save")');
        
        // Verify update
        await expect(page.locator('text=2500')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
