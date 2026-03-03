import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const contentType = request.headers.get('content-type') || '';
    let textToAnalyze = "";

    // 1. Handle either Audio (FormData) or JSON (Text)
    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('audio') as File;

        if (!file) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = "Analyze this doctor-patient consultation audio and extract clinical information.";
        
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/aac",
                    data: base64Audio
                }
            },
            { text: prompt }
        ]);
        const response = await result.response;
        textToAnalyze = response.text();
    } else {
        const body = await request.json();
        textToAnalyze = body.text;
    }

    if (!textToAnalyze) {
        return NextResponse.json({ error: 'No text to analyze' }, { status: 400 });
    }

    // 2. Use Gemini to parse text into structured JSON
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            clinical_findings: { 
                type: SchemaType.STRING,
                description: "Clinical findings, diagnosis, and symptoms observed"
            },
            procedure_notes: { 
                type: SchemaType.STRING, 
                description: "Details of the procedure performed or general notes"
            },
            medicine_prescribed: { type: SchemaType.STRING },
            tooth_number: { type: SchemaType.STRING },
            visit_type: { 
                type: SchemaType.STRING,
                description: "Must be one of: Consultation, Procedure, Follow-up, Other"
            },
            cost: { type: SchemaType.NUMBER }
          },
          required: ["clinical_findings", "visit_type"]
        }
      }
    });

    const extractionPrompt = `Extract detailed dental clinical data from this text: "${textToAnalyze}". 
    
    Guidelines:
    - clinical_findings: Be descriptive. Include specific symptoms, initial observations, and diagnosis (e.g., "Deep distal caries on tooth 17 with associated pulpitis symptoms").
    - procedure_notes: Detail the steps taken during the treatment (e.g., "Caries excavation, pulp capping with MTA, and composite restoration performed").
    - medicine_prescribed: List full names and dosages.
    - tooth_number: List separated by commas.
    - visit_type: Must be one of: Consultation, Procedure, Follow-up, Other.
    - cost: Default to 0 if not mentioned.
    
    Aim for professional, detailed notes that a doctor would find useful for history tracking, but keep it concise.`;

    const result = await model.generateContent(extractionPrompt);
    const response = await result.response;
    const structuredData = JSON.parse(response.text());

    return NextResponse.json(structuredData);

  } catch (error: any) {
    console.error('Error generating notes:', error);
    return NextResponse.json({ error: 'Failed to process notes', details: error.message }, { status: 500 });
  }
}