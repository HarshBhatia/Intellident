import { NextResponse } from 'next/server';
import { getExpenseCategories, createExpenseCategory, deleteExpenseCategory } from '@/services/expense.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const expenseCategories = await getExpenseCategories(clinicId);
  return NextResponse.json(expenseCategories);
});

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

  const newExpenseCategory = await createExpenseCategory(name, clinicId);
  return NextResponse.json(newExpenseCategory);
});

export const DELETE = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

  await deleteExpenseCategory(id, clinicId);
  return NextResponse.json({ success: true });
});