import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  timeout: process.env.CI ? 45000 : 25000,
  expect: {
    timeout: process.env.CI ? 10000 : 7000,
  },
  globalSetup: './test/e2e/global-setup.ts',
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'on',
    actionTimeout: 5000, // 5 seconds for actions
    navigationTimeout: 5000, // 5 seconds for navigation
    storageState: 'playwright/.clerk/user.json', // Clerk auth state
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      ...process.env,
      E2E_TEST_SECRET: process.env.E2E_TEST_SECRET || 'e2e-secret-key',
    },
  },
});
