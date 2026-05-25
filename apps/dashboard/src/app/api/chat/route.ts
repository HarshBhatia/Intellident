import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type Tool } from '@google/generative-ai';
import { withAuth } from '@/lib/api-handler';
import { getPatients, getPatientByIdWithVisits } from '@/services/patient.service';
import { getVisits } from '@/services/visit.service';
import { getClinicStats } from '@/services/stats.service';
import { getAppointmentsByDate } from '@/services/appointment.service';

const chatTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_patients',
        description:
          'Search for patients by name or phone number. Returns matching patients with basic info, last visit, visit count, and outstanding balance.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: 'Patient name or phone number to search for',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_patient_details',
        description:
          'Get detailed information about a specific patient including their full visit history, outstanding balance, and treatment records. Use the patient_id (e.g. PID-1, PID-23).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            patient_id: {
              type: SchemaType.STRING,
              description: 'The patient ID, e.g. PID-1 or PID-23',
            },
          },
          required: ['patient_id'],
        },
      },
      {
        name: 'get_earnings_summary',
        description:
          'Get clinic financial summary: total revenue, total expenses, profit, revenue by treatment category, and monthly revenue trend. Provide a date range.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            start_date: {
              type: SchemaType.STRING,
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: SchemaType.STRING,
              description: 'End date in YYYY-MM-DD format',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_recent_visits',
        description:
          'Get the most recent visits across all patients. Returns visit details including patient name, date, doctor, type, cost, and payment status.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_todays_appointments',
        description:
          "Get today's scheduled appointments with patient names, times, doctor, and status.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: {
              type: SchemaType.STRING,
              description:
                'Date in YYYY-MM-DD format. Defaults to today if not provided.',
            },
          },
        },
      },
    ],
  },
];

async function executeTool(
  name: string,
  args: Record<string, any>,
  clinicId: string
): Promise<any> {
  switch (name) {
    case 'search_patients': {
      const patients = await getPatients(clinicId);
      const q = (args.query || '').toLowerCase();
      return patients
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.phone_number && p.phone_number.includes(q)) ||
            (p.patient_id && p.patient_id.toLowerCase().includes(q))
        )
        .slice(0, 10)
        .map((p) => ({
          patient_id: p.patient_id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          phone: p.phone_number,
          last_visit: (p as any).last_visit,
          visit_count: (p as any).visit_count,
          balance: (p as any).balance,
        }));
    }
    case 'get_patient_details': {
      const data = await getPatientByIdWithVisits(clinicId, args.patient_id);
      if (!data) return { error: 'Patient not found' };
      // Trim visits to avoid token bloat
      if (data.visits) {
        data.visits = data.visits.slice(0, 15).map((v: any) => ({
          date: v.date,
          doctor: v.doctor,
          visit_type: v.visit_type,
          clinical_findings: v.clinical_findings,
          procedure_notes: v.procedure_notes,
          tooth_number: v.tooth_number,
          medicine_prescribed: v.medicine_prescribed,
          cost: v.cost,
          paid: v.paid,
        }));
      }
      return data;
    }
    case 'get_earnings_summary': {
      const start = new Date(args.start_date);
      const end = new Date(args.end_date);
      return await getClinicStats(clinicId, start, end);
    }
    case 'get_recent_visits': {
      const visits = await getVisits(clinicId);
      return (visits as any[]).slice(0, 20).map((v) => ({
        patient_name: v.patient_name,
        date: v.date,
        visit_type: v.visit_type,
        doctor: v.doctor,
        cost: v.cost,
        paid: v.paid,
        procedure_notes: v.procedure_notes,
      }));
    }
    case 'get_todays_appointments': {
      const date =
        args.date || new Date().toISOString().split('T')[0];
      return await getAppointmentsByDate(clinicId, date);
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

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
  const today = new Date().toISOString().split('T')[0];

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: [
      'You are IntelliDent AI, a helpful assistant for a dental clinic management dashboard.',
      'You can look up patient records, visit history, appointments, and financial data using the tools available.',
      'Be concise and clear. Format currency amounts properly. Use tables or bullet points when listing data.',
      'If the user asks about a patient, search for them first, then get details if needed.',
      `Today's date is ${today}.`,
      'When asked about earnings/revenue without a specific date range, default to the current month.',
      'Never make up data — only use what the tools return.',
    ].join(' '),
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

  // Loop: execute any function calls until the model returns plain text (max 6 rounds)
  for (let i = 0; i < 6; i++) {
    const calls = result.functionCalls();
    if (!calls || calls.length === 0) break;

    const functionResponses = [];
    for (const call of calls) {
      let data;
      try {
        data = await executeTool(call.name, call.args as Record<string, any>, clinicId);
      } catch (err: any) {
        data = { error: err.message || 'Tool execution failed' };
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
