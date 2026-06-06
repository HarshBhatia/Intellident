import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getMessagesByPatient, sendMessage } from '@/services/message.service';
import { MessageChannel, MessageType } from '@intellident/api/src/types';

export const GET = withAuth(async (request: Request, { clinicId }) => {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patient_id');
  if (!patientId) {
    return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
  }
  const messages = await getMessagesByPatient(clinicId, parseInt(patientId));
  return NextResponse.json(messages);
});

export const POST = withAuth(async (request: Request, { clinicId, userEmail }) => {
  const body = await request.json();
  const { patient_id, phone, channel, message_type, message, template_params } = body;

  if (!patient_id || !phone || !channel || !message) {
    return NextResponse.json({ error: 'patient_id, phone, channel, and message are required' }, { status: 400 });
  }

  const validChannels: MessageChannel[] = ['sms', 'whatsapp'];
  if (!validChannels.includes(channel)) {
    return NextResponse.json({ error: 'channel must be sms or whatsapp' }, { status: 400 });
  }

  const msg = await sendMessage(
    clinicId,
    parseInt(patient_id),
    phone,
    channel as MessageChannel,
    (message_type as MessageType) || 'custom',
    message,
    userEmail,
    Array.isArray(template_params) ? template_params : undefined
  );

  return NextResponse.json(msg);
});
