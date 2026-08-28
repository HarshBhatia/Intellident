import { test, expect } from '@playwright/test';
import { createPatientViaApi, uniqueSuffix } from './helpers/auth';
import { snap } from './helpers/screenshot';

test.describe('Scheduler Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scheduler');
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible();
  });

  test('scheduler page loads with calendar chrome', async ({ page }) => {
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.getByText('Today').first()).toBeVisible();

    const now = new Date();
    const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await expect(page.getByText(monthName)).toBeVisible();

    const todayDay = now.getDate().toString();
    await expect(page.locator('button.bg-blue-600', { hasText: new RegExp(`^${todayDay}$`) })).toBeVisible();
    await expect(
      page.getByText('No appointments this date').or(page.getByTestId('appointment-item').first())
    ).toBeVisible();
    await snap(page, 'scheduler-loaded');
  });

  test('can open new appointment modal', async ({ page }) => {
    await page.getByRole('button', { name: 'New Appointment' }).click();
    await expect(page.getByRole('button', { name: 'Existing Patient' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Walk-in' })).toBeVisible();
    await snap(page, 'scheduler-new-appointment-modal');
  });

  test('can navigate between days via calendar', async ({ page }) => {
    const today = new Date();
    const todayDay = today.getDate();
    const targetDay = todayDay < 28 ? todayDay + 1 : todayDay - 1;

    await page.locator('button', { hasText: new RegExp(`^${targetDay}$`) }).click();
    await expect(page.locator('span.bg-blue-100', { hasText: 'Today' })).not.toBeVisible();
    await snap(page, 'scheduler-other-day');
  });

  test('mini calendar navigates months', async ({ page }) => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await expect(page.getByText(currentMonth)).toBeVisible();

    const nextMonthBtn = page.locator('button').filter({ has: page.locator('path[d="M9 5l7 7-7 7"]') });
    await nextMonthBtn.first().click();

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const nextMonthLabel = nextMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await expect(page.getByText(nextMonthLabel)).toBeVisible();
    await snap(page, 'scheduler-next-month');
  });

  test('can switch between list and timeline view', async ({ page }) => {
    await page.locator('button[title="Timeline view"]').click();
    await expect(page.getByText('20:30')).toBeVisible();
    await snap(page, 'scheduler-timeline');

    await page.locator('button[title="List view"]').click();
    await expect(page.getByText('20:30')).not.toBeVisible();
    await snap(page, 'scheduler-list');
  });

  test('month/year picker works', async ({ page }) => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await page.getByText(currentMonth).click();

    await expect(page.getByText('Jan')).toBeVisible();
    await expect(page.getByText('Dec')).toBeVisible();

    const currentYear = now.getFullYear().toString();
    await expect(page.getByText(currentYear).first()).toBeVisible();
    await page.getByText(currentYear).first().click();

    const startYear = (now.getFullYear() - 4).toString();
    const endYear = (now.getFullYear() + 7).toString();
    await expect(page.getByRole('button', { name: startYear })).toBeVisible();
    await expect(page.getByRole('button', { name: endYear })).toBeVisible();

    const prevYear = (now.getFullYear() - 1).toString();
    await page.locator('button', { hasText: new RegExp(`^${prevYear}$`) }).click();
    await expect(page.getByText(prevYear).first()).toBeVisible();
    await expect(page.getByText('Jan')).toBeVisible();

    await page.locator('button', { hasText: /^Jun$/ }).click();
    await expect(page.getByText(`June ${prevYear}`)).toBeVisible();
    await snap(page, 'scheduler-month-year-picker');
  });

  test('can create a walk-in appointment', async ({ page }) => {
    const name = `Guest ${uniqueSuffix()}`;
    await page.getByRole('button', { name: 'New Appointment' }).click();
    await expect(page.getByRole('button', { name: 'Existing Patient' })).toBeVisible();

    await page.getByRole('button', { name: 'Walk-in' }).click();
    await page.locator('input[placeholder="Name"]').fill(name);
    await page.locator('input[placeholder="Phone number"]').fill('9876543210');
    await page.locator('input[placeholder*="Consultation"]').fill('Cleaning');
    await page.locator('textarea[placeholder*="notes"]').fill('E2E test appointment');
    await page.getByRole('button', { name: 'Create' }).click();

    const item = page.getByTestId('appointment-item').filter({ hasText: name });
    await expect(item).toBeVisible();
    await expect(item).toContainText('Cleaning');
    await expect(item).toContainText('Scheduled');
    await snap(page, 'scheduler-walk-in-created');
  });

  test('can book an existing patient and confirm the appointment', async ({ page }) => {
    const patient = await createPatientViaApi(page, { name: `Appt ${uniqueSuffix()}` });
    await page.goto('/scheduler');
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible();

    await page.getByRole('button', { name: 'New Appointment' }).click();
    await expect(page.getByRole('button', { name: 'Existing Patient' })).toBeVisible();
    await page.locator('input[placeholder*="Search by name"]').fill(patient.name.slice(0, 12));
    await page.getByRole('button', { name: new RegExp(patient.name) }).click();
    await page.getByRole('button', { name: 'Create' }).click();

    const item = page.getByTestId('appointment-item').filter({ hasText: patient.name });
    await expect(item).toBeVisible();
    await item.click();
    await expect(page.getByRole('heading', { name: 'Appointment Details' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(item.getByText('Confirmed')).toBeVisible();
    await snap(page, 'scheduler-appointment-confirmed');
  });
});
