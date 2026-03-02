import { createVisit } from '../../src/services/visit.service';
import { getDb } from '@intellident/api';

jest.mock('@intellident/api', () => ({
  getDb: jest.fn(),
}));

describe('Visit Service', () => {
  const mockSql = jest.fn() as any;

  beforeEach(() => {
    (getDb as jest.Mock).mockReturnValue(mockSql);
    jest.clearAllMocks();
  });

  test('createVisit should throw if date is in the future', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await expect(createVisit('1', {
      patient_id: 1,
      date: tomorrow.toISOString().split('T')[0],
      doctor: 'Dr. Test'
    })).rejects.toThrow('Visit date cannot be in the future');
  });
});
