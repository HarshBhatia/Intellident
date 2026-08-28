import { test, expect } from '@playwright/test';
import {
  apiJson,
  asRole,
  createPatientViaApi,
  createVisitViaApi,
  uniqueSuffix,
} from './helpers/auth';
import { snap } from './helpers/screenshot';

test.describe('Receptionist permissions', () => {
  test.beforeEach(async ({ page }) => {
    await asRole(page, 'RECEPTIONIST');
  });

  test('hides billing nav and patient mutate actions', async ({ page }) => {
    const patient = await createPatientViaApi(page, { name: `Recep ${uniqueSuffix()}` });
    await page.goto(`/patients/${patient.patient_id}`);
    await expect(page.getByRole('heading', { name: patient.name })).toBeVisible();
    await expect(page.getByRole('button', { name: /new visit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /edit profile/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^delete$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Earnings' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Expenses' })).toHaveCount(0);
    await snap(page, 'receptionist-patient-actions');
  });

  test('can create a visit but cannot edit or delete it', async ({ page }) => {
    const findings = `Recep visit ${uniqueSuffix()}`;
    const patient = await createPatientViaApi(page);
    const visit = await createVisitViaApi(page, patient.id, findings);
    expect(visit.id).toBeTruthy();

    await page.goto(`/patients/${patient.patient_id}`);
    const card = page.getByTestId('visit-card').filter({ hasText: findings });
    await expect(card).toBeVisible();
    await card.click();
    await expect(card.getByTestId('edit-visit')).toHaveCount(0);
    await expect(card.getByTestId('delete-visit')).toHaveCount(0);
    await snap(page, 'receptionist-visit-read-only');
  });

  test('cannot invite members or save clinic profile', async ({ page }) => {
    await page.goto('/settings?tab=members');
    await expect(page.getByRole('heading', { name: 'Clinic Members' })).toBeVisible();
    await expect(page.getByRole('button', { name: /invite member/i })).toHaveCount(0);

    await page.goto('/settings?tab=profile');
    await page.getByPlaceholder('One-line description').fill(`blocked ${uniqueSuffix()}`);
    await expect(page.getByRole('button', { name: /save changes/i })).toBeDisabled();
    await snap(page, 'receptionist-settings-locked');
  });

  test('API rejects receptionist mutations they are not allowed', async ({ page }) => {
    const patient = await createPatientViaApi(page);
    const visit = await createVisitViaApi(page, patient.id, `API ${uniqueSuffix()}`);

    const delPatient = await apiJson(page, `/api/patients/${patient.patient_id}`, { method: 'DELETE' });
    expect(delPatient.status).toBe(403);

    const editVisit = await apiJson(page, '/api/visits', {
      method: 'PUT',
      body: JSON.stringify({ id: visit.id, clinical_findings: 'should fail', date: new Date().toISOString().split('T')[0], patient_id: patient.id }),
    });
    expect(editVisit.status).toBe(403);

    const expense = await apiJson(page, '/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ date: new Date().toISOString().split('T')[0], amount: 10, category: 'E2E Supplies', description: 'nope' }),
    });
    expect(expense.status).toBe(403);

    const member = await apiJson(page, '/api/clinic/members', {
      method: 'POST',
      body: JSON.stringify({ email: `blocked.${uniqueSuffix()}@example.com`, role: 'DOCTOR' }),
    });
    expect(member.status).toBe(403);
  });
});

test.describe('Doctor permissions', () => {
  test('can edit a patient but cannot delete them or manage members', async ({ page }) => {
    const name = `Doc ${uniqueSuffix()}`;
    const patient = await createPatientViaApi(page, { name });
    await asRole(page, 'DOCTOR');

    await page.goto(`/patients/${patient.patient_id}`);
    await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^delete$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Earnings' })).toHaveCount(0);
    await snap(page, 'doctor-patient-actions');

    const delPatient = await apiJson(page, `/api/patients/${patient.patient_id}`, { method: 'DELETE' });
    expect(delPatient.status).toBe(403);

    const member = await apiJson(page, '/api/clinic/members', {
      method: 'POST',
      body: JSON.stringify({ email: `doc.blocked.${uniqueSuffix()}@example.com`, role: 'DOCTOR' }),
    });
    expect(member.status).toBe(403);
  });
});
