import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Payment {
    id: string;
    date: string;
    amount: number;
    purpose: string;
    mode: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
        return NextResponse.json({ error: 'Start and End dates are required' }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const sql = getDb();
    
    // Fetch all patients and expenses
    const [patients, expenses] = await Promise.all([
        sql`SELECT payments FROM patients WHERE payments IS NOT NULL`,
        sql`SELECT * FROM expenses WHERE date >= ${start} AND date <= ${end}`
    ]);

    const categoryMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {}; 
    const expenseCategoryMap: Record<string, number> = {};

    let filteredRevenue = 0;
    let totalExpenses = 0;

    // 1. Process Revenue
    patients.forEach(row => {
        try {
            const payments: Payment[] = JSON.parse(row.payments);
            if (Array.isArray(payments)) {
                payments.forEach(p => {
                    const pDate = new Date(p.date);
                    const amt = Number(p.amount) || 0;

                    // All-time trend (for Bar Chart)
                    const monthKey = pDate.toISOString().slice(0, 7); 
                    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amt;

                    // Filtered Stats
                    if (pDate >= startDate && pDate <= endDate) {
                        filteredRevenue += amt;
                        let rawPurpose = (p.purpose || 'Other').replace(/[0-9₹]/g, '').trim();
                        let parts = rawPurpose.split(/,| and /).map(s => s.trim()).filter(s => s.length > 0);
                        if (parts.length === 0) parts = ['Other'];
                        const amountPerPart = amt / parts.length;

                        parts.forEach(part => {
                            let cleanName = part.toLowerCase();
                            if (cleanName.includes('rct') || cleanName.includes('root canal')) cleanName = 'Root Canal (RCT)';
                            else if (cleanName.includes('xray') || cleanName.includes('x ray') || cleanName.includes('x-ray')) cleanName = 'X-Ray';
                            else if (cleanName.includes('scaling')) cleanName = 'Scaling';
                            else if (cleanName.includes('extraction')) cleanName = 'Extraction';
                            else if (cleanName.includes('crown')) cleanName = 'Crown';
                            else if (cleanName.includes('consultation') || cleanName.includes('consultaion') || cleanName.includes('constulation')) cleanName = 'Consultation';
                            else if (cleanName.includes('access opening')) cleanName = 'Access Opening';
                            else cleanName = cleanName.replace(/\b\w/g, c => c.toUpperCase());

                            categoryMap[cleanName] = (categoryMap[cleanName] || 0) + amountPerPart;
                        });
                    }
                });
            }
        } catch (e) { }
    });

    // 2. Process Expenses
    expenses.forEach(e => {
        const amt = Number(e.amount) || 0;
        totalExpenses += amt;
        const cat = e.category || 'Miscellaneous';
        expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + amt;
    });

    // Format for Recharts
    const pieData = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const monthlyTrend = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
            const [y, m] = key.split('-');
            const d = new Date(parseInt(y), parseInt(m) - 1);
            return { month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), revenue: value };
        });

    return NextResponse.json({
        totalRevenue: filteredRevenue,
        totalExpenses,
        profit: filteredRevenue - totalExpenses,
        pieData,
        monthlyTrend,
        expenseBreakdown: Object.entries(expenseCategoryMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}