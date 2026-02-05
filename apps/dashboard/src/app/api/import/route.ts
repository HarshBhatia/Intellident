import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const CSV_DATA = `Name,Age,Amount,Date,Doctor,Gender,Mode of Payment,Paid for,Patient ID,Phone Number,medicine prescribed,notes,patient type,share,tooth number,treatment done
priya,45,"₹2,000.00",18/12/2025,Dr Zaheen Eqbal,F,"Cash, UPI",,1,+919244259094,"amoxiclav-625 BDx3, zerodol-SP BDx3",,N,100%,full mouth,scaling
Ram Kishore,56,₹200.00,18/12/2025,Dr Zaheen Eqbal,M,Cash,,2,,"amoxiclav-625 BDx3, zerodol-SP BDx3",,N,100%,full mouth,oral examination
Phool Singh,40,,19/12/2025,Dr Zaheen Eqbal,M,,,3,+919669261440,"amoxiclav-625 BDx3, zerodol-SP BDx3",,N,,,treatment explanation
Ram Kishore,56,"₹1,500.00",19/12/2025,Dr Zaheen Eqbal,M,Cash,,2,,,,O,100%,36,extraction
kk sharma,82,₹300.00,24/12/2025,Dr Zaheen Eqbal,M,Cash,,4," ","amoxiclav-625 BDx3, zerodol-SP BDx3",,N,100%,,oral examination
tabassum,36,"₹2,800.00",24/12/2025,Dr Ekta Tiwari,F,Cash,"consultation 300, RCT 2500",5,+919981342240,"amoxiclav-625 BDx3, pantop Dsr, zerodol-SP BDx3",,N,50%,17,Access opening
pankaj Kumar,34,₹200.00,25/12/2025,Dr Zaheen Eqbal,M,UPI,,6,+917989617434,,,N,100%,,oral examination
anita batham,45,₹150.00,25/12/2025,Dr Zaheen Eqbal,F,Cash,,7,+918359822023,"amoxiclav-625 BDx3, zerodol-SP BDx3",,N,100%,,oral examination
Shila Rana,60,₹200.00,26/12/2025,Dr Zaheen Eqbal,F,Cash,,8,+918463040103,"amoxiclav-625 BDx3, zerodol-SP BDx3",,N,,27,oral examination
rohit singh,28,"₹3,300.00",26/12/2025,Dr Zaheen Eqbal,M,UPI,"consultation 300, Scaling 3000",9,+919617588331,,,N,100%,,"oral examination, scaling"
tabassum,36,,26/12/2025,Dr Ekta Tiwari,F,,,5,,,"palatal 20.5,  M- 18, D 21",O,,17,"BMP, palatal"
babu shona kumar,24,₹200.00,28/12/2025,Dr Zaheen Eqbal,M,,,10,,chymoral forte,,N,,,oral examination
"ketki ",80,₹200.00,30/12/2025,Dr Zaheen Eqbal,F,,,11,,,,,100%,,oral examination
laksmi yadav,60,₹300.00,31/12/2025,Dr Zaheen Eqbal,F,,,13,+919893241372,"chymoral forte, zerodol-SP BDx3",,N,100%,36,"food debridement, oral examination"
rakhi kumari,16,₹500.00,02/01/2026,Dr Zaheen Eqbal,F,UPI,"consultation 300, X-ray 200",14,9618612511,,,N,100%,,"oral examination, xray"
bunty prajapati,38,₹500.00,05/01/2026,Dr Zaheen Eqbal,M,UPI,"consultation 300, X-ray 200",16,+919977699582,,,N,100%,,"oral examination, xray"
rekha gehlot,35,₹500.00,05/01/2026,Dr Zaheen Eqbal,F,UPI,"consultation 300, X-ray 200",17,+917974851368,,"calulus, proximal caries ",N,100%,46,"oral examination, xray"
samta bai,75,₹300.00,07/01/2026,Dr Zaheen Eqbal,F,Cash,constulation 300,18,,"bicasule, chymoral forte",,,100%,,oral examination
"seema ",,₹300.00,30/12/2025,Dr Zaheen Eqbal,F,,consultation,12,+919754581755,"Multivitamin, amoxiclav-625 BDx3, zerodol-SP BDx3",,N,,,oral examination
dilip bhaiyya,,,09/01/2026,Dr Ekta Tiwari,M,Cash,,19,,,"18,",,,"31, 32",
tabassum,,"₹1,000.00",09/01/2026,Dr Ekta Tiwari,F,Cash,rct,5,,,,,,,
kanti singh,50,₹500.00,13/01/2026,Dr Zaheen Eqbal,F,Cash,"consultation 300, X-ray 200",20,+916232976629,"Allpar-p, clavoll-625",,N,100%,,oral examination
,,₹700.00,04/01/2026,Dr Zaheen Eqbal,M,Cash,denture relining 700,15,,,,N,100%,mandibular,denture  relining
kanti singh,50,"₹1,000.00",14/01/2026,Dr Zaheen Eqbal,F,Cash,extraction 1000,20,+916232976629,,,O,100%,36,extraction
dharam singh tomar,65,₹200.00,14/01/2026,,M,Cash,medicine 200,21,+919617657641,,,N,,,medicines
daram singh,65,₹400.00,14/01/2026,,M,Cash,extraction 400,21,,,,O,,,extraction
tabassum,,"₹500.00",14/01/2026,Dr Ekta Tiwari,F,Cash,rct 500,5,,,,O,,17,"obturation, post op restoration"
vikram,20,₹500.00,15/01/2026,Dr Zaheen Eqbal,M,Cash,"XRAY 200,  oral examination  300",22,+919754691834,"elegesic sp, elymox cv 625, metrogyl 400",,N,,46,"Access opening, oral examination, xray"
vikram,20,₹500.00,16/01/2026,,M,Cash,access opening 500,22,,,,O,,46,
tabassum,36,₹500.00,16/01/2026,,F,Cash,crown 500,5,,,,O,,,
manya,5,₹300.00,17/01/2026,,F,Cash,consultation 300,23,7987189001,,,N,,,oral examination
nazma khan,23,₹500.00,17/01/2026,Dr Zaheen Eqbal,F,Cash,"consultation 300, crown 200",24,+918871311640,,,N,,11,crown
mamta kustwae,55,"₹1,000.00",17/01/2026,Dr Zaheen Eqbal,F,UPI,"consultation 200, extraction 800",25,,"clavoll-625, elegesic sp",,N,,31,extraction
munni bai,,"₹1,300.00",19/01/2026,Dr Zaheen Eqbal,F,,"consultation 300, extraction 1000",26,7415951342,"clavoll-625, elegesic sp, metrogyl 400",,N,,,extraction
nazma khan,23,"₹1,950.00",20/01/2026,Dr Zaheen Eqbal,F,,crown 1950,24,,,,O,,,
vikram,20,₹500.00,20/01/2026,Dr Ekta Tiwari,M,Cash,rct 500,22,,,"f2, D-21.5, ML-20, MB-20.5",O,,46,BMP
rekha kushwah,29,₹500.00,22/01/2026,Dr Zaheen Eqbal,F,Cash,"consultation 300, X-ray 200",27,8349302289,,,N,,38,"oral examination, xray"
kanchan pal,21,"₹2,500.00",23/01/2026,"Dr Ekta Tiwari, Dr Zaheen Eqbal",F,UPI,"consultation 300, Xray 200, rct 2000",28,6261297658,metrogyl 400,f2,N,,"35, 38","Access opening, oral examination, xray"
thakurilal,50,₹500.00,23/01/2026,Dr Zaheen Eqbal,M,Cash,extraction 500,29,8879227027,,,N,,"15, 16","extraction, oral examination"
sweety verma,32,₹300.00,25/01/2026,Dr Zaheen Eqbal,F,Cash,consultation 300,30,9072785798,dologel ct,,N,,,oral examination
"kamlesh ",36,"₹1,000.00",26/01/2026,Dr Zaheen Eqbal,F,Cash,extraction 1000,31,9753132921,clavoll-625,,N,,,extraction
"joha ",31,₹200.00,26/01/2026,Dr Zaheen Eqbal,F,Cash,x ray 200,32,,,,N,,,"oral examination, xray"
ashok tiwari,59,₹500.00,27/01/2026,Dr Zaheen Eqbal,M,Cash,"consultaion 300, x ray 200",33,9755423184,"chymoral forte, elegesic sp",,N,,,"oral examination, xray"
mishti dandotya,6,₹500.00,27/01/2026,Dr Zaheen Eqbal,F,Cash,"consultation 300, xray 200",34,9009177276,"ibugesic, syp augmentin, syp flagyl 125",,N,,"84, 85","oral examination, xray"
Kanchan pal,21,"₹2,000.00",27/01/2026,"Dr Ekta Tiwari, Dr Zaheen Eqbal",F,UPI,rct 2000,28,,,,O,,,BMP
liyakat ali,60,₹700.00,29/01/2026,Dr Zaheen Eqbal,M,Cash,"xray 200, extraction 500",35,,"clavoll-625, elegesic sp",36 root stump,N,,"35, 36","extraction, xray"
maya,60,₹200.00,30/01/2026,Dr Zaheen Eqbal,F,Cash,extraction 200,36,,,,,,"32, 33",extraction
gungun,10,"₹1,500.00",30/01/2026,Dr Zaheen Eqbal,F,UPI,"consultation 300, xray 200, extraction 1000",37,,"ibugesic, syp augmentin, syp flagyl 125",,N,,84,"extraction, oral examination, xray"
"reena ",60,"₹3,500.00",30/01/2026,Dr Zaheen Eqbal,F,Cash,"extraction 2400, prosthesis removal ",38,,"clavoll-625, elegesic sp",,N,,"32, 33, 41, 42, 43","extraction, prosthesis removal"
sajay bansal,51,₹500.00,02/02/2026,Dr Zaheen Eqbal,M,Cash,"consultation 300, xray 200",39,,,,N,,,"oral examination, xray"
"vikram ",20,₹500.00,02/02/2026,Dr Ekta Tiwari,M,Cash,rct 500,22,,,,O,,,BMP
,,,,,,,,40,,,,,,,
`;

// Robust CSV Parser (State Machine)
function parseCSV(text: string) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote ("\"") -> literal quote
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

export async function GET() {
    try {
        const rawRows = parseCSV(CSV_DATA);
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
                    doctor: doctor,
                    patient_type: type,
                    share: share,
                    tooth_number: new Set(),
                    treatment_done: new Set(),
                    medicine_prescribed: new Set(),
                    notes: new Set(),
                    payments: [],
                    total_amount: 0,
                    last_date: ''
                };
            }
            
            const p = grouped[cleanId];
            
            // Update latest info
            if (name) p.name = name.replace(/"/g, '');
            if (phone) p.phone_number = phone;
            if (doctor) p.doctor = doctor;
            
            const isoDate = parseDate(date);
            p.last_date = isoDate;
            
            if (treatment) p.treatment_done.add(treatment);
            if (tooth) p.tooth_number.add(tooth);
            if (meds) p.medicine_prescribed.add(meds);
            if (notes) p.notes.add(notes);
            
            const amt = cleanAmount(amountRaw);
            if (amt > 0) {
                p.payments.push({
                    id: Math.random().toString(36).substr(2, 9),
                    date: isoDate,
                    amount: amt,
                    purpose: paid_for || treatment || 'Visit',
                    mode: mode || 'Cash'
                });
                p.total_amount += amt;
            }
        }
        
        const insertPromises = Object.values(grouped).map(async (p) => {
            if (!p.name) return;
            
            const treatments = Array.from(p.treatment_done).join(', ');
            const teeth = Array.from(p.tooth_number).join(', ');
            const meds = Array.from(p.medicine_prescribed).join(', ');
            const notes = Array.from(p.notes).join('; ');
            const paymentsJson = JSON.stringify(p.payments);
            
            await sql`
                INSERT INTO patients (
                    patient_id, name, age, amount, date, doctor, gender, 
                    phone_number, medicine_prescribed, notes, 
                    patient_type, share, tooth_number, treatment_done, payments
                ) VALUES (
                    ${p.patient_id}, ${p.name}, ${p.age}, ${p.total_amount}, ${p.last_date}, ${p.doctor}, ${p.gender},
                    ${p.phone_number}, ${meds}, ${notes},
                    ${p.patient_type}, ${p.share}, ${teeth}, ${treatments}, ${paymentsJson}
                )
                ON CONFLICT (patient_id) DO NOTHING
            `;
        });
        
        await Promise.all(insertPromises);
        
        return NextResponse.json({ message: `Imported ${insertPromises.length} unique patients` });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'Import failed', details: e?.toString() || 'Unknown error' }, { status: 500 });
    }
}
