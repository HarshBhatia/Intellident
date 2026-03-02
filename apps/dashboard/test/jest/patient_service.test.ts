import { getPatients, createPatient } from '../../src/services/patient.service';
import { getDb } from '@intellident/api';

jest.mock('@intellident/api', () => ({
  getDb: jest.fn(),
}));

describe('Patient Service', () => {
  const mockSql = jest.fn() as any;
  mockSql.unsafe = jest.fn();

  beforeEach(() => {
    (getDb as jest.Mock).mockReturnValue(mockSql);
    jest.clearAllMocks();
  });

  test('getPatients should fetch patients for a clinic', async () => {
    mockSql.mockResolvedValue([
      { id: 1, name: 'John Doe', patient_id: 'PID-1', clinic_id: 1 }
    ]);

    const patients = await getPatients('1');
    
    expect(patients).toHaveLength(1);
    expect(patients[0].name).toBe('John Doe');
  });
});
