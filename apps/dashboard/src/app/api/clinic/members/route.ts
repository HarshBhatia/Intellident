import { NextResponse } from 'next/server';
import { getClinicMembers, addClinicMember, removeClinicMember, getDoctorMembers, updateClinicMember } from '@/services/clinic.service';
import { withAuth } from '@/lib/api-handler';
import { getMemberRole } from '@/lib/auth';

export const GET = withAuth(async (request: Request, { clinicId, userEmail, userId }) => {
  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get('role');

  let members;
  if (roleFilter === 'DOCTOR') {
    members = await getDoctorMembers(clinicId);
  } else {
    members = await getClinicMembers(clinicId);
  }

  const currentUserRole = await getMemberRole(clinicId, userEmail, userId);
  return NextResponse.json({ members, currentUserRole });
});

export const POST = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const { email, role = 'DOCTOR', displayName } = body;
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const newMember = await addClinicMember(clinicId, email, role, displayName);
  return NextResponse.json(newMember);
}, { requiredPermission: 'members.manage' });

export const PUT = withAuth(async (request: Request, { clinicId }) => {
  const body = await request.json();
  const { id, displayName, role } = body;
  if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

  const updated = await updateClinicMember(clinicId, id, { displayName, role });
  return NextResponse.json(updated);
}, { requiredPermission: 'members.manage' });

export const DELETE = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });

  await removeClinicMember(clinicId, id);
  return NextResponse.json({ success: true });
}, { requiredPermission: 'members.manage' });
