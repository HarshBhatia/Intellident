# Specification: WhatsApp & SMS Notification System

## 1. Overview
The goal is to enable dental clinics to communicate with patients via WhatsApp and SMS. The system supports the following primary use cases:
1. **On-Demand Messaging**: Manual messages sent by staff from the dashboard.
2. **Automated Reminders**: Scheduled notifications for upcoming appointments (e.g., 24 hours before).
3. **Review Requests**: Automated or manual requests asking patients for a Google Review after a completed visit.
4. **Document Sharing**: Securely sending links or media files for Invoices, Receipts, and Prescriptions (Rx) directly to the patient's phone.

## 2. Technical Stack
- **Provider**: Twilio (Messaging API & WhatsApp Business API).
- **Backend**: Next.js API Routes (Serverless).
- **Background Jobs**: Vercel Cron Jobs or Upstash QStash (for scheduling).
- **Database**: PostgreSQL (Existing Neon/PGlite setup).
- **Storage (for Document Sharing)**: Vercel Blob or AWS S3 (for temporarily hosting PDFs so Twilio can send them as media, or generating secure, expiring links).

## 3. Database Schema Updates
We need to track notification status, clinic-specific configurations, and message logs.

### New Tables
#### `notification_settings`
Configures preferences per clinic.
- `id` (SERIAL PRIMARY KEY)
- `clinic_id` (INT, FK to clinics, UNIQUE)
- `sms_enabled` (BOOLEAN, default: false)
- `whatsapp_enabled` (BOOLEAN, default: false)
- `twilio_sid` (TEXT, optional) - If allowing clinics to use their own credentials.
- `twilio_auth_token` (TEXT, optional)
- `reminder_template` (TEXT) - e.g., "Hi {{patient_name}}, this is a reminder for your appointment at {{clinic_name}} on {{date}} at {{time}}."
- `review_request_template` (TEXT) - e.g., "Hi {{patient_name}}, thank you for visiting {{clinic_name}}. We'd love your feedback: {{google_review_link}}"
- `google_review_link` (TEXT) - The specific Google Business Profile review link for the clinic.

#### `notification_logs`
Tracks every message sent for billing, history, and status tracking.
- `id` (SERIAL PRIMARY KEY)
- `clinic_id` (INT, FK to clinics)
- `patient_id` (INT, FK to patients)
- `visit_id` (INT, FK to visits, optional) - Useful for linking review requests or invoices to a specific visit.
- `type` (ENUM: 'SMS', 'WHATSAPP')
- `category` (ENUM: 'ON_DEMAND', 'REMINDER', 'REVIEW_REQUEST', 'INVOICE', 'PRESCRIPTION')
- `direction` (ENUM: 'OUTBOUND', 'INBOUND')
- `status` (ENUM: 'QUEUED', 'SENT', 'DELIVERED', 'FAILED')
- `provider_sid` (TEXT) - Twilio Message SID.
- `content` (TEXT)
- `media_urls` (TEXT) - JSON array of media URLs sent with the message (e.g., PDF links).
- `created_at` (TIMESTAMP)

## 4. Architecture & Logic

### A. On-Demand Messaging & Document Sharing
1. **Frontend**: 
   - A "Send Message" button in the `PatientDetail` or `PatientTable`.
   - "Share via WhatsApp/SMS" buttons on Invoice and Prescription (Rx) generation screens.
2. **Action**: 
   - For simple text: Opens a modal to type a message.
   - For documents: Generates the PDF, uploads it to a temporary/secure public URL, and attaches it to the message.
3. **API**: `POST /api/notifications/send`
   - Validates clinic membership.
   - Checks `notification_settings` for the clinic.
   - For media, passes the `mediaUrl` parameter to Twilio.
   - Calls Twilio API.
   - Logs the attempt in `notification_logs`.

### B. Scheduled Reminders (The Cron Pattern)
1. **Schedule**: Run every hour (or once daily at 8 AM).
2. **Logic**:
   - Query the `appointments` table for records scheduled for `tomorrow`.
   - Filter for clinics that have `whatsapp_enabled` or `sms_enabled` = true.
   - Check `notification_logs` to prevent duplicates.
   - Generate message content, send via Twilio, and update `notification_logs`.

### C. Automated Review Requests
1. **Trigger**: Can be tied to a visit being marked as "Completed" or triggered via a Cron Job (e.g., "Send review requests for all completed visits from yesterday").
2. **Logic**:
   - Verify the clinic has a `google_review_link` configured.
   - Ensure a review request hasn't already been sent recently to avoid spamming the patient.
   - Send the templated message and log it as `REVIEW_REQUEST`.

## 5. Twilio Integration Details

### WhatsApp Requirements
- **Templates**: Twilio requires "WhatsApp Templates" to be pre-approved by Meta for outbound messages sent outside a 24-hour "session window."
  - We will need approved templates for **Reminders**, **Review Requests**, and **Document Delivery**.
- **Media**: WhatsApp supports sending PDFs. The PDF URL must be publicly accessible (can be obscured/unguessable) for Twilio to download and forward it to WhatsApp.
- **Number**: Clinics will use a shared IntelliDent WhatsApp number or a dedicated Twilio Sender.

### Environment Variables
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_SMS_NUMBER=+1...
TWILIO_WHATSAPP_NUMBER=whatsapp:+1...
```

## 6. API Endpoints

### `POST /api/notifications/send`
**Payload**:
```json
{
  "patientId": 123,
  "visitId": 456, // Optional
  "type": "WHATSAPP", // or "SMS"
  "category": "INVOICE", // Used for logging
  "message": "Here is your invoice for today's visit.",
  "mediaUrls": ["https://url-to-secure-invoice.pdf"] // Optional
}
```

### `GET /api/notifications/logs?patientId=123`
Returns the history of messages for a specific patient.

### `POST /api/notifications/webhooks/twilio`
Receives delivery status updates (Delivered, Read, Failed) from Twilio to update `notification_logs.status`.

## 7. UI/UX Changes
1. **Settings Page**: Add a "Communications" tab to:
   - Enable/disable services.
   - Edit `reminder_template` and `review_request_template`.
   - Set the `google_review_link`.
2. **Patient Detail Page**: Add a "Communication History" component.
3. **Scheduler**: Add an icon to appointment cards indicating if a reminder has been sent.
4. **Visit/Billing Views**: "Share" buttons to directly send PDFs via WhatsApp/SMS.

## 8. Implementation Phases
- **Phase 1**: Infrastructure (Twilio Setup + Database Migration).
- **Phase 2**: Manual SMS/WhatsApp sending & Settings UI.
- **Phase 3**: Document Sharing (Uploading PDFs and sending media messages).
- **Phase 4**: Automated Jobs (Cron for appointment reminders & post-visit review requests).
- **Phase 5**: Webhooks for real-time delivery status updates.
