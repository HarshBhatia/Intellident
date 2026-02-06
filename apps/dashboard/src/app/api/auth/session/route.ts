import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { clinicId } = body;

  const response = NextResponse.json({ success: true });
  
  // Set clinic_id cookie securely
  response.cookies.set('clinic_id', clinicId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });

  return response;
}
