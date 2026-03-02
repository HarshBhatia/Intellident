import { getDb } from '@intellident/api';

export interface ExpenseCategory {
  id: number;
  name: string;
  clinic_id: string;
}

export async function getExpenseCategories(clinicId: string): Promise<ExpenseCategory[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const rows = await sql`SELECT * FROM expense_categories WHERE clinic_id = ${clinicId}`;
  return rows as ExpenseCategory[];
}

export async function createExpenseCategory(name: string, clinicId: string): Promise<ExpenseCategory> {
  if (!name) throw new Error('Category name is required');
  if (!clinicId) throw new Error('Clinic ID is required');

  const sql = getDb();
  const result = await sql`
    INSERT INTO expense_categories (name, clinic_id)
    VALUES (${name}, ${clinicId})
    ON CONFLICT (name, clinic_id) DO NOTHING
    RETURNING *
  `;
  // If result.length is 0, it means the ON CONFLICT DO NOTHING clause was triggered,
  // so we fetch the existing category.
  if (result.length === 0) {
      const existing = await sql`SELECT * FROM expense_categories WHERE name = ${name} AND clinic_id = ${clinicId}`;
      return existing[0] as ExpenseCategory;
  }
  return result[0] as ExpenseCategory;
}

export async function deleteExpenseCategory(id: number, clinicId: string): Promise<void> {
  if (!id) throw new Error('Category ID is required');
  if (!clinicId) throw new Error('Clinic ID is required');

  const sql = getDb();
  const result = await sql`DELETE FROM expense_categories WHERE id = ${id} AND clinic_id = ${clinicId} RETURNING id`;
  if (result.length === 0) {
    throw new Error('Expense category not found');
  }
}