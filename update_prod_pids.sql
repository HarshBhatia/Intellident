BEGIN;

-- 1. Move all existing clinic 1 patients to temporary PIDs to avoid unique constraint issues
UPDATE patients SET patient_id = 'TEMP-' || id WHERE clinic_id = 1;

-- 2. Define the new mapping and update names/PIDs
-- 1: Priya (id 2)
UPDATE patients SET patient_id = 'PID-1', name = 'Priya', is_active = TRUE WHERE id = 2;
-- 2: Ram Kishore (id 13)
UPDATE patients SET patient_id = 'PID-2', name = 'Ram Kishore', is_active = TRUE WHERE id = 13;
-- 3: KK Sharma (id 21)
UPDATE patients SET patient_id = 'PID-3', name = 'KK Sharma', is_active = TRUE WHERE id = 21;
-- 4: Tabassum (id 20)
UPDATE patients SET patient_id = 'PID-4', name = 'Tabassum', is_active = TRUE WHERE id = 20;
-- 5: Pankaj Kumar (id 1)
UPDATE patients SET patient_id = 'PID-5', name = 'Pankaj Kumar', is_active = TRUE WHERE id = 1;
-- 6: Anita Batham (id 9)
UPDATE patients SET patient_id = 'PID-6', name = 'Anita Batham', is_active = TRUE WHERE id = 9;
-- 7: Shila Rana (id 19)
UPDATE patients SET patient_id = 'PID-7', name = 'Shila Rana', is_active = TRUE WHERE id = 19;
-- 8: Rohit Singh (id 15)
UPDATE patients SET patient_id = 'PID-8', name = 'Rohit Singh', is_active = TRUE WHERE id = 15;
-- 9: Babu Shona Kumar (id 5)
UPDATE patients SET patient_id = 'PID-9', name = 'Babu Shona Kumar', is_active = TRUE WHERE id = 5;
-- 10: Ketki (id 16)
UPDATE patients SET patient_id = 'PID-10', name = 'Ketki', is_active = TRUE WHERE id = 16;
-- 11: Laxmi Yadav (id 26)
UPDATE patients SET patient_id = 'PID-11', name = 'Laxmi Yadav', is_active = TRUE WHERE id = 26;
-- 12: Rakhi Kumari (id 10)
UPDATE patients SET patient_id = 'PID-12', name = 'Rakhi Kumari', is_active = TRUE WHERE id = 10;
-- 13: Bunty Prajapati (id 17)
UPDATE patients SET patient_id = 'PID-13', name = 'Bunty Prajapati', is_active = TRUE WHERE id = 17;
-- 14: Rekha Ghelot (id 24)
UPDATE patients SET patient_id = 'PID-14', name = 'Rekha Ghelot', is_active = TRUE WHERE id = 24;
-- 15: Samta Bai (id 8)
UPDATE patients SET patient_id = 'PID-15', name = 'Samta Bai', is_active = TRUE WHERE id = 8;
-- 16: Seema (id 23)
UPDATE patients SET patient_id = 'PID-16', name = 'Seema', is_active = TRUE WHERE id = 23;
-- 17: Dilip Singh (id 7)
UPDATE patients SET patient_id = 'PID-17', name = 'Dilip Singh', is_active = TRUE WHERE id = 7;
-- 18: Kanti Singh (id 6)
UPDATE patients SET patient_id = 'PID-18', name = 'Kanti Singh', is_active = TRUE WHERE id = 6;
-- 19: kaptan Singh (INSERT)
INSERT INTO patients (patient_id, name, clinic_id, is_active) VALUES ('PID-19', 'kaptan Singh', 1, TRUE);
-- 20: Dharam Singh (id 27)
UPDATE patients SET patient_id = 'PID-20', name = 'Dharam Singh', is_active = TRUE WHERE id = 27;
-- 21: Vikram (INSERT)
INSERT INTO patients (patient_id, name, clinic_id, is_active) VALUES ('PID-21', 'Vikram', 1, TRUE);
-- 22: Manya (id 11)
UPDATE patients SET patient_id = 'PID-22', name = 'Manya', is_active = TRUE WHERE id = 11;
-- 23: Nazma Khan (id 14)
UPDATE patients SET patient_id = 'PID-23', name = 'Nazma Khan', is_active = TRUE WHERE id = 14;
-- 24: Mamta Kushwah (id 35)
UPDATE patients SET patient_id = 'PID-24', name = 'Mamta Kushwah', is_active = TRUE WHERE id = 35;
-- 25: Munni Bai (id 22)
UPDATE patients SET patient_id = 'PID-25', name = 'Munni Bai', is_active = TRUE WHERE id = 22;
-- 26: Rekha Kushwah (id 28)
UPDATE patients SET patient_id = 'PID-26', name = 'Rekha Kushwah', is_active = TRUE WHERE id = 28;
-- 27: Kanchan Pal (id 36)
UPDATE patients SET patient_id = 'PID-27', name = 'Kanchan Pal', is_active = TRUE WHERE id = 36;
-- 28: Thakurilal (id 37)
UPDATE patients SET patient_id = 'PID-28', name = 'Thakurilal', is_active = TRUE WHERE id = 37;
-- 29: Sweety Verma (id 34)
UPDATE patients SET patient_id = 'PID-29', name = 'Sweety Verma', is_active = TRUE WHERE id = 34;
-- 30: Kamlesh (id 25)
UPDATE patients SET patient_id = 'PID-30', name = 'Kamlesh', is_active = TRUE WHERE id = 25;
-- 31: Joha (id 33)
UPDATE patients SET patient_id = 'PID-31', name = 'Joha', is_active = TRUE WHERE id = 33;
-- 32: Ashok Tiwari (id 31)
UPDATE patients SET patient_id = 'PID-32', name = 'Ashok Tiwari', is_active = TRUE WHERE id = 31;
-- 33: Mishti Dandotiya (id 12)
UPDATE patients SET patient_id = 'PID-33', name = 'Mishti Dandotiya', is_active = TRUE WHERE id = 12;
-- 34: Liyakat Ali (id 30)
UPDATE patients SET patient_id = 'PID-34', name = 'Liyakat Ali', is_active = TRUE WHERE id = 30;
-- 35: Maya (id 38)
UPDATE patients SET patient_id = 'PID-35', name = 'Maya', is_active = TRUE WHERE id = 38;
-- 36: Gungun (id 18)
UPDATE patients SET patient_id = 'PID-36', name = 'Gungun', is_active = TRUE WHERE id = 18;
-- 37: Reena (id 29)
UPDATE patients SET patient_id = 'PID-37', name = 'Reena', is_active = TRUE WHERE id = 29;
-- 38: Sanjay Bansal (id 32)
UPDATE patients SET patient_id = 'PID-38', name = 'Sanjay Bansal', is_active = TRUE WHERE id = 32;
-- 39: Nikky Rajput (id 41)
UPDATE patients SET patient_id = 'PID-39', name = 'Nikky Rajput', is_active = TRUE WHERE id = 41;
-- 40: Rishab Kushwah (id 42)
UPDATE patients SET patient_id = 'PID-40', name = 'Rishab Kushwah', is_active = TRUE WHERE id = 42;
-- 41: Maya Devi (id 43)
UPDATE patients SET patient_id = 'PID-41', name = 'Maya Devi', is_active = TRUE WHERE id = 43;
-- 42: Monu Tomar (id 44)
UPDATE patients SET patient_id = 'PID-42', name = 'Monu Tomar', is_active = TRUE WHERE id = 44;
-- 43: Dutta Shah (INSERT)
INSERT INTO patients (patient_id, name, clinic_id, is_active) VALUES ('PID-43', 'Dutta Shah', 1, TRUE);
-- 44: Maya Gupta (id 54)
UPDATE patients SET patient_id = 'PID-44', name = 'Maya Gupta', is_active = TRUE WHERE id = 54;
-- 45: Suraj (id 55)
UPDATE patients SET patient_id = 'PID-45', name = 'Suraj', is_active = TRUE WHERE id = 55;
-- 46: Roop Singh (id 56)
UPDATE patients SET patient_id = 'PID-46', name = 'Roop Singh', is_active = TRUE WHERE id = 56;
-- 47: Sudha (id 61)
UPDATE patients SET patient_id = 'PID-47', name = 'Sudha', is_active = TRUE WHERE id = 61;
-- 48: Aarav (id 60)
UPDATE patients SET patient_id = 'PID-48', name = 'Aarav', is_active = TRUE WHERE id = 60;
-- 49: sanjay Sharma (INSERT)
INSERT INTO patients (patient_id, name, clinic_id, is_active) VALUES ('PID-49', 'sanjay Sharma', 1, TRUE);
-- 50: Mukesh (INSERT)
INSERT INTO patients (patient_id, name, clinic_id, is_active) VALUES ('PID-50', 'Mukesh', 1, TRUE);

-- Archive any remaining TEMP- patients that were not in the 1-50 list (like Phool Singh)
UPDATE patients SET is_active = FALSE WHERE patient_id LIKE 'TEMP-%' AND clinic_id = 1;

COMMIT;
