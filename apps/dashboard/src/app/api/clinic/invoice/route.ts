import { NextResponse } from 'next/server';
import { incrementInvoiceCounter } from '@/services/clinic.service';
import { withAuth } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// POST /api/clinic/invoice — atomically increment and return next invoice number
export async function POST(request: Request) {
  return withAuth(async (_req: Request, { clinicId }) => {
    const counter = await incrementInvoiceCounter(clinicId);
    return NextResponse.json({ invoice_number: counter });
  })(request);
}
