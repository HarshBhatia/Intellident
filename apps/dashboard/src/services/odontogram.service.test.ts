import { validateOdontogramChart } from './odontogram.service';

describe('validateOdontogramChart', () => {
  it('accepts an empty chart', () => {
    expect(validateOdontogramChart({})).toEqual({});
  });

  it('accepts a valid tooth marking', () => {
    const chart = validateOdontogramChart({
      16: { whole: 'crown', surfaces: { occlusal: 'caries' }, notes: 'watch' },
    });
    expect(chart['16'].whole).toBe('crown');
    expect(chart['16'].surfaces?.occlusal).toBe('caries');
  });

  it('rejects a non-object', () => {
    expect(() => validateOdontogramChart([])).toThrow('Chart must be an object');
  });

  it('rejects an invalid tooth number', () => {
    expect(() => validateOdontogramChart({ 99: { whole: 'crown' } })).toThrow(/Invalid tooth/);
  });

  it('rejects an invalid condition', () => {
    expect(() => validateOdontogramChart({ 11: { whole: 'gold' } })).toThrow(/Invalid whole/);
  });

  it('rejects an invalid surface', () => {
    expect(() => validateOdontogramChart({ 11: { surfaces: { top: 'caries' } } })).toThrow(/Invalid surface/);
  });
});
