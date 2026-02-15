import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Patient } from '../types';
import { api } from '../api';

interface PatientDetailProps {
  patientId: string;
  clinicId: string;
  getToken: () => Promise<string | null>;
  onBack: () => void;
}

const PatientDetail = ({ patientId, clinicId, getToken, onBack }: PatientDetailProps) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await api.getPatient(getToken, clinicId, patientId);
        setPatient(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [patientId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.centered}>
        <Text>Patient not found.</Text>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCall = () => {
    if (patient.phone_number) {
      Linking.openURL(`tel:${patient.phone_number}`);
    }
  };

  const InfoRow = ({ label, value, color }: { label: string; value?: string | number, color?: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color } : {}]}>{value || '-'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Back to List</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.patientId}>{patient.patient_id}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <InfoRow label="Age" value={patient.age} />
        <InfoRow label="Gender" value={patient.gender} />
        <InfoRow label="Patient Type" value={patient.patient_type} />
        <InfoRow label="Registration Date" value={patient.date} />
      </View>

      {patient.phone_number && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <InfoRow label="Phone" value={patient.phone_number} />
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <Text style={styles.callBtnText}>Call Patient</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinical Details</Text>
        <InfoRow label="Treatment Done" value={patient.treatment_done} />
        <InfoRow label="Doctor" value={patient.doctor} />
        <InfoRow label="Tooth Number" value={patient.tooth_number} />
        <InfoRow label="Total Amount" value={`₹${patient.amount}`} color="#2b8a3e" />
      </View>

      {patient.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{patient.notes}</Text>
        </View>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  backLink: {
    marginBottom: 20,
  },
  backLinkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  patientId: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  callBtn: {
    marginTop: 12,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  callBtnText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  backBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default PatientDetail;
