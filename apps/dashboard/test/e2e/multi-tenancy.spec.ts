import { test, expect } from '@playwright/test';

test.describe('Multi-tenancy E2E', () => {
  const E2E_SECRET = 'e2e-secret-key';

  test('should isolate data between different users and clinics', async ({ browser }) => {
    test.setTimeout(60000);
    // USER A FLOW
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    // Log in as User A
    await contextA.addCookies([
      { name: 'x-e2e-secret', value: E2E_SECRET, domain: 'localhost', path: '/' },
      { name: 'x-e2e-user-id', value: 'user_a', domain: 'localhost', path: '/' },
      { name: 'x-e2e-user-email', value: 'user_a@test.com', domain: 'localhost', path: '/' },
    ]);

    await pageA.goto('http://localhost:3000/select-clinic');
    
    // Create Clinic A
    const clinicAName = `Clinic A ${Date.now()}`;
    await pageA.fill('input[placeholder="Clinic Name"]', clinicAName);
    await pageA.click('button:has-text("Create")');
    
    // Should be on dashboard of Clinic A
    await expect(pageA).toHaveURL('http://localhost:3000/');
    await expect(pageA.locator('text=No patients found.')).toBeVisible();

    // Create Patient A using the new CTA
    await pageA.click('button:has-text("Add Your First Patient")');
    await pageA.fill('input[name="name"]', 'Patient Alpha');
    await pageA.click('button[type="submit"]');
    
    // Verify Patient A exists for User A
    await expect(pageA.locator('h1')).toContainText('Patient Alpha');

    // USER B FLOW
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    
    // Log in as User B
    await contextB.addCookies([
      { name: 'x-e2e-secret', value: E2E_SECRET, domain: 'localhost', path: '/' },
      { name: 'x-e2e-user-id', value: 'user_b', domain: 'localhost', path: '/' },
      { name: 'x-e2e-user-email', value: 'user_b@test.com', domain: 'localhost', path: '/' },
    ]);

    await pageB.goto('http://localhost:3000/select-clinic');
    
    // Create Clinic B
    const clinicBName = `Clinic B ${Date.now()}`;
    await pageB.fill('input[placeholder="Clinic Name"]', clinicBName);
    await pageB.click('button:has-text("Create")');
    
    // Should be on dashboard of Clinic B
    await expect(pageB).toHaveURL('http://localhost:3000/');
    
    // CRITICAL CHECK: User B should NOT see Patient Alpha
    await expect(pageB.locator('text=Patient Alpha')).not.toBeVisible();
    await expect(pageB.locator('text=No patients found.')).toBeVisible();

    // Create Patient B
    await pageB.click('button:has-text("Add Patient")');
    await pageB.fill('input[name="name"]', 'Patient Beta');
    await pageB.click('button[type="submit"]');
    
    // Verify Patient B exists for User B
    await expect(pageB.locator('h1')).toContainText('Patient Beta');

    // RE-VERIFY USER A
    await pageA.goto('http://localhost:3000/');
    await expect(pageA.locator('text=Patient Alpha')).toBeVisible();
    await expect(pageA.locator('text=Patient Beta')).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
