import { NextResponse } from 'next/server';
import { getAuthContext, verifyMembership } from '@/lib/auth';

export async function POST(request: Request) {
  const { userId, userEmail } = await getAuthContext();
  if (!userId || !userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { clinicId } = body;

  const cId = parseInt(clinicId);
  if (isNaN(cId)) {
    return NextResponse.json({ error: 'Invalid clinic ID' }, { status: 400 });
  }

  // Verify the user is actually a member of this clinic
  if (!(await verifyMembership(cId, userEmail, userId))) {
    return NextResponse.json({ error: 'Not a member of this clinic' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  
  response.cookies.set('clinic_id', cId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });

  return response;
}
