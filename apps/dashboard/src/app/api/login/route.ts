import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  if (username === 'admin' && password === 'password') {
    const response = NextResponse.json({ success: true });
    // Set a simple cookie for auth
    response.cookies.set('auth_token', 'logged_in', { 
      httpOnly: true, 
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });
    return response;
  }

  return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
}
