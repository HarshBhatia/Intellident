import { getDb } from '@intellident/api';
import { initializeDatabase } from '@intellident/api/src/init-db';

const TEST_USER_EMAIL = 'test+clerk_test@example.com';
const TEST_USER_ID = 'user_3AVkSYQbMFyU6TTnzCf1hA9ASeo';

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function billing(items: { description: string; amount: number }[]) {
  return JSON.stringify(items);
}

async function seedClinic(sql: ReturnType<typeof getDb>, clinicId: number, ownerEmail: string) {
  await sql`
    UPDATE clinics SET
      tagline = COALESCE(NULLIF(tagline, ''), 'Gentle dentistry for the whole family'),
      phone = COALESCE(NULLIF(phone, ''), '9876543210'),
      address = COALESCE(NULLIF(address, ''), '14 Linking Road, Bandra West, Mumbai 400050'),
      email = COALESCE(NULLIF(email, ''), ${ownerEmail}),
      website = COALESCE(NULLIF(website, ''), 'bandradental.example'),
      google_maps_link = COALESCE(NULLIF(google_maps_link, ''), 'https://maps.google.com/?q=Bandra+West+Mumbai'),
      currency = COALESCE(currency, 'INR'),
      timezone = COALESCE(timezone, 'Asia/Kolkata'),
      gstin = COALESCE(NULLIF(gstin, ''), '27AABCU9603R1ZM'),
      pan = COALESCE(NULLIF(pan, ''), 'AABCU9603R'),
      gst_rate = COALESCE(gst_rate, 18),
      state_code = COALESCE(NULLIF(state_code, ''), '27'),
      owner_name = COALESCE(NULLIF(owner_name, ''), 'Dr. Aisha Khan')
    WHERE id = ${clinicId}
  `;

  await sql`
    UPDATE clinic_members
    SET display_name = COALESCE(NULLIF(display_name, ''), 'Dr. Aisha Khan')
    WHERE clinic_id = ${clinicId} AND role = 'OWNER'
  `;

  await sql`
    INSERT INTO clinic_members (clinic_id, user_email, role, status, display_name)
    VALUES
      (${clinicId}, 'doctor.mehta@example.com', 'DOCTOR', 'ACTIVE', 'Dr. Rohan Mehta'),
      (${clinicId}, 'front.desk@example.com', 'RECEPTIONIST', 'ACTIVE', 'Priya Sharma')
    ON CONFLICT (clinic_id, user_email) DO UPDATE
      SET display_name = EXCLUDED.display_name, role = EXCLUDED.role, status = 'ACTIVE'
  `;

  const categories = ['Supplies', 'Equipment', 'Utilities', 'Salaries', 'Rent', 'Marketing', 'Lab Fees'];
  for (const name of categories) {
    await sql`
      INSERT INTO expense_categories (clinic_id, name)
      VALUES (${clinicId}, ${name})
      ON CONFLICT (name, clinic_id) DO NOTHING
    `;
  }

  const expenseRows = [
    { date: isoDate(-28), amount: 45000, category: 'Rent', description: 'Clinic rent — August' },
    { date: isoDate(-21), amount: 18500, category: 'Salaries', description: 'Assistant salary' },
    { date: isoDate(-14), amount: 8200, category: 'Supplies', description: 'Composite kits & bonding agent' },
    { date: isoDate(-10), amount: 3200, category: 'Utilities', description: 'Electricity bill' },
    { date: isoDate(-7), amount: 12500, category: 'Lab Fees', description: 'Zirconia crown lab work' },
    { date: isoDate(-3), amount: 4500, category: 'Marketing', description: 'Google Business ads' },
    { date: isoDate(-1), amount: 2100, category: 'Supplies', description: 'Gloves, masks, disinfectant' },
  ];
  const existingExpenses = await sql`SELECT COUNT(*)::int AS count FROM expenses WHERE clinic_id = ${clinicId}`;
  if ((existingExpenses[0]?.count ?? 0) === 0) {
    for (const e of expenseRows) {
      await sql`
        INSERT INTO expenses (date, amount, category, description, clinic_id)
        VALUES (${e.date}, ${e.amount}, ${e.category}, ${e.description}, ${clinicId})
      `;
    }
  }

  type SeedPatient = {
    patient_id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    patient_type: string;
    referral_source: string;
    visits: {
      offset: number;
      doctor: string;
      visit_type: string;
      findings: string;
      procedure: string;
      tooth: string;
      meds: string;
      dentition?: 'Adult' | 'Child';
      items: { description: string; amount: number }[];
      paid: number;
    }[];
  };

  const patients: SeedPatient[] = [
    {
      patient_id: 'PID-1', name: 'Arjun Mehta', age: 34, gender: 'Male', phone: '+919876543210',
      patient_type: 'Regular', referral_source: 'Google',
      visits: [
        { offset: -40, doctor: 'Dr. Aisha Khan', visit_type: 'Consultation', findings: 'Sensitivity in UR quadrant, suspected caries 16', procedure: 'Exam + IOPAR', tooth: '16', meds: '', items: [{ description: 'Consultation', amount: 500 }, { description: 'X-Ray', amount: 300 }], paid: 800 },
        { offset: -25, doctor: 'Dr. Aisha Khan', visit_type: 'RCT', findings: 'Irreversible pulpitis 16', procedure: 'RCT visit 1 — access + biomechanical prep', tooth: '16', meds: 'Ibuprofen 400mg TDS x 3 days', items: [{ description: 'Root Canal (visit 1)', amount: 4000 }], paid: 4000 },
        { offset: -12, doctor: 'Dr. Aisha Khan', visit_type: 'RCT', findings: 'Canal dry, asymptomatic', procedure: 'Obturation 16', tooth: '16', meds: '', items: [{ description: 'Root Canal (obturation)', amount: 3500 }], paid: 2000 },
      ],
    },
    {
      patient_id: 'PID-2', name: 'Sunita Rao', age: 45, gender: 'Female', phone: '+919812345678',
      patient_type: 'Regular', referral_source: 'Walk-in',
      visits: [
        { offset: -18, doctor: 'Dr. Rohan Mehta', visit_type: 'Scaling', findings: 'Generalized calculus, mild gingivitis', procedure: 'Full mouth scaling & polishing', tooth: '', meds: 'Chlorhexidine mouthwash BD x 7 days', items: [{ description: 'Scaling & Polishing', amount: 2500 }], paid: 2500 },
      ],
    },
    {
      patient_id: 'PID-3', name: 'Kabir Singh', age: 29, gender: 'Male', phone: '+919900112233',
      patient_type: 'Insurance', referral_source: 'Friend',
      visits: [
        { offset: -8, doctor: 'Dr. Aisha Khan', visit_type: 'Filling', findings: 'Occlusal caries 36, 37', procedure: 'Composite restorations 36, 37', tooth: '36,37', meds: '', items: [{ description: 'Composite Filling', amount: 1800 }, { description: 'Composite Filling', amount: 1800 }], paid: 1800 },
      ],
    },
    {
      patient_id: 'PID-4', name: 'Meera Iyer', age: 52, gender: 'Female', phone: '+919767001122',
      patient_type: 'Regular', referral_source: 'Instagram',
      visits: [
        { offset: -60, doctor: 'Dr. Rohan Mehta', visit_type: 'Crown', findings: 'RCT treated 46, needs full coverage', procedure: 'Crown prep + impression 46', tooth: '46', meds: '', items: [{ description: 'Crown prep', amount: 2000 }], paid: 2000 },
        { offset: -50, doctor: 'Dr. Rohan Mehta', visit_type: 'Crown', findings: 'Shade A2, fit verified', procedure: 'Zirconia crown cementation 46', tooth: '46', meds: '', items: [{ description: 'Zirconia Crown', amount: 12000 }], paid: 8000 },
      ],
    },
    {
      patient_id: 'PID-5', name: 'Vikram Patel', age: 41, gender: 'Male', phone: '+919820334455',
      patient_type: 'Regular', referral_source: 'Google',
      visits: [
        { offset: -5, doctor: 'Dr. Aisha Khan', visit_type: 'Extraction', findings: 'Grade III mobile 18, pericoronitis', procedure: 'Simple extraction 18', tooth: '18', meds: 'Amoxicillin 500mg TDS x 5 days, Combiflam TDS', items: [{ description: 'Extraction', amount: 1500 }], paid: 1500 },
      ],
    },
    {
      patient_id: 'PID-6', name: 'Ananya Desai', age: 8, gender: 'Female', phone: '+919833221100',
      patient_type: 'Regular', referral_source: 'School camp',
      visits: [
        { offset: -15, doctor: 'Dr. Aisha Khan', visit_type: 'Filling', findings: 'Occlusal caries 54, 85', procedure: 'GIC restorations', tooth: '54,85', meds: '', dentition: 'Child', items: [{ description: 'GIC Filling (child)', amount: 800 }, { description: 'GIC Filling (child)', amount: 800 }], paid: 1600 },
      ],
    },
    {
      patient_id: 'PID-7', name: 'Rahul Nair', age: 37, gender: 'Male', phone: '+919844556677',
      patient_type: 'Regular', referral_source: 'Existing patient',
      visits: [
        { offset: -2, doctor: 'Dr. Rohan Mehta', visit_type: 'Consultation', findings: 'Wants implant to replace missing 46', procedure: 'Consult + OPG review, CBCT advised', tooth: '46', meds: '', items: [{ description: 'Consultation', amount: 500 }, { description: 'OPG', amount: 800 }], paid: 0 },
      ],
    },
    {
      patient_id: 'PID-8', name: 'Fatima Sheikh', age: 31, gender: 'Female', phone: '+919855667788',
      patient_type: 'Regular', referral_source: 'Google',
      visits: [
        { offset: -22, doctor: 'Dr. Aisha Khan', visit_type: 'Whitening', findings: 'Mild staining, no sensitivity', procedure: 'In-office bleaching', tooth: '', meds: 'Sensitivity toothpaste', items: [{ description: 'Whitening', amount: 8000 }], paid: 8000 },
      ],
    },
    {
      patient_id: 'PID-9', name: 'Dev Sharma', age: 63, gender: 'Male', phone: '+919866778899',
      patient_type: 'Regular', referral_source: 'Walk-in',
      visits: [
        { offset: -35, doctor: 'Dr. Rohan Mehta', visit_type: 'Denture', findings: 'Completely edentulous upper arch', procedure: 'Primary impression CD', tooth: '', meds: '', items: [{ description: 'Complete Denture (start)', amount: 5000 }], paid: 5000 },
        { offset: -20, doctor: 'Dr. Rohan Mehta', visit_type: 'Denture', findings: 'Jaw relation recorded', procedure: 'Try-in + delivery upper CD', tooth: '', meds: '', items: [{ description: 'Complete Denture (balance)', amount: 10000 }], paid: 5000 },
      ],
    },
    {
      patient_id: 'PID-10', name: 'Neha Kapoor', age: 26, gender: 'Female', phone: '+919877889900',
      patient_type: 'Regular', referral_source: 'Instagram',
      visits: [
        { offset: -9, doctor: 'Dr. Aisha Khan', visit_type: 'Ortho', findings: 'Mild crowding upper anteriors, in treatment month 8', procedure: 'Wire change + elastic review', tooth: '', meds: '', items: [{ description: 'Braces Adjustment', amount: 1500 }], paid: 1500 },
      ],
    },
    {
      patient_id: 'PID-11', name: 'Sanjay Gupta', age: 48, gender: 'Male', phone: '+919888990011',
      patient_type: 'Insurance', referral_source: 'Colleague',
      visits: [
        { offset: -1, doctor: 'Dr. Aisha Khan', visit_type: 'Consultation', findings: 'Night grinding, worn canines', procedure: 'Exam, night guard advised', tooth: '', meds: '', items: [{ description: 'Consultation', amount: 500 }], paid: 500 },
      ],
    },
    {
      patient_id: 'PID-12', name: 'Aarav Joshi', age: 11, gender: 'Male', phone: '+919899001122',
      patient_type: 'Regular', referral_source: 'Parent (Sunita Rao)',
      visits: [],
    },
  ];

  for (const p of patients) {
    const inserted = await sql`
      INSERT INTO patients (
        patient_id, name, age, gender, phone_number, patient_type, referral_source, clinic_id, is_active
      ) VALUES (
        ${p.patient_id}, ${p.name}, ${p.age}, ${p.gender}, ${p.phone}, ${p.patient_type}, ${p.referral_source}, ${clinicId}, TRUE
      )
      ON CONFLICT (patient_id, clinic_id) DO UPDATE SET
        is_active = TRUE
      RETURNING id
    `;
    const pid = inserted[0].id;
    const visitCount = await sql`SELECT COUNT(*)::int AS count FROM visits WHERE clinic_id = ${clinicId} AND patient_id = ${pid}`;
    if ((visitCount[0]?.count ?? 0) > 0) continue;

    for (const v of p.visits) {
      const cost = v.items.reduce((s, i) => s + i.amount, 0);
      await sql`
        INSERT INTO visits (
          clinic_id, patient_id, date, doctor, visit_type, clinical_findings, procedure_notes,
          tooth_number, medicine_prescribed, cost, paid, billing_items, dentition_type
        ) VALUES (
          ${clinicId}, ${pid}, ${isoDate(v.offset)}, ${v.doctor}, ${v.visit_type}, ${v.findings}, ${v.procedure},
          ${v.tooth || null}, ${v.meds || null}, ${cost}, ${v.paid}, ${billing(v.items)}, ${v.dentition || 'Adult'}
        )
      `;
    }
  }

  const apptCount = await sql`SELECT COUNT(*)::int AS count FROM appointments WHERE clinic_id = ${clinicId}`;
  if ((apptCount[0]?.count ?? 0) === 0) {
    const byCode: Record<string, number> = {};
    const rows = await sql`SELECT id, patient_id FROM patients WHERE clinic_id = ${clinicId}`;
    for (const r of rows) byCode[r.patient_id] = r.id;

    const appointments = [
      { patient: 'PID-1', doctor_email: ownerEmail, doctor_name: 'Dr. Aisha Khan', offset: 0, start: '10:00', end: '10:30', type: 'RCT follow-up', status: 'CONFIRMED', notes: 'Crown discussion' },
      { patient: 'PID-2', doctor_email: ownerEmail, doctor_name: 'Dr. Aisha Khan', offset: 0, start: '11:00', end: '11:30', type: 'Review', status: 'SCHEDULED', notes: '' },
      { patient: 'PID-6', doctor_email: 'doctor.mehta@example.com', doctor_name: 'Dr. Rohan Mehta', offset: 0, start: '16:00', end: '16:30', type: 'Filling review', status: 'SCHEDULED', notes: 'Child — parent attending' },
      { patient: 'PID-7', doctor_email: ownerEmail, doctor_name: 'Dr. Aisha Khan', offset: 1, start: '09:30', end: '10:15', type: 'Implant consult', status: 'CONFIRMED', notes: 'Bring CBCT' },
      { patient: 'PID-10', doctor_email: 'doctor.mehta@example.com', doctor_name: 'Dr. Rohan Mehta', offset: 1, start: '14:00', end: '14:20', type: 'Braces Adjustment', status: 'SCHEDULED', notes: '' },
      { patient: 'PID-12', doctor_email: ownerEmail, doctor_name: 'Dr. Aisha Khan', offset: 2, start: '17:00', end: '17:30', type: 'Consultation', status: 'SCHEDULED', notes: 'First visit — mixed dentition' },
      { patient: 'PID-4', doctor_email: ownerEmail, doctor_name: 'Dr. Aisha Khan', offset: 3, start: '12:00', end: '12:30', type: 'Review', status: 'SCHEDULED', notes: 'Check occlusion on 46 crown' },
      { patient: null, doctor_email: ownerEmail, doctor_name: 'Dr. Aisha Khan', offset: 0, start: '15:00', end: '15:30', type: 'Consultation', status: 'SCHEDULED', notes: 'Walk-in slot', walk_in_name: 'Rakesh Malhotra', walk_in_phone: '+919700111222' },
    ];

    for (const a of appointments) {
      await sql`
        INSERT INTO appointments (
          clinic_id, patient_id, walk_in_name, walk_in_phone, doctor_email, doctor_name,
          date, start_time, end_time, visit_type, status, notes
        ) VALUES (
          ${clinicId},
          ${a.patient ? byCode[a.patient] ?? null : null},
          ${(a as any).walk_in_name || null},
          ${(a as any).walk_in_phone || null},
          ${a.doctor_email},
          ${a.doctor_name},
          ${isoDate(a.offset)},
          ${a.start},
          ${a.end},
          ${a.type},
          ${a.status},
          ${a.notes || null}
        )
      `;
    }
  }

  await sql`
    UPDATE clinics
    SET patient_counter = GREATEST(
      COALESCE(patient_counter, 0),
      (SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id FROM 5) AS INTEGER)), 0)
       FROM patients
       WHERE clinic_id = ${clinicId} AND patient_id LIKE 'PID-%'
         AND SUBSTRING(patient_id FROM 5) ~ '^[0-9]+$')
    )
    WHERE id = ${clinicId}
  `;

  const summary = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM patients WHERE clinic_id = ${clinicId} AND is_active = TRUE) AS patients,
      (SELECT COUNT(*)::int FROM visits WHERE clinic_id = ${clinicId}) AS visits,
      (SELECT COUNT(*)::int FROM appointments WHERE clinic_id = ${clinicId}) AS appointments,
      (SELECT COUNT(*)::int FROM expenses WHERE clinic_id = ${clinicId}) AS expenses
  `;
  return summary[0];
}

async function seedTestData() {
  console.log('Initializing database schema...');
  const initResult = await initializeDatabase();
  if (!initResult.success) {
    console.error('Failed to initialize database:', initResult.error);
    process.exit(1);
  }

  const sql = getDb();

  let clinics = await sql`
    SELECT id, name, owner_email FROM clinics
    WHERE LOWER(owner_email) = ${TEST_USER_EMAIL}
       OR id IN (SELECT clinic_id FROM clinic_members WHERE LOWER(user_email) = ${TEST_USER_EMAIL})
    ORDER BY id
  `;

  if (clinics.length === 0) {
    const created = await sql`
      INSERT INTO clinics (name, owner_email, owner_id, owner_name)
      VALUES ('Bandra Dental Studio', ${TEST_USER_EMAIL}, ${TEST_USER_ID}, 'Dr. Aisha Khan')
      RETURNING id, name, owner_email
    `;
    await sql`
      INSERT INTO clinic_members (clinic_id, user_email, user_id, role, status, display_name)
      VALUES (${created[0].id}, ${TEST_USER_EMAIL}, ${TEST_USER_ID}, 'OWNER', 'ACTIVE', 'Dr. Aisha Khan')
      ON CONFLICT (clinic_id, user_email) DO UPDATE SET user_id = ${TEST_USER_ID}, role = 'OWNER'
    `;
    clinics = created;
    console.log(`Created clinic: ${created[0].name} (id=${created[0].id})`);
  } else {
    await sql`
      INSERT INTO clinic_members (clinic_id, user_email, user_id, role, status, display_name)
      VALUES (${clinics[0].id}, ${TEST_USER_EMAIL}, ${TEST_USER_ID}, 'OWNER', 'ACTIVE', 'Dr. Aisha Khan')
      ON CONFLICT (clinic_id, user_email) DO UPDATE SET user_id = ${TEST_USER_ID}
    `;
  }

  const targets = await sql`SELECT id, name, owner_email FROM clinics ORDER BY id`;

  for (const clinic of targets) {
    console.log(`\nSeeding clinic #${clinic.id} (${clinic.name})...`);
    const stats = await seedClinic(sql, clinic.id, clinic.owner_email || TEST_USER_EMAIL);
    console.log(`  patients=${stats.patients} visits=${stats.visits} appointments=${stats.appointments} expenses=${stats.expenses}`);
  }

  // Let every existing owner also open the fully seeded demo clinic
  const demo = clinics[0];
  if (demo) {
    const owners = await sql`SELECT DISTINCT LOWER(user_email) AS email FROM clinic_members WHERE role = 'OWNER' AND status = 'ACTIVE'`;
    for (const row of owners) {
      if (row.email === TEST_USER_EMAIL) continue;
      await sql`
        INSERT INTO clinic_members (clinic_id, user_email, role, status, display_name)
        VALUES (${demo.id}, ${row.email}, 'OWNER', 'ACTIVE', NULL)
        ON CONFLICT (clinic_id, user_email) DO NOTHING
      `;
      console.log(`  granted ${row.email} access to demo clinic #${demo.id}`);
    }
  }

  console.log('\nDone. Open the dashboard (this machine: http://localhost:3001), refresh, and pick the clinic.');
  process.exit(0);
}

seedTestData().catch((err) => {
  console.error(err);
  process.exit(1);
});
