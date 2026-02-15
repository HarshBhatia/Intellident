import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            symptoms: {
              type: "array",
              items: { type: "string" }
            },
            diagnosis: { type: "string" },
            treatment_plan: { type: "string" },
            notes: { type: "string" }
          },
          required: ["symptoms", "diagnosis", "treatment_plan", "notes"]
        }
      }
    });

    const prompt = "Analyze this doctor-patient consultation audio and extract clinical information into the specified JSON format.";

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "audio/aac", // Standard for m4a
          data: base64Audio
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Attempt to parse JSON from the response text
    let jsonResponse;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonResponse = JSON.parse(jsonMatch[0]);
      } else {
        jsonResponse = { raw_text: text };
      }
    } catch (e) {
      jsonResponse = { raw_text: text };
    }

    return NextResponse.json(jsonResponse);

  } catch (error) {
    console.error('Error generating notes:', error);
    return NextResponse.json({ error: 'Failed to process audio' }, { status: 500 });
  }
}
