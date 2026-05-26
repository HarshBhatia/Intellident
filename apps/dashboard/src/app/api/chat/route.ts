import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type Tool } from '@google/generative-ai';
import { withAuth } from '@/lib/api-handler';

// ---------------------------------------------------------------------------
// Single flexible tool — the LLM can call any dashboard API endpoint
// ---------------------------------------------------------------------------
const chatTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'call_api',
        description:
          'Make an authenticated HTTP request to the IntelliDent dashboard API. The request is made with the current user\'s session so all auth and clinic scoping is handled automatically. Use this to fetch any data visible in the dashboard.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            method: {
              type: SchemaType.STRING,
              description: 'HTTP method — GET, POST, PUT, or DELETE',
            },
            path: {
              type: SchemaType.STRING,
              description:
                'API path including query parameters. Examples: /api/patients, /api/visits?patientId=5, /api/appointments?date=2025-05-25',
            },
            body: {
              type: SchemaType.STRING,
              description:
                'JSON-encoded request body for POST/PUT requests. Omit for GET/DELETE.',
            },
          },
          required: ['method', 'path'],
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// System prompt — teaches the model about every available endpoint
// ---------------------------------------------------------------------------
function buildSystemPrompt(): string {
  const today = new Date().toISOString().split('T')[0];
  return `You are IntelliDent AI, a helpful assistant for a dental clinic management dashboard.
You have a tool called "call_api" that lets you make authenticated requests to the dashboard's REST API on behalf of the current user. The request carries their session automatically, so all data is scoped to their clinic.

Today's date is ${today}.

## Available API Endpoints

### Patients
- GET /api/patients
  Returns all active patients with computed fields: patient_id, name, age, gender, phone_number, last_visit, visit_count, balance (outstanding), lifetime_value, next_visit.
- GET /api/patients/<patient_id>   (e.g. /api/patients/PID-1)
  Returns full patient record plus their visits array and doctors list.

### Visits
- GET /api/visits
  Returns the 50 most recent visits across all patients (includes patient_name).
- GET /api/visits?patientId=<numeric_id>
  Returns all visits for a specific patient (use the numeric id from the patient record, not PID-X).

### Appointments
- GET /api/appointments?date=YYYY-MM-DD
  Returns all appointments for a given date. Optional: &doctor=<email>.
- GET /api/appointments/dates?year=YYYY&month=M
  Returns an array of dates that have appointments in the given month.

### Expenses
- GET /api/expenses
  Returns all expenses (date, amount, category, description).
- GET /api/expenses/categories
  Returns expense category list.

### Clinic
- GET /api/clinic?id=current
  Returns current clinic info (name, address, phone, currency, GST details, etc.).
- GET /api/clinic/members
  Returns all clinic members. Use ?role=DOCTOR to filter to doctors only.
- GET /api/clinic/treatments
  Returns the list of treatment types configured for this clinic.

### Auth
- GET /api/auth/role
  Returns the current user's role in this clinic (OWNER, ADMIN, DOCTOR, RECEPTIONIST).

## Guidelines
- Be concise and clear. Use markdown tables for tabular data.
- Format currency amounts with the appropriate symbol.
- When asked about earnings or revenue, compute totals from the visits data (sum the "paid" field). For expenses, use the expenses endpoint.
- When asked about a patient by name, first GET /api/patients to find them, then GET /api/patients/<patient_id> for details.
- Default to the current month when no date range is specified.
- Never fabricate data — only report what the API returns.
- For write operations (POST/PUT/DELETE), confirm with the user before executing.`;
}

// ---------------------------------------------------------------------------
// Execute the call_api tool — internal fetch with forwarded auth cookies
// ---------------------------------------------------------------------------
async function executeApiCall(
  originRequest: Request,
  method: string,
  path: string,
  body?: string
): Promise<any> {
  const origin = new URL(originRequest.url).origin;
  const url = `${origin}${path.startsWith('/') ? path : '/' + path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward auth cookies so the internal request runs as the same user
  const cookie = originRequest.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;

  // Forward Clerk auth header if present
  const auth = originRequest.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  const res = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' && method !== 'DELETE' && body ? body : undefined,
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: res.status, body: text };
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export const POST = withAuth(async (request: Request, { clinicId }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: 'messages array is required' },
      { status: 400 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(),
    tools: chatTools,
  });

  // Build Gemini chat history from all messages except the last one
  const history = messages.slice(0, -1).map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({ history });
  const lastMessage = messages[messages.length - 1].content;

  // Send the user message and handle the function-calling loop
  let response = await chat.sendMessage(lastMessage);
  let result = response.response;

  // Loop: execute tool calls until the model returns plain text (max 8 rounds)
  for (let i = 0; i < 8; i++) {
    const calls = result.functionCalls();
    if (!calls || calls.length === 0) break;

    const functionResponses = [];
    for (const call of calls) {
      const args = call.args as Record<string, any>;
      let data;
      try {
        data = await executeApiCall(
          request,
          args.method || 'GET',
          args.path || '/api/health',
          args.body
        );
      } catch (err: any) {
        data = { error: err.message || 'API call failed' };
      }
      functionResponses.push({
        functionResponse: { name: call.name, response: { result: data } },
      });
    }

    response = await chat.sendMessage(functionResponses);
    result = response.response;
  }

  const text = result.text();
  return NextResponse.json({ message: text });
});
