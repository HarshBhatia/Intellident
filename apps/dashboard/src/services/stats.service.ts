import { getDb } from '@intellident/api';
import type { StatsResult, BillingItem } from '@intellident/api';

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

export async function getClinicStats(clinicId: string, startDate: Date, endDate: Date): Promise<StatsResult> {
  if (!clinicId) throw new Error('Clinic ID is required');
  const sql = getDb();
  
  // Fetch ALL visits for monthly trend (no date filter)
  const allVisits = await sql`
    SELECT date, paid
    FROM visits 
    WHERE clinic_id = ${clinicId}
  `;

  // Fetch FILTERED visits for category breakdown (with date filter)
  const filteredVisits = await sql`
    SELECT date, paid, billing_items, procedure_notes
    FROM visits 
    WHERE clinic_id = ${clinicId}
    AND date >= ${startDate.toISOString().split('T')[0]}
    AND date <= ${endDate.toISOString().split('T')[0]}
  `;

  // Fetch expenses data (with date filter)
  const expenses = await sql`
    SELECT date, amount 
    FROM expenses 
    WHERE clinic_id = ${clinicId}
    AND date >= ${startDate.toISOString().split('T')[0]}
    AND date <= ${endDate.toISOString().split('T')[0]}
  `;

  const categoryMap: Record<string, number> = {};
  const monthlyMap: Record<string, number> = {}; 
  let filteredRevenue = 0;
  let totalExpenses = 0;

  // 1. Process ALL visits for monthly trend
  allVisits.forEach((visit: any) => {
      const visitDate = new Date(visit.date);
      const paidAmount = Number(visit.paid) || 0;
      
      if (!isNaN(visitDate.getTime())) {
          const monthKey = visitDate.toISOString().slice(0, 7); 
          monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + paidAmount;
      }
  });

  // 2. Process FILTERED visits for revenue and categories
  filteredVisits.forEach((visit: any) => {
      const paidAmount = Number(visit.paid) || 0;
      filteredRevenue += paidAmount;
      
      let items: BillingItem[] = [];
      try {
        if (visit.billing_items) {
          items = JSON.parse(visit.billing_items);
        }
      } catch (e) {
        // Skip invalid billing items
      }

      if (items.length > 0) {
        const splitAmt = paidAmount / items.length;
        items.forEach((item: any) => {
          const cat = normalizeCategory(item.description);
          categoryMap[cat] = (categoryMap[cat] || 0) + splitAmt;
        });
      } else {
        const cat = normalizeCategory(visit.procedure_notes || 'Other');
        categoryMap[cat] = (categoryMap[cat] || 0) + paidAmount;
      }
  });

  // 3. Process Expenses (already filtered by SQL)
  expenses.forEach((e: any) => { 
      totalExpenses += Number(e.amount) || 0; 
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

  return {
      totalRevenue: Math.round(filteredRevenue),
      totalExpenses: Math.round(totalExpenses),
      profit: Math.round(filteredRevenue - totalExpenses),
      pieData,
      monthlyTrend
  };
}