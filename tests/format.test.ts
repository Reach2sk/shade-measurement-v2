import { roundUpToSixteenth, formatInchesFraction, formatDimensions } from '@/utils/format';

describe('roundUpToSixteenth', () => {
  it('rounds up to nearest 1/16', () => {
    expect(roundUpToSixteenth(36.0)).toBe(36.0);
    expect(roundUpToSixteenth(36.01)).toBe(36.0625); // 36 1/16
    expect(roundUpToSixteenth(36.05)).toBe(36.0625); // 36 1/16
    expect(roundUpToSixteenth(36.0625)).toBe(36.0625); // already 36 1/16
    expect(roundUpToSixteenth(36.07)).toBe(36.125); // 36 2/16 = 36 1/8
  });

  it('always rounds UP, never down', () => {
    expect(roundUpToSixteenth(36.001)).toBe(36.0625); // rounds UP to 1/16
    expect(roundUpToSixteenth(36.063)).toBe(36.125); // rounds UP to 2/16
    expect(roundUpToSixteenth(36.5)).toBe(36.5); // already 8/16
    expect(roundUpToSixteenth(36.501)).toBe(36.5625); // rounds UP to 9/16
  });

  it('handles whole numbers', () => {
    expect(roundUpToSixteenth(36)).toBe(36);
    expect(roundUpToSixteenth(48)).toBe(48);
    expect(roundUpToSixteenth(0)).toBe(0);
  });

  it('handles values less than 1', () => {
    expect(roundUpToSixteenth(0.5)).toBe(0.5);
    expect(roundUpToSixteenth(0.03125)).toBe(0.0625); // rounds up
    expect(roundUpToSixteenth(0.01)).toBe(0.0625);
  });
});

describe('formatInchesFraction', () => {
  it('formats whole inches', () => {
    expect(formatInchesFraction(36)).toBe('36"');
    expect(formatInchesFraction(48)).toBe('48"');
    expect(formatInchesFraction(0)).toBe('0"');
  });

  it('formats simple fractions', () => {
    expect(formatInchesFraction(36.5)).toBe('36 1/2"');
    expect(formatInchesFraction(36.25)).toBe('36 1/4"');
    expect(formatInchesFraction(36.75)).toBe('36 3/4"');
  });

  it('formats sixteenths', () => {
    expect(formatInchesFraction(36.0625)).toBe('36 1/16"');
    expect(formatInchesFraction(36.125)).toBe('36 1/8"'); // 2/16 = 1/8
    expect(formatInchesFraction(36.1875)).toBe('36 3/16"');
    expect(formatInchesFraction(36.3125)).toBe('36 5/16"');
  });

  it('simplifies fractions', () => {
    expect(formatInchesFraction(36.5)).toBe('36 1/2"'); // 8/16 = 1/2
    expect(formatInchesFraction(36.25)).toBe('36 1/4"'); // 4/16 = 1/4
    expect(formatInchesFraction(36.125)).toBe('36 1/8"'); // 2/16 = 1/8
  });

  it('handles values less than 1', () => {
    expect(formatInchesFraction(0.5)).toBe('1/2"');
    expect(formatInchesFraction(0.0625)).toBe('1/16"');
  });

  it('rounds up before formatting', () => {
    // 36.01 rounds up to 36 1/16
    expect(formatInchesFraction(36.01)).toBe('36 1/16"');
    // 36.51 rounds up to 36 9/16
    expect(formatInchesFraction(36.51)).toBe('36 9/16"');
  });
});

describe('formatDimensions', () => {
  it('formats width × height', () => {
    expect(formatDimensions(36, 48)).toBe('36" × 48"');
    expect(formatDimensions(36.5, 48.25)).toBe('36 1/2" × 48 1/4"');
  });
});
