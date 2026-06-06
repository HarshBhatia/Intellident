import { getDb } from '@intellident/api';
import { PatientMessage, MessageChannel, MessageType } from '@intellident/api/src/types';

const MSG91_API_KEY = process.env.MSG91_API_KEY || '';
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'INTLDT';
const MSG91_WHATSAPP_NUMBER = process.env.MSG91_WHATSAPP_NUMBER || '';
const MSG91_SMS_TEMPLATE_ID = process.env.MSG91_SMS_TEMPLATE_ID || '';

// ─── MSG91 API helpers ───────────────────────────────────────────────────────

async function sendSMS(to: string, body: string): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const phone = normalizePhone(to);
  if (!phone) return { success: false, error: 'Invalid phone number' };

  if (MSG91_SMS_TEMPLATE_ID) {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { authkey: MSG91_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ flow_id: MSG91_SMS_TEMPLATE_ID, sender: MSG91_SENDER_ID, mobiles: phone, body }),
    });
    const json = await res.json();
    if (json.type === 'success') return { success: true, requestId: json.request_id };
  }

  // Direct transactional SMS (no template required)
  const params = new URLSearchParams({
    authkey: MSG91_API_KEY,
    mobiles: phone,
    message: body,
    sender: MSG91_SENDER_ID,
    route: '4',
    country: '91',
  });
  const res = await fetch(`https://control.msg91.com/api/sendhttp.php?${params.toString()}`);
  const text = await res.text();
  if (/^\d+$/.test(text.trim())) return { success: true, requestId: text.trim() };
  return { success: false, error: text };
}

async function sendWhatsApp(
  to: string,
  templateName: string,
  templateParams: string[]
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const phone = normalizePhone(to);
  if (!phone) return { success: false, error: 'Invalid phone number' };
  if (!templateName) return { success: false, error: 'NO_TEMPLATE' };

  // Build body_1..body_N component map from params array
  const components: Record<string, { type: string; value: string }> = {};
  templateParams.forEach((val, i) => {
    components[`body_${i + 1}`] = { type: 'text', value: val };
  });

  const payload = {
    integrated_number: MSG91_WHATSAPP_NUMBER,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en', policy: 'deterministic' },
        to_and_components: [
          {
            to: [phone],
            components,
          },
        ],
      },
    },
  };

  const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
    method: 'POST',
    headers: { authkey: MSG91_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log('[MSG91 WhatsApp]', res.status, text);
  let json: any = {};
  try { json = JSON.parse(text); } catch {}
  if (json.type === 'success' || res.ok) return { success: true, requestId: json.request_id };
  return { success: false, error: json.message || text || 'MSG91 WhatsApp error' };
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return null;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

export async function getMessagesByPatient(clinicId: string, patientId: number): Promise<PatientMessage[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM patient_messages
    WHERE clinic_id = ${parseInt(clinicId)} AND patient_id = ${patientId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows as PatientMessage[];
}

// templateParams for the 'appointment' template:
// [{{1}} patientFirstName, {{2}} clinicName, {{3}} visitType, {{4}} date, {{5}} time]
export async function sendMessage(
  clinicId: string,
  patientId: number,
  phone: string,
  channel: MessageChannel,
  messageType: MessageType,
  body: string,
  sentBy: string,
  templateParams?: string[]
): Promise<PatientMessage> {
  const sql = getDb();
  const cId = parseInt(clinicId);

  if (!body.trim()) throw new Error('Message body is required');
  if (!phone) throw new Error('Patient has no phone number');

  const WA_TEMPLATE_NAMES: Partial<Record<MessageType, string>> = {
    appointment_reminder: process.env.MSG91_WA_TEMPLATE_REMINDER || '',
    followup: process.env.MSG91_WA_TEMPLATE_FOLLOWUP || '',
    balance_due: process.env.MSG91_WA_TEMPLATE_BALANCE || '',
  };

  let result: { success: boolean; requestId?: string; error?: string };
  let actualChannel = channel;

  if (channel === 'whatsapp') {
    const templateName = WA_TEMPLATE_NAMES[messageType] || '';
    result = await sendWhatsApp(phone, templateName, templateParams || []);
    // Fall back to SMS if no template configured
    if (!result.success && result.error === 'NO_TEMPLATE') {
      result = await sendSMS(phone, body);
      actualChannel = 'sms';
    }
  } else {
    result = await sendSMS(phone, body);
  }

  const status = result.success ? 'sent' : 'failed';

  const rows = await sql`
    INSERT INTO patient_messages (clinic_id, patient_id, channel, message_type, body, status, msg91_request_id, sent_by)
    VALUES (${cId}, ${patientId}, ${actualChannel}, ${messageType}, ${body}, ${status}, ${result.requestId || null}, ${sentBy})
    RETURNING *
  `;

  if (!result.success) throw new Error(result.error || 'Failed to send message');
  return rows[0] as PatientMessage;
}

// ─── Appointment reminders ────────────────────────────────────────────────────

export async function sendAppointmentReminders(
  clinicId: string,
  targetDate: string,
  clinicName: string = 'our clinic'
): Promise<{ sent: number; failed: number; skipped: number }> {
  const sql = getDb();
  const cId = parseInt(clinicId);

  const appointments = await sql`
    SELECT
      a.id, a.patient_id, a.walk_in_name, a.walk_in_phone,
      a.doctor_name, a.date, a.start_time, a.visit_type,
      p.name as patient_name, p.phone_number as patient_phone
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    WHERE a.clinic_id = ${cId}
      AND a.date = ${targetDate}
      AND a.status IN ('SCHEDULED', 'CONFIRMED')
  `;

  const templateName = process.env.MSG91_WA_TEMPLATE_REMINDER || '';
  let sent = 0, failed = 0, skipped = 0;

  for (const appt of appointments) {
    const fullName = appt.patient_name || appt.walk_in_name || 'Patient';
    const firstName = fullName.split(' ')[0];
    const phone = appt.patient_phone || appt.walk_in_phone;

    if (!phone) { skipped++; continue; }

    const time = formatTime(appt.start_time);
    const date = formatDate(appt.date);
    const visitType = appt.visit_type || 'Consultation';
    // SMS fallback body
    const body = `Hi ${firstName}, reminder: your ${visitType} appointment at ${clinicName} is on ${date} at ${time}. Reply STOP to opt out.`;

    // Template params: {{1}}=name, {{2}}=clinic, {{3}}=visitType, {{4}}=date, {{5}}=time
    const params = [firstName, clinicName, visitType, date, time];

    try {
      let result: { success: boolean; requestId?: string; error?: string };
      let actualChannel: MessageChannel = 'whatsapp';

      if (templateName) {
        result = await sendWhatsApp(phone, templateName, params);
        if (!result.success) {
          result = await sendSMS(phone, body);
          actualChannel = 'sms';
        }
      } else {
        result = await sendSMS(phone, body);
        actualChannel = 'sms';
      }

      const status = result.success ? 'sent' : 'failed';
      if (appt.patient_id) {
        await sql`
          INSERT INTO patient_messages (clinic_id, patient_id, channel, message_type, body, status, msg91_request_id, sent_by)
          VALUES (${cId}, ${appt.patient_id}, ${actualChannel}, 'appointment_reminder', ${body}, ${status}, ${result.requestId || null}, 'system')
        `;
      }
      if (result.success) { sent++; } else { failed++; }
    } catch {
      failed++;
    }
  }

  return { sent, failed, skipped };
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}
