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
    endDate.setHours(23, 59, 59, 999); // Include full end day

    const sql = getDb();
    // Fetch all payments. Since it's stored as TEXT, we fetch rows and parse in JS.
    // Optimization: In a large app, we would use JSONB and SQL aggregation.
    const patients = await sql`SELECT payments FROM patients WHERE payments IS NOT NULL`;

    let totalRevenue = 0;
    const categoryMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};

    patients.forEach(row => {
        try {
            const payments: Payment[] = JSON.parse(row.payments);
            if (Array.isArray(payments)) {
                payments.forEach(p => {
                    const pDate = new Date(p.date);
                    if (pDate >= startDate && pDate <= endDate) {
                        const amt = Number(p.amount) || 0;
                        totalRevenue += amt;

                        // Clean and Split Categories
                        // 1. Remove numbers (prices) and currency symbols
                        // 2. Split by comma to handle combined treatments
                        // 3. Distribute amount equally
                        
                        let rawPurpose = (p.purpose || 'Other').replace(/[0-9₹]/g, '').trim(); // Remove digits/symbols
                        
                        // Split by comma or ' and '
                        let parts = rawPurpose.split(/,| and /).map(s => s.trim()).filter(s => s.length > 0);
                        
                        if (parts.length === 0) parts = ['Other'];

                        const amountPerPart = amt / parts.length;

                        parts.forEach(part => {
                            // Normalize: "rct" -> "RCT", "x ray" -> "X-Ray"
                            let cleanName = part.toLowerCase();
                            
                            // Formatting fixes
                            if (cleanName.includes('rct') || cleanName.includes('root canal')) cleanName = 'Root Canal (RCT)';
                            else if (cleanName.includes('xray') || cleanName.includes('x ray') || cleanName.includes('x-ray')) cleanName = 'X-Ray';
                            else if (cleanName.includes('scaling')) cleanName = 'Scaling';
                            else if (cleanName.includes('extraction')) cleanName = 'Extraction';
                            else if (cleanName.includes('crown')) cleanName = 'Crown';
                            else if (cleanName.includes('consultation') || cleanName.includes('consultaion') || cleanName.includes('constulation')) cleanName = 'Consultation'; // Handle typos
                            else if (cleanName.includes('access opening')) cleanName = 'Access Opening';
                            else {
                                // Default Title Case
                                cleanName = cleanName.replace(/\b\w/g, c => c.toUpperCase());
                            }

                            categoryMap[cleanName] = (categoryMap[cleanName] || 0) + amountPerPart;
                        });

                        // Group by Date (for trend chart if needed later)
                        const dateStr = p.date;
                        dateMap[dateStr] = (dateMap[dateStr] || 0) + amt;
                    }
                });
            }
        } catch (e) {
            // Ignore parse errors
        }
    });

    // Format for Recharts
    const pieData = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort highest first

    return NextResponse.json({
        totalRevenue,
        pieData,
        // Top 5 categories for summary
        topCategories: pieData.slice(0, 5)
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
