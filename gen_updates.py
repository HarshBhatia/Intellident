import csv
import re

CSV_PATH = "/Users/harsh/Code/intellident/data.csv"
DB_PATH = "db_patients.txt"

def normalize(s):
    return "".join(re.findall(r'[a-zA-Z0-9]+', (s or "").lower()))

# Load DB patients (id|name)
db_map = {} # norm_name -> id
with open(DB_PATH, 'r') as f:
    for line in f:
        if '|' in line:
            parts = line.strip().split('|')
            db_id = parts[0]
            name = parts[1]
            db_map[normalize(name)] = db_id

# Load CSV and find targets
updates = [] # (db_id, target_pid)
seen_names = set()
with open(CSV_PATH, 'r', encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    # Check headers
    # print(f"-- CSV Headers: {reader.fieldnames}")
    for row in reader:
        name = row.get('Name', '').strip()
        pid = row.get('Patient ID', '').strip()
        if not name or not pid: continue
        
        norm = normalize(name)
        if norm in seen_names: continue
        seen_names.add(norm)
        
        # print(f"Checking CSV name: {name} ({norm})")
        
        if norm in db_map:
            db_id = db_map[norm]
            updates.append((db_id, f"PID-{pid}"))
        else:
            # Special case for Sajay vs Sandeep
            if norm == 'sajaybansal' and 'sandeepbansal' in db_map:
                updates.append((db_map['sandeepbansal'], f"PID-{pid}"))
            elif norm == 'dharamsinghtomar' and 'daramsingh' in db_map:
                updates.append((db_map['daramsingh'], f"PID-{pid}"))
            else:
                # print(f"  No match for {norm}")
                pass

print(f"-- Matched {len(updates)} patients out of unique CSV entries")
# Generate SQL
# 1. First, move all existing IDs to a temporary namespace to avoid unique conflicts
print("BEGIN;")
print("UPDATE patients SET patient_id = patient_id || '_TMP' WHERE clinic_id = (SELECT id FROM clinics WHERE owner_email = 'zaheeneqbal@gmail.com');")

# 2. Apply new IDs
for db_id, new_pid in updates:
    print(f"UPDATE patients SET patient_id = '{new_pid}' WHERE id = {db_id};")

print("COMMIT;")
