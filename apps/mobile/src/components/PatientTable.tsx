import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Patient } from '../types';

interface PatientTableProps {
  patients: Patient[];
  onPatientPress?: (patientId: string) => void;
}

const PatientTable = ({ patients, onPatientPress }: PatientTableProps) => {
  const renderItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity style={styles.row} onPress={() => onPatientPress?.(item.patient_id)}>
      <View style={[styles.cell, styles.nameCell]}>
        <Text style={styles.nameText}>{item.name}</Text>
        <Text style={styles.idText}>{item.patient_id}</Text>
      </View>
      <View style={[styles.cell, styles.dateCell]}>
        <Text style={styles.cellText}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.cell, styles.nameCell]}>
          <Text style={styles.headerText}>Name</Text>
        </View>
        <View style={[styles.cell, styles.dateCell]}>
          <Text style={styles.headerText}>Date</Text>
        </View>
      </View>
      <FlatList
        data={patients}
        renderItem={renderItem}
        keyExtractor={(item) => item.patient_id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No patients found.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#495057',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 10,
  },
  nameCell: {
    flex: 2,
  },
  dateCell: {
    flex: 1.5,
  },
  amountCell: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  idText: {
    fontSize: 10,
    color: '#868e96',
  },
  cellText: {
    fontSize: 13,
    color: '#495057',
  },
  amountText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2b8a3e',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#adb5bd',
  },
});

export default PatientTable;
