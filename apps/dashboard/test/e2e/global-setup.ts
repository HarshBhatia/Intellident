import { chromium, FullConfig } from '@playwright/test';
import { mkdirSync } from 'fs';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  // Ensure storage directory exists
  mkdirSync('playwright/.clerk', { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Set E2E bypass cookies — these skip Clerk auth in middleware and API layer
  await context.addCookies([
    {
      name: 'x-e2e-secret',
      value: 'e2e-secret-key',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  // Navigate to the app first so page.evaluate can use relative fetch
  await page.goto(`${baseURL}/select-clinic`);
  await page.waitForTimeout(1000);

  // Verify E2E bypass works by hitting an API route
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/clinic', {
      headers: { 'x-e2e-secret': 'e2e-secret-key' },
    });
    return { ok: r.ok, status: r.status };
  });

  console.log('E2E bypass check:', res);

  if (!res.ok) {
    throw new Error(`E2E bypass not working — API returned ${res.status}`);
  }

  // Ensure a test clinic exists for the E2E mock user (e2e@intellident.test)
  const clinicRes = await page.evaluate(async () => {
    // First check if a clinic already exists
    const listRes = await fetch('/api/clinic', {
      headers: { 'x-e2e-secret': 'e2e-secret-key' },
    });
    const clinics = await listRes.json();

    if (clinics.length > 0) {
      return { clinicId: clinics[0].id, name: clinics[0].name, created: false };
    }

    // Create a test clinic
    const createRes = await fetch('/api/clinic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-secret': 'e2e-secret-key',
      },
      body: JSON.stringify({ name: 'E2E Test Clinic' }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return { error: err };
    }

    const clinic = await createRes.json();
    return { clinicId: clinic.id, name: clinic.name, created: true };
  });

  console.log('Clinic setup:', clinicRes);

  if (clinicRes.error) {
    console.warn('Could not create clinic:', clinicRes.error);
    console.log('Tests will handle clinic selection in beforeEach');
  } else if (clinicRes.clinicId) {
    // Set clinic_id cookie
    await context.addCookies([
      {
        name: 'clinic_id',
        value: String(clinicRes.clinicId),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
    console.log(`✅ Using clinic: ${clinicRes.name} (ID: ${clinicRes.clinicId})`);
  }

  // Verify we can reach the dashboard
  await page.goto(`${baseURL}/`);
  await page.waitForTimeout(2000);
  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);

  console.log('✅ Global setup complete');

  // Save state (E2E cookies + clinic_id)
  await context.storageState({ path: 'playwright/.clerk/user.json' });

  await browser.close();
}

export default globalSetup;
