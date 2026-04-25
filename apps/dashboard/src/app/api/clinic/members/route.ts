import { NextResponse } from 'next/server';
import { getClinicMembers, addClinicMember, removeClinicMember, getDoctorMembers, updateMemberDisplayName } from '@/services/clinic.service';
import { withAuth } from '@/lib/api-handler';
import { getMemberRole } from '@/lib/auth';

export const GET = withAuth(async (request: Request, { clinicId, userEmail }) => {
  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get('role');
  
  let members;
  if (roleFilter === 'DOCTOR') {
    // Get doctors (includes OWNER role as they can also be doctors)
    members = await getDoctorMembers(clinicId);
  } else {
    // Get all members
    members = await getClinicMembers(clinicId);
  }
  
  const currentUserRole = await getMemberRole(clinicId, userEmail);
  return NextResponse.json({ members, currentUserRole });
});

export const POST = withAuth(async (request: Request, { clinicId, userEmail }) => {
  const userRole = await getMemberRole(clinicId, userEmail);
  if (userRole !== 'OWNER') {
    return NextResponse.json({ error: 'Only clinic owners can manage members' }, { status: 403 });
  }

  const body = await request.json();
  const { email, role = 'DOCTOR', displayName } = body;
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const newMember = await addClinicMember(clinicId, email, role, displayName);
  return NextResponse.json(newMember);
});

export const PUT = withAuth(async (request: Request, { clinicId, userEmail }) => {
  const userRole = await getMemberRole(clinicId, userEmail);
  if (userRole !== 'OWNER') {
    return NextResponse.json({ error: 'Only clinic owners can manage members' }, { status: 403 });
  }

  const body = await request.json();
  const { id, displayName } = body;
  if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

  const updated = await updateMemberDisplayName(clinicId, id, displayName);
  return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request: Request, { clinicId, userEmail }) => {
  const role = await getMemberRole(clinicId, userEmail);
  if (role !== 'OWNER') {
    return NextResponse.json({ error: 'Only clinic owners can manage members' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

  await removeClinicMember(clinicId, id);
  return NextResponse.json({ success: true });
});
