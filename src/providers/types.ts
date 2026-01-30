/**
 * Core types for measurement providers
 */

export type ConfidenceCategory = 'Excellent' | 'OK' | 'Not Great';

export interface FrameMetadata {
  pxToInchUsed: number | null;
  detectorConfidence: number;
  detectorMetadata?: Record<string, unknown>;
}

export interface PassResult {
  widthInInches: number;
  heightInInches: number;
  confidence: number; // 0..1
  category: ConfidenceCategory;
  timestamp: number;
  frameMetadata: FrameMetadata;
}

export interface DetectionResult {
  // Bounding box in normalized coordinates (0-1)
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface StabilityState {
  isStable: boolean;
  jitter: number;
  frameCount: number;
}

export interface MeasurementProvider {
  // Initialize the provider (request camera permissions, etc.)
  initialize(): Promise<boolean>;

  // Clean up resources
  cleanup(): void;

  // Get current detection result (called per frame)
  getDetection(): DetectionResult | null;

  // Get stability state for current detection
  getStability(): StabilityState;

  // Check if provider suggests capture is ready
  suggestCapture(): boolean;

  // Capture current measurement and return result
  capture(): Promise<PassResult>;

  // Get video element for display (null for mock)
  getVideoElement(): HTMLVideoElement | null;

  // Provider type identifier
  readonly providerType: 'mock' | 'web';
}
