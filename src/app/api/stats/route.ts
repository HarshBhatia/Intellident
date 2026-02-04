import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Payment {
    id: string;
    date: string;
    amount: number;
    purpose: string;
    mode: string;
}

/**
 * Normalizes clinical treatment names and removes any pricing or trash data.
 */
function normalizeCategory(name: string): string {
    // Remove numbers, currency symbols, and extra whitespace
    let clean = name.replace(/[0-9₹,]/g, '').toLowerCase().trim();
    
    if (clean.includes('rct') || clean.includes('root canal')) return 'Root Canal (RCT)';
    if (clean.includes('xray') || clean.includes('x ray') || clean.includes('x-ray')) return 'X-Ray';
    if (clean.includes('scaling') || clean.includes('polishing') || clean.includes('cleaning')) return 'Scaling & Polishing';
    if (clean.includes('extraction') || clean.includes('removal')) return 'Extraction';
    if (clean.includes('crown') || clean.includes('cap') || clean.includes('ceramic') || clean.includes('zirconia')) return 'Crown / Cap';
    if (clean.includes('consultation') || clean.includes('consultaion') || clean.includes('constulation') || clean.includes('examination')) return 'Consultation';
    if (clean.includes('filling') || clean.includes('composite') || clean.includes('restoration')) return 'Filling';
    if (clean.includes('denture')) return 'Denture';
    if (clean.includes('implant')) return 'Implant';
    if (clean.includes('ortho') || clean.includes('braces')) return 'Orthodontics';
    if (clean.includes('medicine')) return 'Medicines';
    
    // Default: Title Case the remainder
    return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'General';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) return NextResponse.json({ error: 'Dates required' }, { status: 400 });

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

                    // Filtered range logic
                    if (pDate >= startDate && pDate <= endDate) {
                        filteredRevenue += amt;
                        const purpose = p.purpose || 'Other';
                        
                        // Smart parsing: Split combined treatments
                        const parts = purpose.split(/,| and /).map(s => s.trim()).filter(Boolean);
                        
                        // Look for amounts inside the note (e.g. "RCT 2000, Xray 200")
                        const foundAmounts = purpose.match(/(\d+)/g)?.map(Number).filter(n => n > 50) || [];
                        
                        if (foundAmounts.length > 0 && foundAmounts.length === parts.length) {
                            // Match specific amounts to categories
                            parts.forEach((part, idx) => {
                                const cat = normalizeCategory(part);
                                categoryMap[cat] = (categoryMap[cat] || 0) + foundAmounts[idx];
                            });
                        } else {
                            // Fallback: Split equally
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
        } catch (e) { }
    });

    // 2. Process Expenses
    expenses.forEach(e => { totalExpenses += Number(e.amount) || 0; });

    // 3. Final Formatting with Rounding
    const pieData = Object.entries(categoryMap)
        .map(([name, value]) => ({ 
            name, 
            value: Math.round(value) // REMOVE DECIMALS
        }))
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
  } catch (error) { 
    return NextResponse.json({ error: 'Failed' }, { status: 500 }); 
  }
}
