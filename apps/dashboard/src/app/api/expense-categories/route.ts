import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getExpenseCategories, createExpenseCategory, deleteExpenseCategory } from '@/services/expense.service';
import { getAuthContext, verifyMembership } from '@/lib/auth';

export async function GET() {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const expenseCategories = await getExpenseCategories(clinicId);
    return NextResponse.json(expenseCategories);
  } catch (error: any) {
    console.error('Fetch expense categories error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch expense categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    const newExpenseCategory = await createExpenseCategory(name, clinicId);
    return NextResponse.json(newExpenseCategory);
  } catch (error: any) {
    console.error('Create expense category error:', error);
    if (error.message === 'Category name is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create expense category' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const cookieStore = await cookies();
    const clinicId = cookieStore.get('clinic_id')?.value;
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    if (!userEmail || !(await verifyMembership(clinicId, userEmail))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    await deleteExpenseCategory(id, clinicId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete expense category error:', error);
    if (error.message === 'Expense category not found') {
      return NextResponse.json({ error: 'Expense category not found' }, { status: 404 });
    }
    if (error.message === 'Category ID is required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete expense category' }, { status: 500 });
  }
}