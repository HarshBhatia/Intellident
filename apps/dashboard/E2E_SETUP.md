# E2E Testing Setup Guide

## Prerequisites

Before running E2E tests, you MUST create a test user manually.

### 1. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 2. Create Test User (REQUIRED - One-time setup)

1. Start the dev server:
   ```bash
   npm run dev -w dashboard
   ```

2. Open your browser and go to: http://localhost:3000/sign-up

3. Sign up with these exact credentials:
   - Email: `test+clerk_test@example.com`
   - Password: `TestPassword123!`
   - Verification code (Clerk test mode): `424242`

4. Create a test clinic when prompted (any name is fine)

5. You're done! The test user is now ready for E2E tests.

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e -w dashboard

# Run with browser visible (headed mode)
npm run test:e2e:headed -w dashboard

# Run specific test file
npm run test:e2e -w dashboard -- patient.spec.ts

# Run with Playwright UI (interactive)
npm run test:e2e:ui -w dashboard

# Debug mode (step through)
npm run test:e2e:debug -w dashboard

# Open the HTML report (named screenshots are on each test)
npx playwright show-report
# (run from apps/dashboard, or pass the report dir: npx playwright show-report apps/dashboard/playwright-report)
```

Tests attach labeled full-page screenshots via `snap(page, 'name')` in `test/e2e/helpers/screenshot.ts`, and Playwright also captures a screenshot at the end of every test (`screenshot: 'on'`).

## Available Test Suites

- `clinic.spec.ts` — Clinic picker + unauthenticated sign-in page
- `dashboard.spec.ts` — Home KPIs and navigation
- `patient.spec.ts` — Patient create, list, search, edit, delete
- `visit.spec.ts` — Visit create, collect payment, edit, delete
- `odontogram.spec.ts` — Chart marking + persistence
- `scheduler-check.spec.ts` — Calendar chrome, walk-in + existing-patient booking, confirm
- `expense.spec.ts` — Expense create, search, delete
- `earnings.spec.ts` — Totals and monthly trend
- `treatment.spec.ts` — Treatments in Settings
- `settings.spec.ts` — Clinic profile, members invite, expense categories

## Test Credentials

Stored in `apps/dashboard/.env.test`:
- Email: `test+clerk_test@example.com`
- Password: `TestPassword123!`
- Verification Code: `424242` (Clerk test mode)

## Troubleshooting

**Tests timeout or fail with "sign in" errors**
- Make sure you created the test user (see Prerequisites #2)
- Verify you used the exact email and password
- Check that dev server is running on port 3000

**404 on /sign-in or /sign-up**
- Routes are at `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]`
- Restart dev server if you just created these pages

**"User not found" or authentication errors**
- Delete the test user in Clerk dashboard and recreate it
- Make sure Clerk Test Mode is enabled
- Verify Clerk keys are set in `.env.local`

**Tests are flaky or intermittent**
- Clerk UI can be slow to load/enable fields
- Tests include appropriate waits, but network conditions vary
- Run tests with `--headed` flag to see what's happening

## Writing New Tests

1. Create new `.spec.ts` files in `apps/dashboard/test/e2e/`
2. Use helpers in `./helpers/auth` (`createPatientViaApi`, `createPatientViaUi`, `uniqueSuffix`, `acceptNextDialog`)
3. Give every created record a unique name so parallel workers do not collide
4. Example:

```typescript
import { test, expect } from '@playwright/test';
import { createPatientViaApi, uniqueSuffix } from './helpers/auth';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const patient = await createPatientViaApi(page, { name: `Case ${uniqueSuffix()}` });
    await page.goto(`/patients/${patient.patient_id}`);
    await expect(page.getByRole('heading', { name: patient.name })).toBeVisible();
  });
});
```

## CI/CD Integration

For automated testing in CI/CD pipelines:

1. Set environment variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `DATABASE_URL` (use a test database)

2. Create test user programmatically using Clerk API before running tests

3. Run tests in headless mode:
   ```bash
   npm run test:e2e -w dashboard
   ```
