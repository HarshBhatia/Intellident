import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { getAuthContext, getClinicId, verifyMembership } from '@/lib/auth';
import { getDb } from '@intellident/api';

const AI_RATE_LIMIT_PER_HOUR = 20; // Allow 20 AI parses per hour per clinic

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  const { userId, userEmail } = await getAuthContext();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

  // Security: Verify user is actually a member of this clinic
  if (!userEmail || !(await verifyMembership(clinicId, userEmail, userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sql = getDb();
  const cId = typeof clinicId === 'string' ? parseInt(clinicId) : clinicId;

  // Rate Limiting: Check usage in last hour
  try {
    const recentUsage = await sql`
      SELECT COUNT(*) as count FROM usage_logs 
      WHERE clinic_id = ${cId} 
      AND feature = 'AI_NOTES' 
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    
    if (parseInt(recentUsage[0].count) >= AI_RATE_LIMIT_PER_HOUR) {
      await sql`
        INSERT INTO usage_logs (clinic_id, user_id, feature, status) 
        VALUES (${cId}, ${userId}, 'AI_NOTES', 'RATE_LIMITED')
      `;
      return NextResponse.json({ 
        error: 'Too many AI requests. Please wait a while before trying again.' 
      }, { status: 429 });
    }
  } catch (e) {
    console.error('Rate limit check failed:', e);
    // Continue anyway to not block user if logging fails
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const contentType = request.headers.get('content-type') || '';
    let textToAnalyze = "";

    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('audio') as File;

        if (!file) return NextResponse.json({ error: 'No audio' }, { status: 400 });
        
        // Security: Size limit (10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Audio file too large (max 10MB)' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = "Analyze this doctor-patient consultation audio and extract clinical information.";
        
        const result = await model.generateContent([
            { inlineData: { mimeType: "audio/aac", data: base64Audio } },
            { text: prompt }
        ]);
        const response = await result.response;
        textToAnalyze = response.text();
    } else {
        const body = await request.json();
        textToAnalyze = body.text;
        // Basic length limit for text
        if (textToAnalyze && textToAnalyze.length > 5000) {
            return NextResponse.json({ error: 'Text too long' }, { status: 400 });
        }
    }

    if (!textToAnalyze) return NextResponse.json({ error: 'No input' }, { status: 400 });

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

    const extractionPrompt = `Extract dental data from: "${textToAnalyze}". 
    Guidelines: 
    - clinical_findings: detailed symptoms/diagnosis.
    - procedure_notes: steps taken.
    - medicine_prescribed: names and dosages.
    - tooth_number: List separated by commas. Use 1-8 for permanent (Adult) teeth, and A-E for deciduous (Child) teeth.
    - visit_type: Consultation, Procedure, Follow-up, Other.
    - cost: number.`;

    const result = await model.generateContent(extractionPrompt);
    const response = await result.response;
    const structuredData = JSON.parse(response.text());

    // Log successful usage
    sql`
      INSERT INTO usage_logs (clinic_id, user_id, feature, status, metadata) 
      VALUES (${cId}, ${userId}, 'AI_NOTES', 'SUCCESS', ${JSON.stringify({ inputLength: textToAnalyze.length })})
    `.catch(console.error);

    return NextResponse.json(structuredData);

  } catch (error: any) {
    console.error('AI generation error:', error);
    sql`
      INSERT INTO usage_logs (clinic_id, user_id, feature, status, metadata) 
      VALUES (${cId}, ${userId}, 'AI_NOTES', 'FAILED', ${JSON.stringify({ error: error.message })})
    `.catch(console.error);
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500 });
  }
}
