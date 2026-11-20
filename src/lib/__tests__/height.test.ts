import { describe, expect, it } from '@jest/globals';

import { displayValue, formatFeetInches, inchesToCm, MAX_HEIGHT_CM, MIN_HEIGHT_CM, stepHeight } from '../height';

describe('height conversion', () => {
  it('converts inches to centimetres with one decimal (matches the Laravel API)', () => {
    expect(inchesToCm(65)).toBe(165.1);
    expect(inchesToCm(70)).toBe(177.8);
  });

  it('formats feet and inches', () => {
    expect(formatFeetInches(165)).toBe('5 ft 5 in');
    expect(formatFeetInches(180)).toBe('5 ft 11 in');
    expect(formatFeetInches(183)).toBe('6 ft 0 in');
  });

  it('shows whole numbers in the chosen unit', () => {
    expect(displayValue(165.1, 'cm')).toBe(165);
    expect(displayValue(165.1, 'in')).toBe(65);
  });

  it('steps 1 cm or 1 inch and stays within limits', () => {
    expect(stepHeight(165, 'cm', 1)).toBe(166);
    expect(stepHeight(165.1, 'in', 1)).toBe(167.6); // 65 in -> 66 in
    expect(stepHeight(MIN_HEIGHT_CM, 'cm', -1)).toBe(MIN_HEIGHT_CM);
    expect(stepHeight(MAX_HEIGHT_CM, 'in', 1)).toBe(MAX_HEIGHT_CM);
  });
});
