import { Page } from '@playwright/test';

export async function signIn(_page: Page) {
  // With global setup and storageState, authentication is already handled.
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export interface CreatedPatient {
  id: number;
  patient_id: string;
  name: string;
}

async function ensureApp(page: Page) {
  if (!page.url().startsWith('http')) {
    await page.goto('/patients');
  }
}

export async function createPatientViaApi(page: Page, overrides: { name?: string; age?: number; phone?: string } = {}): Promise<CreatedPatient> {
  await ensureApp(page);
  const name = overrides.name || `E2E Patient ${uniqueSuffix()}`;
  const patient = await page.evaluate(async ({ name, age, phone }) => {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        age: age ?? 32,
        gender: 'Female',
        phone_number: phone || '+919876543210',
        patient_type: 'Regular',
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`createPatientViaApi failed: ${res.status} ${err}`);
    }
    return res.json();
  }, { name, age: overrides.age, phone: overrides.phone });

  return { id: patient.id, patient_id: patient.patient_id, name: patient.name };
}

export async function createPatientViaUi(page: Page, overrides: { name?: string; age?: string } = {}) {
  const name = overrides.name || `E2E Patient ${uniqueSuffix()}`;
  await page.goto('/patients');
  await page.getByRole('button', { name: /add patient/i }).click();
  await page.locator('h2:has-text("New Patient")').waitFor();
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="phone_number"]', '9876543210');
  await page.fill('input[name="age"]', overrides.age || '35');
  await page.getByRole('button', { name: /create patient/i }).click();
  await page.waitForURL(/\/patients\/PID-/);
  return { name, patient_id: page.url().split('/patients/')[1].split('?')[0] };
}

export async function ensureExpenseCategory(page: Page, name = 'E2E Supplies') {
  await ensureApp(page);
  await page.evaluate(async (categoryName) => {
    const listRes = await fetch('/api/expenses/categories');
    const categories = listRes.ok ? await listRes.json() : [];
    if (Array.isArray(categories) && categories.some((c: { name: string }) => c.name === categoryName)) {
      return;
    }
    const res = await fetch('/api/expenses/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ensureExpenseCategory failed: ${res.status} ${err}`);
    }
  }, name);
  return name;
}

export async function acceptNextDialog(page: Page) {
  page.once('dialog', dialog => dialog.accept());
}
