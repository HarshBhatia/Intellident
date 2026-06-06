import { NextResponse } from 'next/server';
import { getExpenses, createExpense, createExpenses, updateExpense, deleteExpense } from '@/services/expense.service';
import { withAuth } from '@/lib/api-handler';
import { getMemberRole } from '@/lib/auth';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const start    = searchParams.get('start')    || undefined;
  const end      = searchParams.get('end')      || undefined;
  const category = searchParams.get('category') || undefined;
  const expenses = await getExpenses(clinicId, start, end, category);
  return NextResponse.json(expenses);
});

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  if (Array.isArray(body)) {
    const expenses = await createExpenses(body, clinicId);
    return NextResponse.json(expenses);
  }
  const newExpense = await createExpense(body, clinicId);
  return NextResponse.json(newExpense);
});

export const PUT = withAuth(async (request: Request, { clinicId }) => {
  const { id, ...data } = await request.json();
  if (!id) return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
  const updated = await updateExpense(id, data, clinicId);
  return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request: Request, { clinicId, userEmail }) => {
  const role = await getMemberRole(clinicId, userEmail);
  if (role !== 'OWNER') {
    return NextResponse.json({ error: 'Only clinic owners can delete expenses' }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });

  await deleteExpense(id, clinicId);
  return NextResponse.json({ success: true });
});
