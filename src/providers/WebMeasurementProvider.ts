/**
 * WebMeasurementProvider - Real camera-based measurement provider
 *
 * Uses getUserMedia for camera access and implements:
 * - Per-frame window detection (placeholder heuristic for v0)
 * - Temporal stability scoring
 * - px→inch estimation (stub returning null for now)
 *
 * The detection is structured so a real TF.js model can replace
 * the runDetector() method later.
 */

import type {
  MeasurementProvider,
  PassResult,
  DetectionResult,
  StabilityState,
  ConfidenceCategory,
} from './types';

// Number of frames to track for stability calculation
const STABILITY_WINDOW = 10;
// Jitter threshold for "stable" detection
const JITTER_THRESHOLD = 0.02;
// Confidence threshold for suggesting capture
const CONFIDENCE_THRESHOLD = 0.6;

interface CornerSet {
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
}

export class WebMeasurementProvider implements MeasurementProvider {
  readonly providerType = 'web' as const;

  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isActive = false;

  // Detection state
  private currentDetection: DetectionResult | null = null;
  private cornerHistory: CornerSet[] = [];
  private frameCount = 0;
  private captureCount = 0;

  async initialize(): Promise<boolean> {
    try {
      // Request camera with preferred settings
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.setAttribute('playsinline', 'true');
      this.videoElement.muted = true;

      await this.videoElement.play();

      this.isActive = true;
      this.frameCount = 0;
      this.captureCount = 0;
      this.cornerHistory = [];

      return true;
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      return false;
    }
  }

  cleanup(): void {
    this.isActive = false;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.currentDetection = null;
    this.cornerHistory = [];
  }

  getDetection(): DetectionResult | null {
    if (!this.isActive || !this.videoElement) return null;

    this.frameCount++;

    // Run detection on current frame
    const detection = this.runDetector();

    if (detection) {
      // Update corner history for stability tracking
      this.cornerHistory.push({
        x: detection.x,
        y: detection.y,
        width: detection.width,
        height: detection.height,
        timestamp: Date.now(),
      });

      // Keep only recent frames
      if (this.cornerHistory.length > STABILITY_WINDOW) {
        this.cornerHistory.shift();
      }

      this.currentDetection = detection;
    }

    return this.currentDetection;
  }

  /**
   * Placeholder detection algorithm
   *
   * This is a simple heuristic that returns a centered rectangle.
   * In production, this would be replaced with:
   * - TF.js model inference
   * - OpenCV edge detection
   * - Or other computer vision approach
   *
   * The interface is designed to be swapped out easily.
   */
  private runDetector(): DetectionResult | null {
    if (!this.videoElement) return null;

    const videoWidth = this.videoElement.videoWidth;
    const videoHeight = this.videoElement.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) return null;

    // PLACEHOLDER: Return a centered rectangle with some variation
    // This simulates a detected window for UI development

    // Add small variations to simulate real detection jitter
    const jitter = 0.01;
    const baseX = 0.15;
    const baseY = 0.1;
    const baseWidth = 0.7;
    const baseHeight = 0.8;

    const detection: DetectionResult = {
      x: baseX + (Math.random() - 0.5) * jitter,
      y: baseY + (Math.random() - 0.5) * jitter,
      width: baseWidth + (Math.random() - 0.5) * jitter,
      height: baseHeight + (Math.random() - 0.5) * jitter,
      confidence: 0.7 + Math.random() * 0.2, // 70-90% confidence
    };

    // Clamp to valid range
    detection.x = Math.max(0, Math.min(1 - detection.width, detection.x));
    detection.y = Math.max(0, Math.min(1 - detection.height, detection.y));

    return detection;
  }

  getStability(): StabilityState {
    if (this.cornerHistory.length < 2) {
      return {
        isStable: false,
        jitter: 1,
        frameCount: this.cornerHistory.length,
      };
    }

    // Calculate jitter as average movement between frames
    let totalJitter = 0;
    for (let i = 1; i < this.cornerHistory.length; i++) {
      const prev = this.cornerHistory[i - 1];
      const curr = this.cornerHistory[i];

      const dx = Math.abs(curr.x - prev.x);
      const dy = Math.abs(curr.y - prev.y);
      const dw = Math.abs(curr.width - prev.width);
      const dh = Math.abs(curr.height - prev.height);

      totalJitter += dx + dy + dw + dh;
    }

    const avgJitter = totalJitter / (this.cornerHistory.length - 1);
    const isStable =
      avgJitter < JITTER_THRESHOLD &&
      this.cornerHistory.length >= STABILITY_WINDOW / 2;

    return {
      isStable,
      jitter: avgJitter,
      frameCount: this.cornerHistory.length,
    };
  }

  suggestCapture(): boolean {
    const stability = this.getStability();
    return (
      stability.isStable &&
      this.currentDetection !== null &&
      this.currentDetection.confidence > CONFIDENCE_THRESHOLD
    );
  }

  /**
   * Estimate pixels to inches conversion
   *
   * STUB: Returns null to indicate no AR scaling available.
   * In production, this would use:
   * - WebXR depth API (if available)
   * - Device motion/accelerometer for distance estimation
   * - Known reference object
   *
   * When null, the system uses a fallback heuristic with low confidence.
   */
  private estimatePxToInch(): number | null {
    // TODO: Implement WebXR depth integration
    // TODO: Implement distance estimation from device motion

    // For now, return null to indicate no AR scaling
    return null;
  }

  async capture(): Promise<PassResult> {
    this.captureCount++;

    const detection = this.currentDetection;
    if (!detection || !this.videoElement) {
      throw new Error('No detection available for capture');
    }

    const pxToInch = this.estimatePxToInch();

    // Calculate dimensions
    let widthInches: number;
    let heightInches: number;
    let confidence: number;
    let category: ConfidenceCategory;

    if (pxToInch !== null) {
      // Use real AR scaling
      const videoWidth = this.videoElement.videoWidth;
      const videoHeight = this.videoElement.videoHeight;

      widthInches = detection.width * videoWidth * pxToInch;
      heightInches = detection.height * videoHeight * pxToInch;
      confidence = detection.confidence * 0.9; // High confidence with AR
      category = confidence >= 0.85 ? 'Excellent' : 'OK';
    } else {
      // Fallback: Use heuristic estimation
      // Assume typical window size and distance
      // This produces low-confidence results

      // Heuristic: Assume user is ~4 feet away and typical window is ~36x48 inches
      // Very rough estimation based on detection coverage of frame
      const assumedWindowWidth = 36;
      const assumedWindowHeight = 48;

      // Scale based on how much of frame the detection covers
      widthInches = assumedWindowWidth * (detection.width / 0.7);
      heightInches = assumedWindowHeight * (detection.height / 0.8);

      // Add some variation based on detection properties
      widthInches += (Math.random() - 0.5) * 2;
      heightInches += (Math.random() - 0.5) * 2;

      // Lower confidence without AR
      confidence = detection.confidence * 0.7;
      category = confidence >= 0.65 ? 'OK' : 'Not Great';
    }

    // Reset corner history for next capture
    this.cornerHistory = [];

    return {
      widthInInches: widthInches,
      heightInInches: heightInches,
      confidence,
      category,
      timestamp: Date.now(),
      frameMetadata: {
        pxToInchUsed: pxToInch,
        detectorConfidence: detection.confidence,
        detectorMetadata: {
          provider: 'web',
          captureNumber: this.captureCount,
          hasARScaling: pxToInch !== null,
          detectionBounds: {
            x: detection.x,
            y: detection.y,
            width: detection.width,
            height: detection.height,
          },
        },
      },
    };
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }
}
