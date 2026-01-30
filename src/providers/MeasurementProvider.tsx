'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { MeasurementProvider, PassResult, DetectionResult, StabilityState } from './types';
import { MockProvider } from './MockProvider';

// Feature flag to switch between providers
const USE_MOCK_PROVIDER = true; // Set to false to use WebMeasurementProvider

interface MeasurementContextValue {
  provider: MeasurementProvider | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  detection: DetectionResult | null;
  stability: StabilityState;
  suggestCapture: boolean;
  videoElement: HTMLVideoElement | null;

  // Actions
  initialize: () => Promise<boolean>;
  capture: () => Promise<PassResult | null>;
  cleanup: () => void;
}

const MeasurementContext = createContext<MeasurementContextValue | null>(null);

export function MeasurementProviderWrapper({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<MeasurementProvider | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [stability, setStability] = useState<StabilityState>({ isStable: false, jitter: 1, frameCount: 0 });
  const [suggestCapture, setSuggestCapture] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const frameLoopRef = useRef<number | null>(null);

  const runFrameLoop = useCallback(() => {
    if (!provider || !isInitialized) return;

    const updateDetection = () => {
      const det = provider.getDetection();
      const stab = provider.getStability();
      const suggest = provider.suggestCapture();

      setDetection(det);
      setStability(stab);
      setSuggestCapture(suggest);

      frameLoopRef.current = requestAnimationFrame(updateDetection);
    };

    updateDetection();
  }, [provider, isInitialized]);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (isInitializing || isInitialized) return isInitialized;

    setIsInitializing(true);
    setError(null);

    try {
      // Create the appropriate provider based on feature flag
      const newProvider = USE_MOCK_PROVIDER
        ? new MockProvider()
        : new MockProvider(); // TODO: Replace with WebMeasurementProvider when implemented

      const success = await newProvider.initialize();

      if (success) {
        setProvider(newProvider);
        setVideoElement(newProvider.getVideoElement());
        setIsInitialized(true);
      } else {
        setError('Failed to initialize measurement provider');
      }

      setIsInitializing(false);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsInitializing(false);
      return false;
    }
  }, [isInitializing, isInitialized]);

  const capture = useCallback(async (): Promise<PassResult | null> => {
    if (!provider || !isInitialized) return null;

    try {
      return await provider.capture();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed');
      return null;
    }
  }, [provider, isInitialized]);

  const cleanup = useCallback(() => {
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }
    if (provider) {
      provider.cleanup();
    }
    setProvider(null);
    setIsInitialized(false);
    setDetection(null);
    setVideoElement(null);
  }, [provider]);

  // Start frame loop when initialized
  useEffect(() => {
    if (isInitialized && provider) {
      runFrameLoop();
    }

    return () => {
      if (frameLoopRef.current) {
        cancelAnimationFrame(frameLoopRef.current);
      }
    };
  }, [isInitialized, provider, runFrameLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const value: MeasurementContextValue = {
    provider,
    isInitialized,
    isInitializing,
    error,
    detection,
    stability,
    suggestCapture,
    videoElement,
    initialize,
    capture,
    cleanup,
  };

  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
}

export function useMeasurement() {
  const context = useContext(MeasurementContext);
  if (!context) {
    throw new Error('useMeasurement must be used within a MeasurementProviderWrapper');
  }
  return context;
}
