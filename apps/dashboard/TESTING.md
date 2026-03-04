# Testing Guide

Quick reference for running tests in the IntelliDent Dashboard.

## Quick Start

### 1. Start Dev Server
```bash
npm run dev -w dashboard
```

### 2. Run E2E Tests
```bash
# Automated (checks server + initializes DB)
cd apps/dashboard && ./run-e2e-tests.sh

# Or manually
npm run test:e2e -w dashboard
```

## Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:ui` | Run with Playwright UI (recommended) |
| `npm run test:e2e:headed` | Run with visible browser |
| `npm run test:e2e:debug` | Run in debug mode |
| `npm run test:e2e:report` | View HTML test report |
| `npm run test` | Run unit tests (Jest) |

## Pre-Push Hook

Tests run automatically before push if dev server is running.

**Skip hook:**
```bash
git push --no-verify
```

## Test Files

- `complete-flow.spec.ts` - Full user workflows
- `dashboard-performance.spec.ts` - Performance & optimization checks
- `financial.spec.ts` - Earnings & expenses
- `patients.spec.ts` - Patient management
- `visits.spec.ts` - Visit recording
- `multi-tenancy.spec.ts` - Data isolation

## Common Issues

### Dev Server Not Running
```bash
npm run dev -w dashboard
```

### Database Not Initialized
```bash
curl "http://localhost:3000/api/init?secret=e2e-secret-key"
```

### Port 3000 In Use
```bash
lsof -ti:3000 | xargs kill -9
```

## Writing Tests

```typescript
test('should do something', async ({ page }) => {
  // Navigate
  await page.goto('http://localhost:3000/');
  
  // Interact
  await page.click('button:has-text("Click Me")');
  await page.fill('input[name="field"]', 'value');
  
  // Assert
  await expect(page.locator('text=Success')).toBeVisible();
});
```

## Best Practices

1. ✅ Create unique clinic per test (use timestamp)
2. ✅ Use explicit waits (`toBeVisible()`)
3. ✅ Descriptive test names
4. ✅ Clean up in `beforeEach`
5. ❌ Don't use arbitrary `sleep()` calls
6. ❌ Don't share data between tests

## More Info

See [test/e2e/README.md](./test/e2e/README.md) for detailed documentation.
