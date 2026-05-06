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
```

## Available Test Suites

- `simple-auth.spec.ts` - Verifies sign-in/sign-up pages load (no user required)
- `dashboard.spec.ts` - Dashboard statistics and navigation
- `patient.spec.ts` - Patient CRUD operations
- `visit.spec.ts` - Visit management and billing
- `expense.spec.ts` - Expense tracking
- `treatment.spec.ts` - Treatment management

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
2. Import and use the `signIn` helper from `./helpers/auth`
3. Use `test.beforeEach` to sign in before each test
4. Example:

```typescript
import { test, expect } from '@playwright/test';
import { signIn } from './helpers/auth';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('should do something', async ({ page }) => {
    // Your test logic here
    await page.click('button:has-text("Click Me")');
    await expect(page.locator('text=Success')).toBeVisible();
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
