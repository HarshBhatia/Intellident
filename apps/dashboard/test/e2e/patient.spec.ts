import { test, expect } from '@playwright/test';
import { acceptNextDialog, createPatientViaApi, createPatientViaUi, dismissNextDialog, uniqueSuffix } from './helpers/auth';
import { snap } from './helpers/screenshot';

test.describe('Patient Management', () => {
  test('should create a new patient', async ({ page }) => {
    const { name } = await createPatientViaUi(page);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await snap(page, 'patient-created');
  });

  test('should view patient list', async ({ page }) => {
    await page.goto('/patients');
    await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Patient' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Contact' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last visit' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Next visit' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Outstanding' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All patients' })).toBeVisible();
    await snap(page, 'patient-list');
  });

  test('should search for a patient', async ({ page }) => {
    const name = `SearchMe ${uniqueSuffix()}`;
    const patient = await createPatientViaApi(page, { name });
    await page.goto('/patients');
    await page.getByTestId('patient-search').fill(name);
    const row = page.getByTestId(`patient-row-${patient.patient_id}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(name);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await snap(page, 'patient-search');
  });

  test('should edit patient details', async ({ page }) => {
    const name = `EditMe ${uniqueSuffix()}`;
    const patient = await createPatientViaApi(page, { name, age: 28 });
    await page.goto(`/patients/${patient.patient_id}`);
    await expect(page.getByRole('heading', { name })).toBeVisible();

    await page.getByRole('button', { name: /edit profile/i }).click();
    await expect(page.getByRole('heading', { name: 'Edit Patient' })).toBeVisible();
    await page.locator('input[name="age"]').fill('41');
    await page.getByTestId('save-patient').click();

    await expect(page.getByText('41 yrs')).toBeVisible();
    await snap(page, 'patient-edited');
  });

  test('should delete a patient', async ({ page }) => {
    const name = `DeleteMe ${uniqueSuffix()}`;
    const patient = await createPatientViaApi(page, { name });
    await page.goto(`/patients/${patient.patient_id}`);
    await expect(page.getByRole('heading', { name })).toBeVisible();

    acceptNextDialog(page);
    await page.getByRole('button', { name: /^delete$/i }).click();
    await page.waitForURL(/\/patients\/?$/);

    await page.getByTestId('patient-search').fill(name);
    await expect(page.getByTestId(`patient-row-${patient.patient_id}`)).toHaveCount(0);
    await snap(page, 'patient-deleted');
  });

  test('blocks creating a patient without a name', async ({ page }) => {
    await page.goto('/patients');
    await page.getByRole('button', { name: /add patient/i }).click();
    await expect(page.locator('h2:has-text("New Patient")')).toBeVisible();
    await expect(page.getByRole('button', { name: /create patient/i })).toBeDisabled();
    await snap(page, 'patient-create-name-required');
  });

  test('shows empty state when search matches nobody', async ({ page }) => {
    await page.goto('/patients');
    await page.getByTestId('patient-search').fill(`zzz-no-match-${uniqueSuffix()}`);
    await expect(page.getByText('No patients match')).toBeVisible();
    await snap(page, 'patient-search-empty');
  });

  test('toasts when the patient id does not exist', async ({ page }) => {
    await page.goto('/patients/PID-999999');
    await expect(page.getByText('Error loading patient')).toBeVisible();
    await snap(page, 'patient-not-found');
  });

  test('keeps the patient if delete is cancelled', async ({ page }) => {
    const name = `KeepMe ${uniqueSuffix()}`;
    const patient = await createPatientViaApi(page, { name });
    await page.goto(`/patients/${patient.patient_id}`);
    await expect(page.getByRole('heading', { name })).toBeVisible();

    dismissNextDialog(page);
    await page.getByRole('button', { name: /^delete$/i }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.patient_id}`));
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await snap(page, 'patient-delete-cancelled');
  });
});
