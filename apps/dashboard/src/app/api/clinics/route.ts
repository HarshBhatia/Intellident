import { NextResponse } from 'next/server';
import { getClinics, createClinic } from '@/services/clinic.service'; // Import the new service
import { getAuthContext } from '@/lib/auth';

export async function GET() {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    if (!userEmail) return NextResponse.json({ error: 'User email not found' }, { status: 400 });

    const clinics = await getClinics(userEmail);
    
    return NextResponse.json(clinics);
  } catch (error: any) {
    console.error('Fetch clinics error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch clinics' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, userEmail } = await getAuthContext();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    if (!userEmail) return NextResponse.json({ error: 'User email not found' }, { status: 400 });

    const body = await request.json();
    const { name } = body;

    if (!name) return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 });

    const newClinic = await createClinic(name, userEmail);

    return NextResponse.json(newClinic);
  } catch (error: any) {
    console.error('Create clinic error:', error);
    if (error.message === 'Clinic name is required' || error.message === 'User email is required') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create clinic' }, { status: 500 });
  }
}
