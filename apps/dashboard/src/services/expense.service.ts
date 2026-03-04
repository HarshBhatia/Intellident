import { getDb } from '@intellident/api';

// ============================================================================
// Types
// ============================================================================

export interface Expense {
  id: number;
  date: string;
  amount: number;
  category: string;
  description: string;
  clinic_id: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  clinic_id: string;
}

// ============================================================================
// Expenses
// ============================================================================

export async function getExpenses(clinicId: string): Promise<Expense[]> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  const rows = await sql`SELECT * FROM expenses WHERE clinic_id = ${clinicId} ORDER BY date DESC`;
  return rows as Expense[];
}

export async function createExpense(expenseData: Omit<Expense, 'id' | 'clinic_id'>, clinicId: string): Promise<Expense> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const { date, amount, category, description } = expenseData;
  if (!date || amount === undefined || !category) {
    throw new Error('Date, amount and category are required');
  }

  const sql = getDb();
  const result = await sql`
    INSERT INTO expenses (date, amount, category, description, clinic_id)
    VALUES (${date}, ${amount}, ${category}, ${description}, ${clinicId})
    RETURNING *
  `;
  return result[0] as Expense;
}

export async function deleteExpense(id: number, clinicId: string): Promise<void> {
  if (!id) throw new Error('Expense ID is required');
  if (!clinicId) throw new Error('Clinic ID is required');

  const sql = getDb();
  const result = await sql`DELETE FROM expenses WHERE id = ${id} AND clinic_id = ${clinicId} RETURNING id`;
  if (result.length === 0) {
    throw new Error('Expense not found');
  }
}

// ============================================================================
// Expense Categories
// ============================================================================

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