import { test, expect } from '@playwright/test';
import { uniqueSuffix } from './helpers/auth';
import { snap } from './helpers/screenshot';

test.describe('Settings', () => {
  test('loads clinic profile and saves a tagline', async ({ page }) => {
    await page.goto('/settings?tab=profile');
    await expect(page.getByText('Clinic Profile').first()).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Bandra Dental Studio')).toHaveValue(/.+/);

    const tagline = `E2E tagline ${uniqueSuffix()}`;
    const taglineInput = page.getByPlaceholder('One-line description');
    await taglineInput.fill(tagline);
    const save = page.getByRole('button', { name: /save changes/i });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText('Profile updated')).toBeVisible();

    await page.reload();
    await expect(page.getByPlaceholder('One-line description')).toHaveValue(tagline);
    await snap(page, 'settings-profile-saved');
  });

  test('shows clinic members and can invite a doctor', async ({ page }) => {
    await page.goto('/settings?tab=members');
    await expect(page.getByRole('heading', { name: 'Clinic Members' })).toBeVisible();

    await page.getByRole('button', { name: /invite member/i }).click();
    const email = `e2e.doctor.${uniqueSuffix()}@example.com`;
    await page.getByPlaceholder('Full name').fill('E2E Doctor');
    await page.getByPlaceholder('colleague@example.com').fill(email);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText(email)).toBeVisible();
    await snap(page, 'settings-member-invited');
  });

  test('can add an expense category', async ({ page }) => {
    await page.goto('/settings?tab=expenses');
    await expect(page.getByRole('heading', { name: 'Expense Categories' })).toBeVisible();

    const name = `Cat ${uniqueSuffix()}`;
    await page.fill('input[placeholder*="New expense"]', name);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText(name)).toBeVisible();
    await snap(page, 'settings-expense-category');
  });

  test('invite form requires an email', async ({ page }) => {
    await page.goto('/settings?tab=members');
    await page.getByRole('button', { name: /invite member/i }).click();
    await page.getByRole('button', { name: 'Add' }).click();
    const valid = await page.getByPlaceholder('colleague@example.com').evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid).toBe(false);
    await snap(page, 'settings-invite-email-required');
  });
});
