import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Payment {
    id: string;
    date: string;
    amount: number;
    purpose: string;
    mode: string;
}

function normalizeCategory(name: string): string {
    let clean = name.toLowerCase().trim();
    if (clean.includes('rct') || clean.includes('root canal')) return 'Root Canal (RCT)';
    if (clean.includes('xray') || clean.includes('x ray') || clean.includes('x-ray')) return 'X-Ray';
    if (clean.includes('scaling')) return 'Scaling';
    if (clean.includes('extraction')) return 'Extraction';
    if (clean.includes('crown')) return 'Crown';
    if (clean.includes('consultation') || clean.includes('consultaion') || clean.includes('constulation') || clean.includes('examination')) return 'Consultation';
    if (clean.includes('filling') || clean.includes('composite')) return 'Filling';
    if (clean.includes('denture')) return 'Denture';
    if (clean.includes('implant')) return 'Implant';
    if (clean.includes('cleaning')) return 'Cleaning';
    if (clean.includes('ortho') || clean.includes('braces')) return 'Orthodontics';
    
    // Default: Title Case
    return clean.replace(/\b\w/g, c => c.toUpperCase());
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
    const [patients, expenses] = await Promise.all([
        sql`SELECT payments FROM patients WHERE payments IS NOT NULL`,
        sql`SELECT * FROM expenses WHERE date >= ${start} AND date <= ${end}`
    ]);

    const categoryMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {}; 
    let filteredRevenue = 0;
    let totalExpenses = 0;

    patients.forEach(row => {
        try {
            const payments: Payment[] = JSON.parse(row.payments);
            if (Array.isArray(payments)) {
                payments.forEach(p => {
                    const pDate = new Date(p.date);
                    const amt = Number(p.amount) || 0;
                    const monthKey = pDate.toISOString().slice(0, 7); 
                    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amt;

                    if (pDate >= startDate && pDate <= endDate) {
                        filteredRevenue += amt;
                        const purpose = p.purpose || 'Other';
                        
                        // Try to find individual amounts in the purpose string (e.g. "RCT 2000, Xray 200")
                        const matches = purpose.match(/(\d+)/g);
                        const parts = purpose.split(/,| and /).map(s => s.trim()).filter(Boolean);
                        
                        if (matches && matches.length === parts.length) {
                            // Map amounts to their respective parts
                            parts.forEach((part, idx) => {
                                const partAmt = parseInt(matches[idx]);
                                const cat = normalizeCategory(part.replace(/[0-9₹,]/g, ''));
                                categoryMap[cat] = (categoryMap[cat] || 0) + partAmt;
                            });
                        } else {
                            // Fallback to equal split
                            const splitAmt = amt / (parts.length || 1);
                            if (parts.length === 0) {
                                categoryMap['Other'] = (categoryMap['Other'] || 0) + amt;
                            } else {
                                parts.forEach(part => {
                                    const cat = normalizeCategory(part.replace(/[0-9₹,]/g, ''));
                                    categoryMap[cat] = (categoryMap[cat] || 0) + splitAmt;
                                });
                            }
                        }
                    }
                });
            }
        } catch (e) { }
    });

    expenses.forEach(e => { totalExpenses += Number(e.amount) || 0; });

    // Format and round values for cleaner display
    const pieData = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

    return NextResponse.json({
        totalRevenue: Math.round(filteredRevenue),
        totalExpenses: Math.round(totalExpenses),
        profit: Math.round(filteredRevenue - totalExpenses),
        pieData,
        monthlyTrend: Object.entries(monthlyMap).sort(([a],[b])=>a.localeCompare(b)).map(([k,v]) => ({
            month: new Date(k + '-01').toLocaleString('default', { month: 'short', year: '2-digit' }),
            revenue: Math.round(v)
        }))
    });
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}
