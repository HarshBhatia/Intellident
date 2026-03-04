# E2E Tests

Comprehensive end-to-end tests for the IntelliDent Dashboard application using Playwright.

## Test Coverage

### Complete Flow Tests (`complete-flow.spec.ts`)
- Complete user workflow from clinic setup to patient management
- Adding doctors and updating clinic information
- Creating patients and recording visits
- Patient search functionality
- Form validation and cancellation flows
- Multiple visits per patient

### Dashboard Performance Tests (`dashboard-performance.spec.ts`)
- Batched API endpoint verification
- Dashboard load time performance
- Favicon optimization checks
- Trailing slash redirect prevention
- Server-side caching validation
- Stats accuracy after data changes

### Financial Tests (`financial.spec.ts`)
- Earnings tracking from patient visits
- Partial payment handling
- Expense management
- Expense categories
- Net profit calculations
- Date range filtering

### Patient Tests (`patients.spec.ts`)
- Dashboard loading
- Patient navigation
- Adding new patients

### Visit Tests (`visits.spec.ts`)
- Creating visits with billing
- Doctor assignment
- Visit history

### Multi-tenancy Tests (`multi-tenancy.spec.ts`)
- Clinic isolation
- Data security

## Running Tests

### Prerequisites

1. Start the development server:
   ```bash
   npm run dev -w dashboard
   ```

2. Ensure the database is initialized:
   ```bash
   curl "http://localhost:3000/api/init?secret=e2e-secret-key"
   ```

### Run All Tests

```bash
# From root directory
npm run test:e2e -w dashboard

# Or from dashboard directory
cd apps/dashboard
npm run test:e2e
```

### Run with UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui -w dashboard
```

### Run in Headed Mode (See Browser)

```bash
npm run test:e2e:headed -w dashboard
```

### Debug Mode

```bash
npm run test:e2e:debug -w dashboard
```

### Run Specific Test File

```bash
npm run test:e2e -w dashboard -- complete-flow.spec.ts
```

### Run Specific Test

```bash
npm run test:e2e -w dashboard -- -g "should add a new patient"
```

### View Test Report

```bash
npm run test:e2e:report -w dashboard
```

### Using the Test Runner Script

The `run-e2e-tests.sh` script automatically checks if the dev server is running and initializes the database:

```bash
cd apps/dashboard
./run-e2e-tests.sh
```

## Pre-Push Hook

E2E tests run automatically before each push if the dev server is running on port 3000.

To skip the pre-push hook:
```bash
git push --no-verify
```

## Test Structure

Each test suite:
1. Creates a fresh clinic with a unique name
2. Sets E2E bypass cookies for authentication
3. Runs isolated tests that don't interfere with each other
4. Cleans up automatically (database isolation per clinic)

## E2E Authentication Bypass

Tests use the `E2E_TEST_SECRET` environment variable to bypass Clerk authentication:
- Secret: `e2e-secret-key`
- Mock user: `e2e@intellident.test`
- Set via cookie: `x-e2e-secret`

## Best Practices

1. **Isolation**: Each test creates its own clinic to avoid data conflicts
2. **Unique Names**: Use timestamps in clinic names for uniqueness
3. **Explicit Waits**: Use `waitForSelector` or `expect().toBeVisible()` instead of arbitrary timeouts
4. **Descriptive Tests**: Test names should clearly describe what they're testing
5. **Setup in beforeEach**: Common setup goes in `beforeEach` hooks
6. **Clean Assertions**: Use Playwright's built-in assertions for better error messages

## Debugging Failed Tests

1. **View the HTML Report**:
   ```bash
   npm run test:e2e:report -w dashboard
   ```

2. **Run in UI Mode**:
   ```bash
   npm run test:e2e:ui -w dashboard
   ```

3. **Run in Debug Mode**:
   ```bash
   npm run test:e2e:debug -w dashboard
   ```

4. **Check Screenshots**: Failed tests automatically capture screenshots in `test-results/`

5. **Check Traces**: Traces are captured on first retry in `test-results/`

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries for flaky tests
- Single worker for consistency
- HTML reporter for results

## Adding New Tests

1. Create a new `.spec.ts` file in `test/e2e/`
2. Follow the existing pattern:
   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('Feature Name', () => {
     test.beforeEach(async ({ page }) => {
       // Setup E2E bypass and create clinic
     });

     test('should do something', async ({ page }) => {
       // Test implementation
     });
   });
   ```

3. Run your new test:
   ```bash
   npm run test:e2e -w dashboard -- your-test.spec.ts
   ```

## Troubleshooting

### Dev Server Not Running
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**Solution**: Start the dev server with `npm run dev -w dashboard`

### Database Not Initialized
```
Error: relation "patients" does not exist
```
**Solution**: Initialize the database:
```bash
curl "http://localhost:3000/api/init?secret=e2e-secret-key"
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Kill the process using port 3000:
```bash
lsof -ti:3000 | xargs kill -9
```

### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check if dev server is responding
- Verify database is accessible

## Performance Benchmarks

Expected test execution times:
- Complete flow: ~30-45 seconds
- Dashboard performance: ~15-20 seconds
- Financial tests: ~25-35 seconds
- Individual patient/visit tests: ~10-15 seconds

Total suite: ~2-3 minutes
