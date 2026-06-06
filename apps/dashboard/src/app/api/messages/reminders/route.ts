import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { sendAppointmentReminders } from '@/services/message.service';

// POST /api/messages/reminders
// Body: { date?: string }  — defaults to tomorrow (IST)
export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json().catch(() => ({}));

  let targetDate = body.date as string | undefined;
  if (!targetDate) {
    // Default to tomorrow in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const tomorrow = new Date(istNow.getTime() + 24 * 60 * 60 * 1000);
    targetDate = tomorrow.toISOString().split('T')[0];
  }

  const result = await sendAppointmentReminders(clinicId, targetDate);
  return NextResponse.json({ date: targetDate, ...result });
});
