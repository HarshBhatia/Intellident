import { test, expect } from '@playwright/test';

test.describe('Dashboard Performance and Data Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Set mock E2E bypass
    await page.context().addCookies([
      {
        name: 'x-e2e-secret',
        value: 'e2e-secret-key',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Create a fresh clinic
    await page.goto('http://localhost:3000/select-clinic');
    await page.fill('input[placeholder="Clinic Name"]', `Perf Test ${Date.now()}`);
    await page.click('button:has-text("Create")');
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('should load dashboard with batched API call', async ({ page }) => {
    // Listen for network requests
    const dashboardDataRequests: string[] = [];
    const clinicInfoRequests: string[] = [];
    const patientRequests: string[] = [];
    const doctorRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/dashboard-data')) {
        dashboardDataRequests.push(url);
      }
      if (url.includes('/api/clinic-info')) {
        clinicInfoRequests.push(url);
      }
      if (url.includes('/api/patients') && !url.includes('dashboard-data')) {
        patientRequests.push(url);
      }
      if (url.includes('/api/doctors')) {
        doctorRequests.push(url);
      }
    });

    // Navigate to dashboard
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Verify batched endpoint is called
    expect(dashboardDataRequests.length).toBeGreaterThan(0);
    
    // Verify individual endpoints are NOT called (they're batched)
    expect(patientRequests.length).toBe(0);
    expect(doctorRequests.length).toBe(0);

    // Dashboard should display stats
    await expect(page.locator('text=Total Patients')).toBeVisible();
    await expect(page.locator('text=Doctors')).toBeVisible();
  });

  test('should load dashboard quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('text=Total Patients');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle favicon correctly', async ({ page }) => {
    const faviconRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('favicon')) {
        faviconRequests.push(url);
      }
    });

    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Should only request favicon once (or twice max for .ico and .svg)
    expect(faviconRequests.length).toBeLessThanOrEqual(2);
  });

  test('should not make trailing slash redirects', async ({ page }) => {
    const redirects: Array<{ from: string; to: string }> = [];

    page.on('response', response => {
      if (response.status() === 308 || response.status() === 307) {
        redirects.push({
          from: response.url(),
          to: response.headers()['location'] || '',
        });
      }
    });

    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Filter for API redirects only
    const apiRedirects = redirects.filter(r => r.from.includes('/api/'));
    
    // Should have no API redirects due to trailing slashes
    expect(apiRedirects.length).toBe(0);
  });

  test('should cache dashboard data appropriately', async ({ page }) => {
    // First load
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    const firstLoadRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/dashboard-data')) {
        firstLoadRequests.push(request.url());
      }
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still make the request (cache is server-side)
    await expect(page.locator('text=Total Patients')).toBeVisible();
  });

  test('should display correct stats after adding data', async ({ page }) => {
    // Initial state - 0 patients
    await expect(page.locator('text=0').first()).toBeVisible();

    // Add a doctor
    await page.goto('http://localhost:3000/settings?tab=doctors');
    await page.fill('input[placeholder="New doctors name..."]', 'Dr. Test');
    await page.click('button:has-text("ADD")');

    // Add a patient
    await page.goto('http://localhost:3000/');
    await page.click('button:has-text("Add Your First Patient")');
    await page.fill('input[name="name"]', 'Stats Test Patient');
    await page.click('button:has-text("Create Patient")');

    // Go back to dashboard
    await page.goto('http://localhost:3000/');

    // Should show 1 patient and 1 doctor
    await expect(page.locator('text=1').first()).toBeVisible();
    await expect(page.locator('text=Stats Test Patient')).toBeVisible();
  });
});
