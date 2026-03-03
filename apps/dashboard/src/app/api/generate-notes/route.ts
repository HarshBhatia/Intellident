import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { getAuthContext, getClinicId, verifyMembership } from '@/lib/auth';
import { getDb } from '@intellident/api';

const AI_RATE_LIMIT_PER_HOUR = 20;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });

  const { userId, userEmail } = await getAuthContext();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

  if (!userEmail || !(await verifyMembership(clinicId, userEmail, userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sql = getDb();
  const cId = typeof clinicId === 'string' ? parseInt(clinicId) : clinicId;

  try {
    const recentUsage = await sql`
      SELECT COUNT(*) as count FROM usage_logs 
      WHERE clinic_id = ${cId} AND feature = 'AI_NOTES' AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (parseInt(recentUsage[0].count) >= AI_RATE_LIMIT_PER_HOUR) {
      await sql`INSERT INTO usage_logs (clinic_id, user_id, feature, status) VALUES (${cId}, ${userId}, 'AI_NOTES', 'RATE_LIMITED')`;
      return NextResponse.json({ error: 'Too many AI requests. Please wait a while.' }, { status: 429 });
    }
  } catch (e) { console.error('Rate limit check failed:', e); }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const body = await request.json();
    const textToAnalyze = body.text;
    if (!textToAnalyze || textToAnalyze.length > 5000) return NextResponse.json({ error: 'Input too long or missing' }, { status: 400 });

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            clinical_findings: { type: SchemaType.STRING },
            procedure_notes: { type: SchemaType.STRING },
            medicine_prescribed: { type: SchemaType.STRING },
            tooth_number: { type: SchemaType.STRING },
            visit_type: { type: SchemaType.STRING },
            cost: { type: SchemaType.NUMBER }
          },
          required: ["clinical_findings", "visit_type"]
        }
      }
    });

    const extractionPrompt = `Extract dental clinical data from: "${textToAnalyze}". Use 1-8 for Adult, A-E for Child teeth. Return JSON.`;
    const result = await model.generateContent(extractionPrompt);
    const response = await result.response;
    const structuredData = JSON.parse(response.text());

    sql`INSERT INTO usage_logs (clinic_id, user_id, feature, status, metadata) VALUES (${cId}, ${userId}, 'AI_NOTES', 'SUCCESS', ${JSON.stringify({ inputLength: textToAnalyze.length })})`.catch(console.error);
    return NextResponse.json(structuredData);

  } catch (error: any) {
    console.error('AI error:', error);
    sql`INSERT INTO usage_logs (clinic_id, user_id, feature, status, metadata) VALUES (${cId}, ${userId}, 'AI_NOTES', 'FAILED', ${JSON.stringify({ error: error.message })})`.catch(console.error);
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500 });
  }
}
