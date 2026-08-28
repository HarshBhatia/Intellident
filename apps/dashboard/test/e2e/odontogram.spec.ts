import { test, expect } from '@playwright/test';
import { createPatientViaApi } from './helpers/auth';
import { snap } from './helpers/screenshot';

test.describe('Odontogram', () => {
  test('marks a tooth from the chart and persists after reload', async ({ page }) => {
    const patient = await createPatientViaApi(page);
    await page.goto(`/patients/${patient.patient_id}?tab=odontogram`);
    await expect(page.getByText(/dental chart/i)).toBeVisible();

    await page.locator('[data-tooth="16"] svg').click({ position: { x: 18, y: 28 } });
    await expect(page.getByRole('button', { name: 'Crown' })).toBeVisible();
    await page.getByRole('button', { name: 'Crown' }).click();
    await expect(page.getByText('Treated').locator('..')).toContainText('1');
    await expect(page.getByText(/· Saved/)).toBeVisible();
    await snap(page, 'odontogram-marked');

    await expect.poll(async () => {
      const loaded = await page.evaluate(async (pid) => {
        const r = await fetch(`/api/patients/${pid}/odontogram`);
        return r.json();
      }, patient.patient_id);
      return loaded.chart?.['16']?.whole;
    }).toBe('crown');

    await page.reload();
    await page.getByRole('button', { name: 'Odontogram' }).click();
    await expect(page.getByText(/dental chart/i)).toBeVisible();
    await expect(page.getByText('Treated').locator('..')).toContainText('1');
    await snap(page, 'odontogram-after-reload');
  });
});
