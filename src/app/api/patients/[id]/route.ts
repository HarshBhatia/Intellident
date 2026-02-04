import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Patient } from '@/types';

// Helper to get ID from params
async function getId(params: { id: string }) {
    return params.id;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const sql = getDb();
        
        const rows = await sql`SELECT * FROM patients WHERE patient_id = ${id}`;
        
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }
        
        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body: Patient = await request.json();
        const sql = getDb();

        await sql`
            UPDATE patients SET
                name = ${body.name},
                age = ${body.age},
                amount = ${body.amount},
                date = ${body.date},
                doctor = ${body.doctor},
                gender = ${body.gender},
                mode_of_payment = ${body.mode_of_payment},
                paid_for = ${body.paid_for},
                phone_number = ${body.phone_number},
                medicine_prescribed = ${body.medicine_prescribed},
                notes = ${body.notes},
                patient_type = ${body.patient_type},
                share = ${body.share},
                tooth_number = ${body.tooth_number},
                treatment_done = ${body.treatment_done},
                xrays = ${body.xrays},
                payments = ${body.payments}
            WHERE patient_id = ${id}
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const sql = getDb();
        await sql`DELETE FROM patients WHERE patient_id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
    }
}
