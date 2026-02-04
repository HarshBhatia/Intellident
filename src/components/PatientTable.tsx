import { Patient } from '@/types';

interface PatientTableProps {
  patients: Patient[];
}

export default function PatientTable({ patients }: PatientTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {[
              'Patient ID', 'Name', 'Age', 'Gender', 'Phone', 'Doctor', 
              'Treatment', 'Tooth #', 'Medicine', 'Amount', 'Paid For', 
              'Payment Mode', 'Date', 'Type', 'Share', 'Notes'
            ].map((head) => (
              <th key={head} className="px-4 py-2 text-left font-medium text-gray-500 border-b whitespace-nowrap">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {patients.map((patient, idx) => (
            <tr key={idx} className="hover:bg-gray-50 text-gray-700">
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.patient_id}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap font-medium text-blue-600">{patient.name}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.age}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.gender}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.phone_number}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.doctor}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.treatment_done}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.tooth_number}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap max-w-xs truncate" title={patient.medicine_prescribed}>{patient.medicine_prescribed}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap font-semibold">${patient.amount}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.paid_for}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.mode_of_payment}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.date}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.patient_type}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap">{patient.share}</td>
              <td className="px-4 py-2 border-b whitespace-nowrap max-w-xs truncate" title={patient.notes}>{patient.notes}</td>
            </tr>
          ))}
          {patients.length === 0 && (
            <tr>
              <td colSpan={16} className="px-4 py-8 text-center text-gray-500">
                No patients found. Click "Add Patient" to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
