import { aggregateResults, shouldRecommendAdditionalPass } from '@/utils/aggregate';
import type { PassResult } from '@/providers/types';

// Helper to create test pass results
function createPassResult(
  width: number,
  height: number,
  confidence: number
): PassResult {
  return {
    widthInInches: width,
    heightInInches: height,
    confidence,
    category: confidence >= 0.85 ? 'Excellent' : confidence >= 0.65 ? 'OK' : 'Not Great',
    timestamp: Date.now(),
    frameMetadata: {
      pxToInchUsed: null,
      detectorConfidence: confidence,
    },
  };
}

describe('aggregateResults', () => {
  it('returns zeros for empty passes', () => {
    const result = aggregateResults([]);
    expect(result.widthInches).toBe(0);
    expect(result.heightInches).toBe(0);
    expect(result.averageConfidence).toBe(0);
    expect(result.category).toBe('Not Great');
    expect(result.passCount).toBe(0);
  });

  it('uses max width across passes', () => {
    const passes = [
      createPassResult(35.5, 48, 0.8),
      createPassResult(36.2, 47.5, 0.85),
      createPassResult(35.8, 48.1, 0.75),
    ];

    const result = aggregateResults(passes);
    // Max width is 36.2, rounded up to 36 1/4 (36.25)
    expect(result.widthInches).toBe(36.25);
  });

  it('uses max height across passes', () => {
    const passes = [
      createPassResult(36, 47.5, 0.8),
      createPassResult(36, 48.3, 0.85),
      createPassResult(36, 47.8, 0.75),
    ];

    const result = aggregateResults(passes);
    // Max height is 48.3, rounded up to 48 5/16 (48.3125)
    expect(result.heightInches).toBe(48.3125);
  });

  it('rounds dimensions UP to nearest 1/16', () => {
    const passes = [createPassResult(36.01, 48.01, 0.8)];

    const result = aggregateResults(passes);
    // 36.01 rounds up to 36 1/16 (36.0625)
    expect(result.widthInches).toBe(36.0625);
    // 48.01 rounds up to 48 1/16 (48.0625)
    expect(result.heightInches).toBe(48.0625);
  });

  it('calculates average confidence', () => {
    const passes = [
      createPassResult(36, 48, 0.7),
      createPassResult(36, 48, 0.8),
      createPassResult(36, 48, 0.9),
    ];

    const result = aggregateResults(passes);
    expect(result.averageConfidence).toBeCloseTo(0.8);
  });

  it('sets category based on average confidence', () => {
    // Excellent: >= 0.85
    const excellentPasses = [
      createPassResult(36, 48, 0.9),
      createPassResult(36, 48, 0.85),
    ];
    expect(aggregateResults(excellentPasses).category).toBe('Excellent');

    // OK: >= 0.65 and < 0.85
    const okPasses = [
      createPassResult(36, 48, 0.7),
      createPassResult(36, 48, 0.75),
    ];
    expect(aggregateResults(okPasses).category).toBe('OK');

    // Not Great: < 0.65
    const notGreatPasses = [
      createPassResult(36, 48, 0.5),
      createPassResult(36, 48, 0.6),
    ];
    expect(aggregateResults(notGreatPasses).category).toBe('Not Great');
  });

  it('tracks pass count', () => {
    const passes = [
      createPassResult(36, 48, 0.8),
      createPassResult(36, 48, 0.85),
    ];

    const result = aggregateResults(passes);
    expect(result.passCount).toBe(2);
  });
});

describe('shouldRecommendAdditionalPass', () => {
  it('does not recommend for empty passes', () => {
    const result = shouldRecommendAdditionalPass([]);
    expect(result.recommend).toBe(false);
  });

  it('does not recommend if at 3 passes', () => {
    const passes = [
      createPassResult(36, 48, 0.5),
      createPassResult(36, 48, 0.5),
      createPassResult(36, 48, 0.5),
    ];
    const result = shouldRecommendAdditionalPass(passes);
    expect(result.recommend).toBe(false);
    expect(result.reason).toContain('Maximum passes');
  });

  it('recommends for low confidence', () => {
    const passes = [
      createPassResult(36, 48, 0.5),
      createPassResult(36, 48, 0.6),
    ];
    const result = shouldRecommendAdditionalPass(passes);
    expect(result.recommend).toBe(true);
    expect(result.reason).toContain('Low confidence');
  });

  it('recommends for high measurement variance', () => {
    const passes = [
      createPassResult(34, 46, 0.8), // Very different
      createPassResult(36, 48, 0.8), // from this
    ];
    const result = shouldRecommendAdditionalPass(passes);
    expect(result.recommend).toBe(true);
    expect(result.reason).toContain('vary');
  });

  it('does not recommend for good measurements', () => {
    const passes = [
      createPassResult(36, 48, 0.8),
      createPassResult(36.1, 48.1, 0.85),
    ];
    const result = shouldRecommendAdditionalPass(passes);
    expect(result.recommend).toBe(false);
    expect(result.reason).toContain('good');
  });
});
