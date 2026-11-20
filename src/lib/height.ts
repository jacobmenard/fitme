export type HeightUnit = 'cm' | 'in';

export const CM_PER_INCH = 2.54;
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 250;

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * CM_PER_INCH * 10) / 10;
}

/** 165 → "5 ft 5 in" */
export function formatFeetInches(cm: number): string {
  const totalInches = Math.round(cmToInches(cm));
  const feet = Math.floor(totalInches / 12);
  return `${feet} ft ${totalInches - feet * 12} in`;
}

/** Value shown in the stepper for the chosen unit (whole numbers). */
export function displayValue(cm: number, unit: HeightUnit): number {
  return unit === 'cm' ? Math.round(cm) : Math.round(cmToInches(cm));
}

/** One stepper tap: 1 cm, or 1 inch (snapped to whole inches). */
export function stepHeight(cm: number, unit: HeightUnit, direction: 1 | -1): number {
  const next = unit === 'cm' ? Math.round(cm) + direction : inchesToCm(Math.round(cmToInches(cm)) + direction);
  return Math.min(MAX_HEIGHT_CM, Math.max(MIN_HEIGHT_CM, next));
}
