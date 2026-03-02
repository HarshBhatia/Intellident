import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
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

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
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
      model: "gemini-3-flash-preview",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            diagnosis: { type: SchemaType.STRING },
            symptoms: { type: SchemaType.STRING },
            treatment_done: { type: SchemaType.STRING },
            treatment_plan: { type: SchemaType.STRING },
            medicine_prescribed: { type: SchemaType.STRING },
            tooth_number: { type: SchemaType.STRING },
            visit_type: { 
                type: SchemaType.STRING,
                description: "Must be one of: Consultation, Procedure, Follow-up, Other"
            },
            cost: { type: SchemaType.NUMBER }
          },
          required: ["diagnosis", "visit_type"]
        }
      }
    });

    const extractionPrompt = `Extract dental clinical data from this text: "${textToAnalyze}". 
    Categorize into: diagnosis, symptoms, treatment_done, treatment_plan, medicine_prescribed, tooth_number, visit_type, and cost.
    If multiple teeth are mentioned, list them separated by commas (e.g. 17, 18).
    If no cost is mentioned, default to 0.`;

    const result = await model.generateContent(extractionPrompt);
    const response = await result.response;
    const structuredData = JSON.parse(response.text());

    return NextResponse.json(structuredData);

  } catch (error: any) {
    console.error('Error generating notes:', error);
    return NextResponse.json({ error: 'Failed to process notes', details: error.message }, { status: 500 });
  }
}