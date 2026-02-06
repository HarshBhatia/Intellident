import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const sql = getDb();
    const patients = await sql`SELECT date, amount FROM patients WHERE user_email = ${userEmail}`;
    const expenses = await sql`SELECT date, amount FROM expenses WHERE user_email = ${userEmail}`;


    const categoryMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {}; 
    let filteredRevenue = 0;
    let totalExpenses = 0;

    // 1. Process Revenue (Payments)
    patients.forEach(row => {
        try {
            const payments: Payment[] = JSON.parse(row.payments);
            if (Array.isArray(payments)) {
                payments.forEach(p => {
                    const pDate = new Date(p.date);
                    const amt = Number(p.amount) || 0;
                    
                    // Monthly trend (All history)
                    const monthKey = pDate.toISOString().slice(0, 7); 
                    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amt;

                    // Filtered range for categories
                    if (pDate >= startDate && pDate <= endDate) {
                        filteredRevenue += amt;
                        const purpose = p.purpose || 'Other';
                        
                        // Smart parsing: Split combined treatments by comma or "and"
                        const parts = purpose.split(/,| and /).map(s => s.trim()).filter(Boolean);
                        
                        // Try to find numbers that are likely specific amounts (not tooth numbers or sitting numbers)
                        const allNumbersInPurpose = purpose.match(/(\d+)/g)?.map(Number) || [];
                        const specificAmounts = allNumbersInPurpose.filter(n => n > 10 && n < 100000); // Filter out common tooth/sitting numbers

                        if (specificAmounts.length === parts.length) {
                            // If number of detected specific amounts matches number of parts, attribute them specifically
                            parts.forEach((part, idx) => {
                                const cat = normalizeCategory(part);
                                categoryMap[cat] = (categoryMap[cat] || 0) + specificAmounts[idx];
                            });
                        } else {
                            // Fallback: Split total payment equally among parts, then normalize
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
                });
            }
        } catch (e) { /* Ignore parsing errors for robustnes */ }
    });

    // 2. Process Expenses
    expenses.forEach(e => { totalExpenses += Number(e.amount) || 0; });

    // 3. Final Formatting with Rounding
    const pieData = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value: Math.round(value) })) // ENSURE ROUNDING
        .filter(item => item.value > 0) // Filter out categories with 0 amounts
        .sort((a, b) => b.value - a.value);

    const monthlyTrend = Object.entries(monthlyMap)
        .sort(([a],[b])=>a.localeCompare(b))
        .map(([k,v]) => {
            const date = new Date(k + '-02'); // Using '02' as day to avoid timezone issues with '01'
            return {
                month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
                revenue: Math.round(v) // ENSURE ROUNDING
            };
        });

    return NextResponse.json({
        totalRevenue: Math.round(filteredRevenue), // ENSURE ROUNDING
        totalExpenses: Math.round(totalExpenses), // ENSURE ROUNDING
        profit: Math.round(filteredRevenue - totalExpenses), // ENSURE ROUNDING
        pieData,
        monthlyTrend
    });
  } catch (error: any) { 
    console.error('Stats aggregation error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats', details: error.message || error.toString() }, { status: 500 });
  }
}