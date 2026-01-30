/**
 * Formatting utilities for measurements
 *
 * All measurements are displayed in inches rounded UP to nearest 1/16"
 */

/**
 * Round a number UP to the nearest 1/16
 * @param inches - The measurement in inches
 * @returns The measurement rounded up to nearest 1/16
 */
export function roundUpToSixteenth(inches: number): number {
  // Multiply by 16, ceiling, divide by 16
  return Math.ceil(inches * 16) / 16;
}

/**
 * Format inches as a fractional string
 * e.g., 36.5 -> "36 1/2""
 * e.g., 36.0625 -> "36 1/16""
 * e.g., 36.0 -> "36""
 *
 * @param inches - The measurement in inches (should already be rounded to 1/16)
 * @returns Formatted string with fraction
 */
export function formatInchesFraction(inches: number): string {
  const rounded = roundUpToSixteenth(inches);
  const whole = Math.floor(rounded);
  const remainder = rounded - whole;

  if (remainder === 0) {
    return `${whole}"`;
  }

  // Convert remainder to sixteenths
  const sixteenths = Math.round(remainder * 16);

  // Simplify the fraction
  const { numerator, denominator } = simplifyFraction(sixteenths, 16);

  if (whole === 0) {
    return `${numerator}/${denominator}"`;
  }

  return `${whole} ${numerator}/${denominator}"`;
}

/**
 * Simplify a fraction by finding GCD
 */
function simplifyFraction(
  numerator: number,
  denominator: number
): { numerator: number; denominator: number } {
  const gcd = findGCD(numerator, denominator);
  return {
    numerator: numerator / gcd,
    denominator: denominator / gcd,
  };
}

/**
 * Find greatest common divisor using Euclidean algorithm
 */
function findGCD(a: number, b: number): number {
  if (b === 0) return a;
  return findGCD(b, a % b);
}

/**
 * Format both width and height as a dimension string
 * e.g., "36 1/2" × 48 3/4""
 */
export function formatDimensions(
  widthInches: number,
  heightInches: number
): string {
  const width = formatInchesFraction(widthInches);
  const height = formatInchesFraction(heightInches);
  return `${width} × ${height}`;
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
