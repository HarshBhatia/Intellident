import { test, expect } from '@playwright/test';
import { snap } from './helpers/screenshot';

test.describe('Dashboard', () => {
  test('loads KPI strip and navigates to patients', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Total patients', { exact: true })).toBeVisible();
    await expect(page.getByText('Revenue this month', { exact: true })).toBeVisible();
    await expect(page.getByText('Appointments today', { exact: true })).toBeVisible();
    await expect(page.getByText('Outstanding dues', { exact: true })).toBeVisible();
    await snap(page, 'dashboard-kpis');

    await page.getByRole('button', { name: 'Patients', exact: true }).click();
    await expect(page).toHaveURL(/\/patients/);
    await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible();
    await snap(page, 'dashboard-navigated-to-patients');
  });

  test('schedule shortcut opens the scheduler', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(page).toHaveURL(/\/scheduler/);
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible();
    await snap(page, 'dashboard-schedule-shortcut');
  });
});
