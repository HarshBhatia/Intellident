import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getExpenses, createExpense, deleteExpense } from '@/services/expense.service';
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

    const expenses = await getExpenses(clinicId);
    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch expenses' }, { status: 500 });
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
    const newExpense = await createExpense(body, clinicId);
    return NextResponse.json(newExpense);
  } catch (error: any) {
    console.error('Create expense error:', error);
    if (error.message === 'Date, amount and category are required' || error.message === 'Clinic ID is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create expense' }, { status: 500 });
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

        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });

        await deleteExpense(id, clinicId);
        return NextResponse.json({ success: true });
    } catch (error: any) { 
      console.error('Delete expense error:', error);
      if (error.message === 'Expense not found') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      if (error.message === 'Expense ID is required' || error.message === 'Clinic ID is required') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: error.message || 'Failed to delete expense' }, { status: 500 }); 
    }
}
