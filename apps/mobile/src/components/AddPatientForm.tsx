import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { api } from '../api';

interface AddPatientFormProps {
  clinicId: string;
  getToken: () => Promise<string | null>;
  onSuccess: () => void;
  onCancel: () => void;
}

const AddPatientForm = ({ clinicId, getToken, onSuccess, onCancel }: AddPatientFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    age: '',
    gender: 'Male',
  });

  const handleSubmit = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter patient name');
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        ...formData,
        age: parseInt(formData.age) || 0,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        patient_type: 'New',
        phone_number: formData.phone_number ? `+91${formData.phone_number.replace(/\D/g, '')}` : ''
      };

      await api.createPatient(getToken, clinicId, submissionData);
      Alert.alert('Success', 'Patient added successfully');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>New Patient</Text>
        
        <View style={styles.field}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            value={formData.name}
            onChangeText={(v) => setFormData({...formData, name: v})}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneInputContainer}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="12345 67890"
              keyboardType="phone-pad"
              value={formData.phone_number}
              onChangeText={(v) => setFormData({...formData, phone_number: v})}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="number-pad"
              value={formData.age}
              onChangeText={(v) => setFormData({...formData, age: v})}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              {['Male', 'Female'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderBtn,
                    formData.gender === g && styles.genderBtnActive
                  ]}
                  onPress={() => setFormData({...formData, gender: g})}
                >
                  <Text style={[
                    styles.genderBtnText,
                    formData.gender === g && styles.genderBtnTextActive
                  ]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitBtn, loading && styles.disabledBtn]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  phoneInputContainer: {
    flexDirection: 'row',
  },
  prefix: {
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: 'center',
  },
  prefixText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  row: {
    flexDirection: 'row',
  },
  genderContainer: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  genderBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  genderBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  genderBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  genderBtnTextActive: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledBtn: {
    backgroundColor: '#93c5fd',
  }
});

export default AddPatientForm;
