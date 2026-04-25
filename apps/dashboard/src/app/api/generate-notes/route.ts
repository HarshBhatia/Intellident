import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { withAuth } from '@/lib/api-handler';
import { getDb } from '@intellident/api';

const AI_RATE_LIMIT_PER_HOUR = 20;

export const POST = withAuth(async (request: Request, { clinicId, userId }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });

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
  } catch (e) {
    // Rate limit check failed, continue anyway
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const body = await request.json();
  const textToAnalyze = body.text;
  if (!textToAnalyze || textToAnalyze.length > 5000) {
    return NextResponse.json({ error: 'Input too long or missing' }, { status: 400 });
  }

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

  sql`INSERT INTO usage_logs (clinic_id, user_id, feature, status, metadata) VALUES (${cId}, ${userId}, 'AI_NOTES', 'SUCCESS', ${JSON.stringify({ inputLength: textToAnalyze.length })})`.catch(() => {});
  return NextResponse.json(structuredData);
});
