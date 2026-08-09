import { test, expect } from '@playwright/test';

test.describe('Odontogram', () => {
  test('persists a tooth marking after reload', async ({ page }) => {
    await page.goto('/patients');
    await page.click('button:has-text("Add patient")');
    await expect(page.locator('h2:has-text("New Patient")')).toBeVisible();

    const timestamp = Date.now();
    const name = `Odon Patient ${timestamp}`;
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="phone_number"]', '9876500000');
    await page.click('button:has-text("Create Patient")');
    await expect(page).toHaveURL(/\/patients\/PID-/);

    await page.click('button:has-text("Odontogram")');
    await expect(page.locator('text=Dental chart')).toBeVisible();

    const chart = { 16: { whole: 'crown' } };
    const path = page.url().split('?')[0];
    const pid = path.split('/patients/')[1];
    const res = await page.evaluate(async ({ pid, chart }) => {
      const r = await fetch(`/api/patients/${pid}/odontogram`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart }),
      });
      return { ok: r.ok, status: r.status, body: await r.json() };
    }, { pid, chart });
    expect(res.ok).toBeTruthy();

    await page.reload();
    await page.click('button:has-text("Odontogram")');
    await expect(page.locator('text=Dental chart')).toBeVisible();

    const loaded = await page.evaluate(async (pid) => {
      const r = await fetch(`/api/patients/${pid}/odontogram`);
      return r.json();
    }, pid);
    expect(loaded.chart['16'].whole).toBe('crown');
  });
});
