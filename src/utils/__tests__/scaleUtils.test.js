import { formatScale } from 'utils/scaleUtils';

describe('formatScale', () => {
  it('shows the backend-resolved grade name, never the hash', () => {
    expect(formatScale({ scale: '8RBVXPnv9dgp', scale_text: 'BS-16' })).toBe('BS-16');
    expect(formatScale({ scale: 'Qvekljwb9KJO', scale_text: 'BPS-17' })).toBe('BPS-17');
  });

  it('does not print a hash that could not be resolved', () => {
    expect(formatScale({ scale: '8RBVXPnv9dgp', scale_text: null })).toBe('—');
    expect(formatScale({ scale: '8RBVXPnv9dgp' })).toBe('—');
    expect(formatScale({ scale: '8RBVXPnv9dgp', scale_text: '' })).toBe('—');
  });

  it('turns a bare number into a BPS scale', () => {
    expect(formatScale({ scale: '17' })).toBe('BPS-17');
    expect(formatScale({ scale: 17 })).toBe('BPS-17');
    expect(formatScale({ scale_text: '17' })).toBe('BPS-17');
  });

  it('keeps a readable plain value as it is (no double BPS- prefix)', () => {
    expect(formatScale({ scale: 'BPS-17' })).toBe('BPS-17');
    expect(formatScale({ scale: 'BS-16' })).toBe('BS-16');
    expect(formatScale({ scale: 'Basic Pay Scale 12' })).toBe('Basic Pay Scale 12');
  });

  it('prefers the resolved name over the raw column', () => {
    expect(formatScale({ scale: '12', scale_text: 'BS-12' })).toBe('BS-12');
  });

  it('shows the given placeholder when the grade cannot be resolved', () => {
    expect(formatScale({ scale: 'x6aVK0G7WJpB' }, 'Grade not set')).toBe('Grade not set');
    expect(formatScale({ scale: 'x6aVK0G7WJpB', scale_text: 'BS-17' }, 'Grade not set')).toBe('BS-17');
  });

  it('handles missing data', () => {
    expect(formatScale(null)).toBe('—');
    expect(formatScale(undefined)).toBe('—');
    expect(formatScale({})).toBe('—');
    expect(formatScale({ scale: '   ' })).toBe('—');
  });
});
