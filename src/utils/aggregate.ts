/**
 * Aggregation utilities for combining pass results
 */

import type { PassResult, ConfidenceCategory } from '@/providers/types';
import { roundUpToSixteenth } from './format';

export interface AggregatedResult {
  // Final dimensions (max across passes, rounded up to 1/16")
  widthInches: number;
  heightInches: number;

  // Confidence metrics
  averageConfidence: number;
  category: ConfidenceCategory;

  // Pass metadata
  passCount: number;
  passes: PassResult[];
}

/**
 * Aggregate multiple pass results into final measurements
 *
 * Per spec:
 * - Final width = max of per-pass widths
 * - Final height = max of per-pass heights
 * - Round final dimensions UP to nearest 1/16"
 */
export function aggregateResults(passes: PassResult[]): AggregatedResult {
  if (passes.length === 0) {
    return {
      widthInches: 0,
      heightInches: 0,
      averageConfidence: 0,
      category: 'Not Great',
      passCount: 0,
      passes: [],
    };
  }

  // Get max width and height
  const maxWidth = Math.max(...passes.map((p) => p.widthInInches));
  const maxHeight = Math.max(...passes.map((p) => p.heightInInches));

  // Round up to nearest 1/16"
  const finalWidth = roundUpToSixteenth(maxWidth);
  const finalHeight = roundUpToSixteenth(maxHeight);

  // Calculate average confidence
  const avgConfidence =
    passes.reduce((sum, p) => sum + p.confidence, 0) / passes.length;

  // Determine category based on average confidence
  let category: ConfidenceCategory;
  if (avgConfidence >= 0.85) {
    category = 'Excellent';
  } else if (avgConfidence >= 0.65) {
    category = 'OK';
  } else {
    category = 'Not Great';
  }

  return {
    widthInches: finalWidth,
    heightInches: finalHeight,
    averageConfidence: avgConfidence,
    category,
    passCount: passes.length,
    passes,
  };
}

/**
 * Check if results suggest an additional pass would be helpful
 */
export function shouldRecommendAdditionalPass(
  passes: PassResult[]
): { recommend: boolean; reason: string } {
  if (passes.length === 0) {
    return { recommend: false, reason: 'No passes yet' };
  }

  if (passes.length >= 3) {
    return { recommend: false, reason: 'Maximum passes reached' };
  }

  const avgConfidence =
    passes.reduce((sum, p) => sum + p.confidence, 0) / passes.length;

  if (avgConfidence < 0.65) {
    return {
      recommend: true,
      reason: 'Low confidence - an additional pass may improve accuracy',
    };
  }

  // Check if measurements vary significantly between passes
  if (passes.length >= 2) {
    const widths = passes.map((p) => p.widthInInches);
    const heights = passes.map((p) => p.heightInInches);

    const widthVariance = Math.max(...widths) - Math.min(...widths);
    const heightVariance = Math.max(...heights) - Math.min(...heights);

    if (widthVariance > 1 || heightVariance > 1) {
      return {
        recommend: true,
        reason: 'Measurements vary between passes - an additional pass may help',
      };
    }
  }

  return { recommend: false, reason: 'Measurements look good' };
}
