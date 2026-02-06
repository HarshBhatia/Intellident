import { NextResponse } from 'next/server';
import { getDb, PaymentRecord } from '@intellident/api';
import { auth, currentUser } from '@clerk/nextjs/server';

const normalizeCategory = (raw: string) => {
    const s = raw.toLowerCase().trim();
    if (s.includes('rct') || s.includes('root canal')) return 'RCT';
    if (s.includes('crown') || s.includes('cap') || s.includes('bridge') || s.includes('pfm') || s.includes('zirconia')) return 'Crown & Bridge';
    if (s.includes('extraction') || s.includes('removal')) return 'Extraction';
    if (s.includes('implant')) return 'Implant';
    if (s.includes('scaling') || s.includes('cleaning') || s.includes('polishing')) return 'Scaling';
    if (s.includes('filling') || s.includes('restoration') || s.includes('gic') || s.includes('composite')) return 'Restoration';
    if (s.includes('denture') || s.includes('cd') || s.includes('rpd')) return 'Denture';
    if (s.includes('xray') || s.includes('x-ray') || s.includes('radiograph')) return 'X-Ray';
    if (s.includes('consultation') || s.includes('checkup') || s.includes('opd')) return 'Consultation';
    if (s.includes('ortho') || s.includes('brace') || s.includes('wire')) return 'Orthodontics';
    return 'Other'; // Fallback
};

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1));
    const endDate = new Date(searchParams.get('endDate') || new Date());

    const sql = getDb();
    const patients = await sql`SELECT date, amount, payments FROM patients WHERE user_email = ${userEmail}`;
    const expenses = await sql`SELECT date, amount FROM expenses WHERE user_email = ${userEmail}`;

    const categoryMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {}; 
    let filteredRevenue = 0;
    let totalExpenses = 0;

    // 1. Process Revenue (Payments)
    patients.forEach(row => {
        try {
            const payments: PaymentRecord[] = row.payments ? JSON.parse(row.payments) : [];
            if (Array.isArray(payments)) {
                payments.forEach(p => {
                    const pDate = new Date(p.date);
                    const amt = Number(p.amount) || 0;
                    
                    // Monthly trend (All history)
                    if (!isNaN(pDate.getTime())) {
                        const monthKey = pDate.toISOString().slice(0, 7); 
                        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amt;

                        // Filtered range for categories
                        if (pDate >= startDate && pDate <= endDate) {
                            filteredRevenue += amt;
                            const purpose = p.purpose || 'Other';
                            
                            // Smart parsing: Split combined treatments
                            const parts = purpose.split(/,| and /).map(s => s.trim()).filter(Boolean);
                            
                            // Try to find numbers that are likely specific amounts
                            const allNumbersInPurpose = purpose.match(/(\d+)/g)?.map(Number) || [];
                            const specificAmounts = allNumbersInPurpose.filter(n => n > 10 && n < 100000); 

                            if (specificAmounts.length === parts.length) {
                                parts.forEach((part, idx) => {
                                    const cat = normalizeCategory(part);
                                    categoryMap[cat] = (categoryMap[cat] || 0) + specificAmounts[idx];
                                });
                            } else {
                                // Fallback: Split total payment equally
                                const splitAmt = amt / (parts.length || 1);
                                if (parts.length === 0) {
                                    categoryMap['Other'] = (categoryMap['Other'] || 0) + amt;
                                } else {
                                    parts.forEach(part => {
                                        const cat = normalizeCategory(part);
                                        categoryMap[cat] = (categoryMap[cat] || 0) + splitAmt;
                                    });
                                }
                            }
                        }
                    }
                });
            }
        } catch (e) { /* Ignore parsing errors */ }
    });

    // 2. Process Expenses
    expenses.forEach(e => { 
        // Only count expenses within the filtered range if needed, or total?
        // Usually expenses are also time-filtered.
        const eDate = new Date(e.date);
        if (eDate >= startDate && eDate <= endDate) {
            totalExpenses += Number(e.amount) || 0; 
        }
    });

    // 3. Final Formatting with Rounding
    const pieData = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

    const monthlyTrend = Object.entries(monthlyMap)
        .sort(([a],[b])=>a.localeCompare(b))
        .map(([k,v]) => {
            const date = new Date(k + '-02'); 
            return {
                month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
                revenue: Math.round(v)
            };
        });

    return NextResponse.json({
        totalRevenue: Math.round(filteredRevenue),
        totalExpenses: Math.round(totalExpenses),
        profit: Math.round(filteredRevenue - totalExpenses),
        pieData,
        monthlyTrend
    });
  } catch (error: any) { 
    console.error('Stats aggregation error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats', details: error.message || error.toString() }, { status: 500 });
  }
}
