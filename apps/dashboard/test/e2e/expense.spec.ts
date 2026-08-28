import { test, expect } from '@playwright/test';
import { acceptNextDialog, dismissNextDialog, ensureExpenseCategory, uniqueSuffix } from './helpers/auth';
import { snap } from './helpers/screenshot';

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page }) => {
    await ensureExpenseCategory(page);
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: /log new expense/i })).toBeVisible();
  });

  test('should create a new expense', async ({ page }) => {
    const description = `Test Expense ${uniqueSuffix()}`;
    await page.fill('input[placeholder="Details..."]', description);
    await page.fill('input[placeholder="0"]', '5000');

    const categorySelect = page.locator('select').first();
    await expect(categorySelect.locator('option')).not.toHaveCount(1);
    await categorySelect.selectOption({ index: 1 });

    await page.getByRole('button', { name: /add expense entry/i }).click();
    const row = page.locator('tr', { hasText: description });
    await expect(row).toBeVisible();
    await expect(row).toContainText('5,000');
    await snap(page, 'expense-created');
  });

  test('should view expense list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /expense records/i })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Date' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Category' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Description' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Amount' })).toBeVisible();
    await snap(page, 'expense-list');
  });

  test('should filter expenses by search', async ({ page }) => {
    const description = `FilterMe ${uniqueSuffix()}`;
    await page.fill('input[placeholder="Details..."]', description);
    await page.fill('input[placeholder="0"]', '250');
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: /add expense entry/i }).click();
    await expect(page.getByText(description)).toBeVisible();

    const search = page.locator('input[placeholder*="Search"]').first();
    await search.fill(description);
    await expect(page.getByText(description)).toBeVisible();
    await search.fill('zzz-no-such-expense');
    await expect(page.getByText('No records matching your filters')).toBeVisible();
    await snap(page, 'expense-search-empty');
  });

  test('should delete an expense', async ({ page }) => {
    const description = `DeleteExp ${uniqueSuffix()}`;
    await page.fill('input[placeholder="Details..."]', description);
    await page.fill('input[placeholder="0"]', '100');
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: /add expense entry/i }).click();

    const row = page.locator('tr', { hasText: description });
    await expect(row).toBeVisible();
    acceptNextDialog(page);
    await row.getByRole('button', { name: '×' }).click();
    await expect(page.getByText(description)).toHaveCount(0);
    await snap(page, 'expense-deleted');
  });

  test('does not submit an incomplete expense', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add expense entry/i })).toBeDisabled();
    await page.fill('input[placeholder="0"]', '100');
    await expect(page.getByRole('button', { name: /add expense entry/i })).toBeDisabled();
    await snap(page, 'expense-incomplete');
  });

  test('keeps the expense if delete is cancelled', async ({ page }) => {
    const description = `KeepExp ${uniqueSuffix()}`;
    await page.fill('input[placeholder="Details..."]', description);
    await page.fill('input[placeholder="0"]', '75');
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: /add expense entry/i }).click();

    const row = page.locator('tr', { hasText: description });
    await expect(row).toBeVisible();
    dismissNextDialog(page);
    await row.getByRole('button', { name: '×' }).click();
    await expect(page.getByText(description)).toBeVisible();
    await snap(page, 'expense-delete-cancelled');
  });
});
