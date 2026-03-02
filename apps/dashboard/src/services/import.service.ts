import { getDb } from '@intellident/api';
import { Patient, Visit, BillingItem } from '@intellident/api/src/types';

// Robust CSV Parser (State Machine)
function parseCSV(text: string) {
    const rows = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote (""") -> literal quote
                currentCell += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // End of cell
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if (char === '\n' && !insideQuotes) {
            // End of row
            currentRow.push(currentCell.trim());
            if (currentRow.length > 1) { // Skip empty lines
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else if (char === '\r' && !insideQuotes) {
            // Skip CR
        } else {
            currentCell += char;
        }
    }
    // Push last row if exists
    if (currentRow.length > 0 || currentCell) {
        currentRow.push(currentCell.trim());
        if (currentRow.length > 1) rows.push(currentRow);
    }
    
    return rows;
}

function cleanAmount(amt: string) {
    if (!amt) return 0;
    const clean = amt.replace(/[₹, ]/g, '');
    return parseFloat(clean) || 0;
}

function parseDate(d: string) {
    if (!d) return new Date().toISOString().split('T')[0];
    const parts = d.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return d;
}

export async function importPatientsFromCSV(csvData: string, clinicId: string): Promise<{ message: string }> {
    const rawRows = parseCSV(csvData);
    // Skip header row
    const rows = rawRows.slice(1);
    
    const sql = getDb();
    const grouped: Record<string, any> = {};
    
    for (const row of rows) {
        if (row.length < 5) continue; 
        
        // Map by index
        const [
            name, ageStr, amountRaw, date, doctor, gender, mode, paid_for,
            pid, phone, meds, notes, type, share, tooth, treatment
        ] = row;
        
        const cleanId = pid ? `PID-${pid}` : `PID-UNK-${Math.random()}`;
        
        if (!grouped[cleanId]) {
            grouped[cleanId] = {
                patient_id: cleanId,
                name: name.replace(/"/g, ''),
                age: parseInt(ageStr) || 0,
                gender: gender,
                phone_number: phone,
                patient_type: type, // Now a static field
                visits: [] // To store visit data
            };
        }
        
        const p = grouped[cleanId];
        
        // Update latest static info
        if (name) p.name = name.replace(/"/g, '');
        if (phone) p.phone_number = phone;
        if (type) p.patient_type = type;

        // Collect visit specific data
        const isoDate = parseDate(date);
        const amt = cleanAmount(amountRaw);

        const billingItems: BillingItem[] = [];
        if (paid_for && amt > 0) {
          billingItems.push({ description: paid_for, amount: amt });
        } else if (treatment && amt > 0) {
          billingItems.push({ description: treatment, amount: amt });
        } else if (amt > 0) {
          billingItems.push({ description: 'Visit', amount: amt });
        }


        if (doctor || treatment || tooth || meds || notes || amt > 0) {
            p.visits.push({
                date: isoDate,
                doctor: doctor,
                clinical_findings: '',
                procedure_notes: ((treatment || '') + ' ' + (notes || '')).trim(),
                tooth_number: tooth,
                medicine_prescribed: meds,
                cost: amt, // total cost for this visit from the CSV row
                paid: amt, // Assuming paid equals cost for import
                billing_items: billingItems // Use the new billing_items
            });
        }
    }
    
    const insertPromises = Object.values(grouped).map(async (p) => {
        if (!p.name) return;
        
        // Insert/Update Patient
        const patientResult = await sql`
            INSERT INTO patients (
                patient_id, name, age, gender, phone_number, patient_type, clinic_id
            ) VALUES (
                ${p.patient_id}, ${p.name}, ${p.age}, ${p.gender}, ${p.phone_number}, ${p.patient_type}, ${clinicId}
            )
            ON CONFLICT (patient_id, clinic_id) DO UPDATE SET
                name = EXCLUDED.name,
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                phone_number = EXCLUDED.phone_number,
                patient_type = EXCLUDED.patient_type
            RETURNING id
        `;
        const patientId = patientResult[0].id;

        // Insert Visits
        const visitPromises = p.visits.map(async (visit: any) => {
            const serializedBillingItems = visit.billing_items && visit.billing_items.length > 0 ? JSON.stringify(visit.billing_items) : undefined;
            await sql`
                INSERT INTO visits (
                    clinic_id, patient_id, date, doctor, visit_type,
                    clinical_findings, procedure_notes, 
                    tooth_number, medicine_prescribed, cost, paid, 
                    billing_items
                ) VALUES (
                    ${clinicId}, ${patientId}, ${visit.date}, ${visit.doctor}, ${visit.visit_type || 'Consultation'},
                    ${visit.clinical_findings}, ${visit.procedure_notes}, 
                    ${visit.tooth_number}, ${visit.medicine_prescribed}, ${visit.cost || 0}, ${visit.paid || 0},
                    ${serializedBillingItems}
                )
            `;
        });
        await Promise.all(visitPromises);
    });
    
    await Promise.all(insertPromises);
    
    return { message: `Imported ${Object.keys(grouped).length} unique patients and their visits` };
}