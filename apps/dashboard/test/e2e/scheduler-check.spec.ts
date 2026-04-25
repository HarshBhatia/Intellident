import { test, expect } from '@playwright/test';

test.describe('Scheduler Page', () => {
  test.beforeEach(async ({ page, context }) => {
    // Navigate first so fetch works with relative URLs
    await page.goto('/select-clinic');

    // Fetch the clinic list and set clinic_id cookie
    const clinicId = await page.evaluate(async () => {
      const res = await fetch('/api/clinic');
      const clinics = await res.json();
      return clinics.length > 0 ? clinics[0].id : null;
    });

    if (clinicId) {
      await context.addCookies([{
        name: 'clinic_id',
        value: String(clinicId),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      }]);
    }
  });

  test('scheduler page loads with list view', async ({ page }) => {
    await page.goto('/scheduler');

    // Wait for the scheduler content to appear
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible({ timeout: 15000 });

    // Take a full-page screenshot
    await page.screenshot({ path: 'test-results/scheduler-page.png', fullPage: true });

    // List view is default — empty state or appointment list should show
    await expect(page.getByText('No appointments this date')).toBeVisible();

    // Check doctor filter select exists
    await expect(page.locator('select').first()).toBeVisible();

    // Check today badge is visible
    await expect(page.getByText('Today').first()).toBeVisible();

    // Check mini calendar is visible (current month)
    const now = new Date();
    const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await expect(page.getByText(monthName)).toBeVisible();

    // Check today's date is highlighted
    const todayDay = now.getDate().toString();
    const today = page.locator('button.bg-blue-600', { hasText: new RegExp(`^${todayDay}$`) });
    await expect(today).toBeVisible();
  });

  test('can open new appointment modal', async ({ page }) => {
    await page.goto('/scheduler');
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible({ timeout: 15000 });

    // Click "New Appointment" button
    await page.getByRole('button', { name: 'New Appointment' }).click();

    // Modal should appear
    await expect(page.getByText('Existing Patient')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Walk-in')).toBeVisible();

    // Take screenshot of modal
    await page.screenshot({ path: 'test-results/scheduler-modal.png', fullPage: true });
  });

  test('can navigate between days via calendar', async ({ page }) => {
    await page.goto('/scheduler');
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible({ timeout: 15000 });

    // Get today's day number and pick a different date to click
    const today = new Date();
    const todayDay = today.getDate();
    const targetDay = todayDay < 28 ? todayDay + 1 : todayDay - 1;

    // Click a different date in the mini calendar
    await page.locator('button', { hasText: new RegExp(`^${targetDay}$`) }).click();

    // The "Today" badge next to the date should disappear (it only shows for today's date)
    // The badge is a span with specific styling inside the date display
    await expect(page.locator('span.bg-blue-100', { hasText: 'Today' })).not.toBeVisible({ timeout: 5000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/scheduler-next-day.png', fullPage: true });
  });

  test('mini calendar navigates months', async ({ page }) => {
    await page.goto('/scheduler');
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible({ timeout: 15000 });

    // Calendar should show current month
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await expect(page.getByText(currentMonth)).toBeVisible();

    // Click the next month arrow (the > chevron in the calendar header)
    const nextMonthBtn = page.locator('button').filter({ has: page.locator('path[d="M9 5l7 7-7 7"]') });
    await nextMonthBtn.first().click();

    // Should now show next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const nextMonthLabel = nextMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await expect(page.getByText(nextMonthLabel)).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/scheduler-next-month.png', fullPage: true });
  });

  test('can switch between list and timeline view', async ({ page }) => {
    await page.goto('/scheduler');
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible({ timeout: 15000 });

    // List view is default — empty state should show
    await expect(page.getByText('No appointments this date')).toBeVisible();

    // Take screenshot of list empty state
    await page.screenshot({ path: 'test-results/scheduler-list-empty.png', fullPage: true });

    // Switch to timeline view
    await page.locator('button[title="Timeline view"]').click();

    // Timeline slots should appear
    await expect(page.getByText('09:00')).toBeVisible({ timeout: 3000 });

    // Switch back to list
    await page.locator('button[title="List view"]').click();
    await expect(page.getByText('09:00')).not.toBeVisible({ timeout: 3000 });
  });

  test('month/year picker works', async ({ page }) => {
    await page.goto('/scheduler');
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible({ timeout: 15000 });

    // Click on the month label to open month picker
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    await page.getByText(currentMonth).click();

    // Month picker should show month abbreviations
    await expect(page.getByText('Jan')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Dec')).toBeVisible();

    // Year should be clickable
    const currentYear = now.getFullYear().toString();
    await expect(page.getByText(currentYear).first()).toBeVisible();

    // Click on year to open year picker
    await page.getByText(currentYear).first().click();

    // Year picker should show a range of years
    const startYear = (now.getFullYear() - 4).toString();
    const endYear = (now.getFullYear() + 7).toString();
    await expect(page.getByRole('button', { name: startYear })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: endYear })).toBeVisible();

    // Select previous year
    const prevYear = (now.getFullYear() - 1).toString();
    await page.locator('button', { hasText: new RegExp(`^${prevYear}$`) }).click();

    // Should go back to month picker for previous year
    await expect(page.getByText(prevYear).first()).toBeVisible();
    await expect(page.getByText('Jan')).toBeVisible();

    // Select June
    await page.locator('button', { hasText: /^Jun$/ }).click();

    // Should show June of previous year day grid
    await expect(page.getByText(`June ${prevYear}`)).toBeVisible({ timeout: 3000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/scheduler-month-year-picker.png', fullPage: true });
  });

  test('can create a walk-in appointment', async ({ page }) => {
    await page.goto('/scheduler');
    await expect(page.getByRole('button', { name: 'New Appointment' })).toBeVisible({ timeout: 15000 });

    // Open new appointment modal
    await page.getByRole('button', { name: 'New Appointment' }).click();
    await expect(page.getByText('Existing Patient')).toBeVisible({ timeout: 5000 });

    // Switch to walk-in mode
    await page.getByText('Walk-in').click();

    // Fill in walk-in details
    await page.locator('input[placeholder="Name"]').fill('Test Walk-in Patient');
    await page.locator('input[placeholder="Phone number"]').fill('9876543210');

    // Set visit type
    await page.locator('input[placeholder*="Consultation"]').clear();
    await page.locator('input[placeholder*="Consultation"]').fill('Cleaning');

    // Add a note
    await page.locator('textarea[placeholder*="notes"]').fill('E2E test appointment');

    // Take screenshot of filled form
    await page.screenshot({ path: 'test-results/scheduler-create-form.png', fullPage: true });

    // Click Create
    await page.getByRole('button', { name: 'Create' }).click();

    // Modal should close and appointment should appear in list
    await expect(page.getByText('Test Walk-in Patient')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Cleaning')).toBeVisible();
    await expect(page.getByText('Scheduled')).toBeVisible();

    // Take screenshot showing the new appointment
    await page.screenshot({ path: 'test-results/scheduler-appointment-created.png', fullPage: true });
  });
});
