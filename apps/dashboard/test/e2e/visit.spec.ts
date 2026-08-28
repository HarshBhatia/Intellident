import { test, expect } from '@playwright/test';
import { acceptNextDialog, createPatientViaApi, uniqueSuffix } from './helpers/auth';
import { snap } from './helpers/screenshot';

async function openNewVisit(page: import('@playwright/test').Page, patientId: string) {
  await page.goto(`/patients/${patientId}`);
  await page.getByRole('button', { name: /new visit/i }).click();
  await expect(page.getByRole('heading', { name: 'New Visit' })).toBeVisible();
}

test.describe('Visit Management', () => {
  test('should create a visit with clinical findings', async ({ page }) => {
    const findings = `Pain on chewing ${uniqueSuffix()}`;
    const patient = await createPatientViaApi(page);
    await openNewVisit(page, patient.patient_id);

    await page.fill('textarea[name="clinical_findings"]', findings);
    await page.fill('textarea[name="procedure_notes"]', 'Advised scaling');
    await page.getByTestId('save-visit').click();

    const card = page.getByTestId('visit-card').first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByText(findings)).toBeVisible();
    await expect(page.getByText('Clinical note')).toBeVisible();
    await snap(page, 'visit-created');
  });

  test('should record cost and collect payment', async ({ page }) => {
    const findings = `Unpaid filling ${uniqueSuffix()}`;
    const patient = await createPatientViaApi(page);
    await openNewVisit(page, patient.patient_id);

    await page.fill('textarea[name="clinical_findings"]', findings);
    await page.locator('input[name="paid"]').fill('0');
    await page.locator('input[name="cost"]').fill('1500');
    await page.locator('input[name="paid"]').fill('0');
    await page.getByTestId('save-visit').click();
    await expect(page.getByTestId('visit-card').first()).toBeVisible();
    await page.reload();

    const card = page.getByTestId('visit-card').filter({ hasText: findings });
    await expect(card).toBeVisible();
    await card.click();
    await expect(card.getByText('has due')).toBeVisible();
    await card.click();
    await expect(card.getByTestId('collect-payment')).toBeVisible();
    await snap(page, 'visit-unpaid');

    acceptNextDialog(page);
    await card.getByTestId('collect-payment').click();
    await expect(card.getByText('settled')).toBeVisible();
    await snap(page, 'visit-collected');
  });

  test('should edit and delete a visit', async ({ page }) => {
    const findings = `Edit then delete ${uniqueSuffix()}`;
    const updated = `${findings} — updated`;
    const patient = await createPatientViaApi(page);
    await openNewVisit(page, patient.patient_id);

    await page.fill('textarea[name="clinical_findings"]', findings);
    await page.getByTestId('save-visit').click();
    await expect(page.getByTestId('visit-card').first()).toBeVisible();
    await page.reload();

    const card = page.getByTestId('visit-card').filter({ hasText: findings });
    await expect(card).toBeVisible();
    await card.click();
    await card.getByTestId('edit-visit').click();
    await expect(page.getByRole('heading', { name: 'Edit Visit' })).toBeVisible();
    await page.fill('textarea[name="clinical_findings"]', updated);
    await page.getByTestId('save-visit').click();
    await expect(page.getByText(updated)).toBeVisible();
    await snap(page, 'visit-edited');

    const updatedCard = page.getByTestId('visit-card').filter({ hasText: updated });
    await updatedCard.click();
    acceptNextDialog(page);
    await updatedCard.getByTestId('delete-visit').click();
    await expect(page.getByText(updated)).toHaveCount(0);
    await snap(page, 'visit-deleted');
  });
});
