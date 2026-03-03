import csv
import psycopg2

DB_URL = "postgresql://neondb_owner:npg_hPf6JQmrwVF0@ep-holy-darkness-ajwyydtr-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
CSV_PATH = "/Users/harsh/Code/intellident/data.csv"
CLINIC_OWNER = "zaheeneqbal@gmail.com"

def normalize(s):
    return "".join(filter(str.isalnum, (s or "").lower()))

# Load CSV
csv_data = []
with open(CSV_PATH, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row.get('Name', '').strip()
        pid = row.get('Patient ID', '').strip()
        if name and pid:
            csv_data.append({'name': name, 'norm': normalize(name), 'pid': f"PID-{pid}"})

# Deduplicate CSV (it's a visit log)
seen = set()
csv_unique = []
for d in csv_data:
    if d['norm'] not in seen:
        csv_unique.append(d)
        seen.add(d['norm'])

# Connect to DB
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()
cur.execute("SELECT id FROM clinics WHERE owner_email = %s", (CLINIC_OWNER,))
clinic_id = cur.fetchone()[0]

cur.execute("SELECT id, name, patient_id FROM patients WHERE clinic_id = %s", (clinic_id,))
db_patients = cur.fetchall()

print(f"CSV unique names: {len(csv_unique)}")
print(f"DB patients: {len(db_patients)}")

# Matching
matches = []
unmatched_db = []
for db_id, db_name, current_pid in db_patients:
    norm_db = normalize(db_name)
    found = False
    for csv_p in csv_unique:
        if csv_p['norm'] == norm_db:
            matches.append({'id': db_id, 'name': db_name, 'old_pid': current_pid, 'new_pid': csv_p['pid']})
            found = True
            break
    if not found:
        unmatched_db.append({'id': db_id, 'name': db_name})

print(f"Direct matches: {len(matches)}")
print(f"Unmatched DB: {len(unmatched_db)}")
for u in unmatched_db:
    print(f"  - {u['name']}")

cur.close()
conn.close()
