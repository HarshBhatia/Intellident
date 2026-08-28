import { Page } from '@playwright/test';

export type E2ERole = 'OWNER' | 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';

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

export async function dismissNextDialog(page: Page) {
  page.once('dialog', dialog => dialog.dismiss());
}

/** Impersonate a clinic role for the rest of this browser context (E2E only). */
export async function asRole(page: Page, role: E2ERole) {
  await page.context().addCookies([{
    name: 'x-e2e-role',
    value: role,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }]);
}

export async function apiJson(page: Page, url: string, init: RequestInit = {}) {
  return page.evaluate(async ({ url, init }) => {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> || {}) },
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }, { url, init });
}

export async function createVisitViaApi(
  page: Page,
  patientNumericId: number,
  findings: string,
  extras: { cost?: number; paid?: number; doctor?: string } = {},
) {
  await ensureApp(page);
  const visit = await page.evaluate(async ({ patient_id, findings, extras }) => {
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id,
        date: new Date().toISOString().split('T')[0],
        visit_type: 'Consultation',
        clinical_findings: findings,
        procedure_notes: '',
        doctor: extras.doctor || 'E2E Doctor',
        cost: extras.cost ?? 0,
        paid: extras.paid ?? 0,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`createVisitViaApi failed: ${res.status} ${err}`);
    }
    return res.json();
  }, { patient_id: patientNumericId, findings, extras });
  return visit as { id: number };
}
