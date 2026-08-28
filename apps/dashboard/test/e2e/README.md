# Dashboard E2E tests

Playwright specs for the clinic dashboard. Auth is bypassed via `x-e2e-secret` cookies planted in `global-setup.ts` (see `E2E_SETUP.md` at the dashboard root).

```bash
npm run test:e2e -w dashboard
npm run test:e2e -w dashboard -- patient.spec.ts
npx playwright show-report --config apps/dashboard/playwright.config.ts
# or from apps/dashboard: npx playwright show-report
```

Each test attaches named full-page screenshots (`snap()`) plus an automatic end-of-test shot. Open the HTML report and expand a test to review them.

Use unique fixture names (`uniqueSuffix()` in `helpers/auth.ts`) so parallel workers do not collide on the shared local PGlite database.
