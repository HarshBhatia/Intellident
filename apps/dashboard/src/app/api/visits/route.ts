import { NextResponse } from 'next/server';
import { getDb } from '@intellident/api';
import { auth } from '@clerk/nextjs/server';
import { getClinicId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    const sql = getDb();
    
    let query;
    if (patientId) {
      // Fetch visits for a specific patient (Timeline)
      query = sql`
        SELECT * FROM visits 
        WHERE clinic_id = ${clinicId} AND patient_id = ${patientId}
        ORDER BY date DESC, created_at DESC
      `;
    } else {
      // Fetch recent visits for the dashboard
      query = sql`
        SELECT v.*, p.name as patient_name, p.patient_id as patient_readable_id
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.clinic_id = ${clinicId}
        ORDER BY v.date DESC, v.created_at DESC
        LIMIT 50
      `;
    }

    const rows = await query;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fetch visits error:', error);
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const body = await request.json();
    const { 
      patient_id, date, doctor, visit_type, symptoms, diagnosis, 
      treatment_plan, treatment_done, tooth_number, 
      medicine_prescribed, notes, cost, paid 
    } = body;

    const sql = getDb();
    
    // Verify patient belongs to clinic
    const patientCheck = await sql`SELECT id FROM patients WHERE id = ${patient_id} AND clinic_id = ${clinicId}`;
    if (patientCheck.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const result = await sql`
      INSERT INTO visits (
        clinic_id, patient_id, date, doctor, visit_type,
        symptoms, diagnosis, treatment_plan, treatment_done, 
        tooth_number, medicine_prescribed, notes, cost, paid
      ) VALUES (
        ${clinicId}, ${patient_id}, ${date}, ${doctor}, ${visit_type || 'Consultation'},
        ${symptoms}, ${diagnosis}, ${treatment_plan}, ${treatment_done}, 
        ${tooth_number}, ${medicine_prescribed}, ${notes}, ${cost || 0}, ${paid || 0}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Create visit error:', error);
    return NextResponse.json({ error: 'Failed to create visit' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const sql = getDb();
    await sql`DELETE FROM visits WHERE id = ${id} AND clinic_id = ${clinicId}`;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete visit error:', error);
    return NextResponse.json({ error: 'Failed to delete visit' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: 'No clinic selected' }, { status: 400 });

    const body = await request.json();
    const { 
      id, date, doctor, visit_type, symptoms, diagnosis, 
      treatment_plan, treatment_done, tooth_number, 
      medicine_prescribed, notes, cost, paid 
    } = body;

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const sql = getDb();
    const result = await sql`
      UPDATE visits SET
        date = ${date},
        doctor = ${doctor},
        visit_type = ${visit_type},
        symptoms = ${symptoms},
        diagnosis = ${diagnosis},
        treatment_plan = ${treatment_plan},
        treatment_done = ${treatment_done},
        tooth_number = ${tooth_number},
        medicine_prescribed = ${medicine_prescribed},
        notes = ${notes},
        cost = ${cost},
        paid = ${paid}
      WHERE id = ${id} AND clinic_id = ${clinicId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Visit not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Update visit error:', error);
    return NextResponse.json({ error: 'Failed to update visit' }, { status: 500 });
  }
}
