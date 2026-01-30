/**
 * MockProvider - Simulated measurement provider for fast UI iteration
 *
 * Provides deterministic-ish simulated measurements without camera access.
 * Useful for testing the full UI flow without hardware dependencies.
 */

import type {
  MeasurementProvider,
  PassResult,
  DetectionResult,
  StabilityState,
  ConfidenceCategory,
} from './types';

export class MockProvider implements MeasurementProvider {
  readonly providerType = 'mock' as const;

  private isActive = false;
  private frameCount = 0;
  private captureCount = 0;

  // Simulated detection state
  private currentDetection: DetectionResult | null = null;
  private stabilityFrames = 0;
  private lastJitter = 0.5;

  // Simulated window dimensions (will vary slightly between captures)
  private baseWidth = 36; // inches
  private baseHeight = 48; // inches

  async initialize(): Promise<boolean> {
    // Simulate a brief initialization delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.isActive = true;
    this.frameCount = 0;
    this.captureCount = 0;

    // Start with a detection centered in frame
    this.currentDetection = {
      x: 0.15,
      y: 0.1,
      width: 0.7,
      height: 0.8,
      confidence: 0.85,
    };

    return true;
  }

  cleanup(): void {
    this.isActive = false;
    this.currentDetection = null;
  }

  getDetection(): DetectionResult | null {
    if (!this.isActive) return null;

    this.frameCount++;

    // Simulate small variations in detection (jitter)
    if (this.currentDetection) {
      const jitterAmount = 0.005;
      const det = { ...this.currentDetection };

      // Add small random jitter
      det.x += (Math.random() - 0.5) * jitterAmount;
      det.y += (Math.random() - 0.5) * jitterAmount;
      det.width += (Math.random() - 0.5) * jitterAmount;
      det.height += (Math.random() - 0.5) * jitterAmount;

      // Clamp values
      det.x = Math.max(0, Math.min(1 - det.width, det.x));
      det.y = Math.max(0, Math.min(1 - det.height, det.y));

      // Gradually improve confidence over time
      det.confidence = Math.min(0.95, 0.7 + this.frameCount * 0.002);

      return det;
    }

    return null;
  }

  getStability(): StabilityState {
    if (!this.isActive || !this.currentDetection) {
      return { isStable: false, jitter: 1, frameCount: 0 };
    }

    // Simulate stability improving over time
    this.stabilityFrames++;

    // Jitter decreases as frames accumulate
    const targetJitter = Math.max(0.05, 0.5 - this.stabilityFrames * 0.02);
    this.lastJitter = this.lastJitter * 0.9 + targetJitter * 0.1;

    const isStable = this.lastJitter < 0.15 && this.stabilityFrames > 20;

    return {
      isStable,
      jitter: this.lastJitter,
      frameCount: this.stabilityFrames,
    };
  }

  suggestCapture(): boolean {
    const stability = this.getStability();
    const detection = this.getDetection();

    return (
      stability.isStable &&
      detection !== null &&
      detection.confidence > 0.7
    );
  }

  async capture(): Promise<PassResult> {
    this.captureCount++;

    // Add slight variation to measurements between captures
    const widthVariation = (Math.random() - 0.5) * 2; // ±1 inch
    const heightVariation = (Math.random() - 0.5) * 2;

    const width = this.baseWidth + widthVariation;
    const height = this.baseHeight + heightVariation;

    // Confidence varies by capture number (2nd pass typically better)
    let confidence: number;
    let category: ConfidenceCategory;

    if (this.captureCount === 1) {
      confidence = 0.75 + Math.random() * 0.1;
      category = 'OK';
    } else if (this.captureCount === 2) {
      confidence = 0.85 + Math.random() * 0.1;
      category = 'Excellent';
    } else {
      confidence = 0.80 + Math.random() * 0.15;
      category = confidence > 0.85 ? 'Excellent' : 'OK';
    }

    // Reset stability for next capture
    this.stabilityFrames = 0;
    this.lastJitter = 0.5;

    return {
      widthInInches: width,
      heightInInches: height,
      confidence,
      category,
      timestamp: Date.now(),
      frameMetadata: {
        pxToInchUsed: null, // Mock doesn't use real pixel conversion
        detectorConfidence: confidence,
        detectorMetadata: {
          provider: 'mock',
          captureNumber: this.captureCount,
          simulated: true,
        },
      },
    };
  }

  getVideoElement(): HTMLVideoElement | null {
    // Mock provider doesn't have a video element
    return null;
  }
}
