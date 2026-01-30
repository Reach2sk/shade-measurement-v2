'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { tutorialMachine, type MountType } from '@/state/tutorialMachine';
import { MeasurementProviderWrapper, useMeasurement } from '@/providers/MeasurementProvider';
import { CameraOverlay, CameraWarnings } from '@/components/CameraOverlay';
import { formatInchesFraction, formatConfidence, formatDimensions } from '@/utils/format';
import { roundUpToSixteenth } from '@/utils/format';
import { shouldRecommendAdditionalPass } from '@/utils/aggregate';
import { appendDebugRecord, getDebugLog, clearDebugLog, copyDebugLogToClipboard, downloadDebugLog } from '@/utils/debugLog';
import type { PassResult } from '@/providers/types';

function TutorialFlow() {
  const [state, send] = useMachine(tutorialMachine);
  const measurement = useMeasurement();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isCapturing, setIsCapturing] = useState(false);

  // Track container size for overlay positioning
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle capture action
  const handleCapture = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    const result = await measurement.capture();
    if (result) {
      // Log to debug storage
      appendDebugRecord(result, measurement.provider?.providerType || 'mock');
      send({ type: 'CAPTURE_COMPLETE', result });
    }

    setIsCapturing(false);
  }, [measurement, send, isCapturing]);

  // Initialize measurement provider when entering camera states
  useEffect(() => {
    const cameraStates = ['pass1', 'pass2', 'pass3'];
    if (cameraStates.includes(state.value as string) && !measurement.isInitialized) {
      measurement.initialize();
    }
  }, [state.value, measurement]);

  // Render based on current state
  const renderState = () => {
    switch (state.value) {
      case 'home':
        return <HomeScreen onStart={() => send({ type: 'START' })} onSettings={() => send({ type: 'VIEW_SETTINGS' })} />;

      case 'permission':
        return (
          <PermissionScreen
            isDenied={state.context.cameraPermissionDenied}
            onGranted={() => send({ type: 'PERMISSION_GRANTED' })}
            onDenied={() => send({ type: 'PERMISSION_DENIED' })}
            onRetry={() => send({ type: 'RETRY_PERMISSION' })}
            onBack={() => send({ type: 'BACK' })}
          />
        );

      case 'mountSelection':
        return (
          <MountSelectionScreen
            onSelect={(mountType) => send({ type: 'SELECT_MOUNT', mountType })}
            onBack={() => send({ type: 'BACK' })}
          />
        );

      case 'pass1':
      case 'pass2':
      case 'pass3':
        const passNumber = state.value === 'pass1' ? 1 : state.value === 'pass2' ? 2 : 3;
        return (
          <div className="h-screen flex flex-col bg-black">
            {/* Header */}
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
              <button
                onClick={() => send({ type: 'BACK' })}
                className="text-white"
              >
                ← Back
              </button>
              <span className="font-semibold">Pass {passNumber} of {passNumber <= 2 ? '2+' : '3'}</span>
              <div className="w-12" /> {/* Spacer */}
            </div>

            {/* Camera view area */}
            <div ref={containerRef} className="flex-1 relative bg-gray-800">
              {measurement.isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white">Initializing camera...</div>
                </div>
              )}

              {measurement.isInitialized && (
                <>
                  {/* Mock provider shows a placeholder */}
                  {measurement.provider?.providerType === 'mock' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                      <div className="text-gray-400 text-sm">Mock Camera View</div>
                    </div>
                  )}

                  {/* Video element for web provider */}
                  {measurement.videoElement && (
                    <video
                      ref={(el) => {
                        if (el && measurement.videoElement) {
                          el.srcObject = measurement.videoElement.srcObject;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {/* Overlay */}
                  <CameraOverlay
                    detection={measurement.detection}
                    stability={measurement.stability}
                    suggestCapture={measurement.suggestCapture}
                    containerWidth={containerSize.width}
                    containerHeight={containerSize.height}
                  />

                  {/* Warnings */}
                  <CameraWarnings
                    stability={measurement.stability}
                    suggestCapture={measurement.suggestCapture}
                  />
                </>
              )}
            </div>

            {/* Capture button */}
            <div className="bg-gray-900 p-6 flex justify-center">
              <button
                onClick={handleCapture}
                disabled={isCapturing || !measurement.isInitialized}
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${
                  measurement.suggestCapture
                    ? 'bg-green-600 border-green-400'
                    : 'bg-white border-gray-300'
                } ${isCapturing ? 'opacity-50' : ''}`}
              >
                {isCapturing ? (
                  <span className="text-gray-600">...</span>
                ) : (
                  <div className={`w-14 h-14 rounded-full ${measurement.suggestCapture ? 'bg-green-400' : 'bg-red-500'}`} />
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-gray-900 text-white text-center pb-6 text-sm">
              {passNumber === 1 && 'Position window in frame and capture'}
              {passNumber === 2 && 'Capture from a slightly different angle'}
              {passNumber === 3 && 'Optional: One more capture for better accuracy'}
            </div>
          </div>
        );

      case 'pass1Review':
      case 'pass2Review':
        const reviewPassNumber = state.value === 'pass1Review' ? 1 : 2;
        const lastPass = state.context.passes[state.context.passes.length - 1];
        const recommendation = shouldRecommendAdditionalPass(state.context.passes);

        return (
          <PassReviewScreen
            passNumber={reviewPassNumber}
            result={lastPass}
            showPass3Option={reviewPassNumber === 2}
            recommendPass3={recommendation.recommend}
            recommendReason={recommendation.reason}
            onContinue={() => {
              if (reviewPassNumber === 1) {
                send({ type: 'CONTINUE_TO_PASS2' });
              } else if (recommendation.recommend) {
                send({ type: 'CONTINUE_TO_PASS3' });
              } else {
                send({ type: 'VIEW_RESULTS' });
              }
            }}
            onSkipToResults={reviewPassNumber === 2 ? () => send({ type: 'VIEW_RESULTS' }) : undefined}
            onBack={() => send({ type: 'BACK' })}
          />
        );

      case 'completion':
        return (
          <CompletionScreen
            width={state.context.finalWidth!}
            height={state.context.finalHeight!}
            confidence={state.context.finalConfidence!}
            category={state.context.finalCategory!}
            passCount={state.context.passes.length}
            mountType={state.context.mountType!}
            onViewDetails={() => send({ type: 'VIEW_DETAILS' })}
            onSettings={() => send({ type: 'VIEW_SETTINGS' })}
            onRestart={() => {
              measurement.cleanup();
              send({ type: 'RESTART' });
            }}
          />
        );

      case 'details':
        return (
          <DetailsScreen
            passes={state.context.passes}
            onBack={() => send({ type: 'BACK' })}
          />
        );

      case 'settings':
        return <SettingsScreen onBack={() => send({ type: 'BACK' })} />;

      default:
        return <div>Unknown state: {String(state.value)}</div>;
    }
  };

  return renderState();
}

// Home Screen
function HomeScreen({ onStart, onSettings }: { onStart: () => void; onSettings: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Window Measurement</h1>
      <p className="text-gray-600 mb-8 text-center">
        Measure your windows for perfect-fit shades
      </p>

      <button
        onClick={onStart}
        className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold mb-4 w-full max-w-xs"
      >
        Start Measuring
      </button>

      <button
        onClick={onSettings}
        className="text-gray-500 text-sm"
      >
        Settings
      </button>

      <p className="text-gray-400 text-xs mt-8">Version 0.1.0</p>
    </div>
  );
}

// Permission Screen
function PermissionScreen({
  isDenied,
  onGranted,
  onDenied,
  onRetry,
  onBack,
}: {
  isDenied: boolean;
  onGranted: () => void;
  onDenied: () => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPermission = async () => {
    setIsRequesting(true);
    try {
      // For mock provider, just simulate success
      // For real provider, would request camera permission here
      await new Promise((resolve) => setTimeout(resolve, 500));
      onGranted();
    } catch {
      onDenied();
    }
    setIsRequesting(false);
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <button onClick={onBack} className="text-blue-600 mb-8">
        ← Back
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl">📷</span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Camera Access</h2>
        <p className="text-gray-600 mb-8 text-center">
          We need access to your camera to measure your windows.
          {isDenied && (
            <span className="block text-red-600 mt-2">
              Camera access was denied. Please enable it in your device settings.
            </span>
          )}
        </p>

        <button
          onClick={isDenied ? onRetry : requestPermission}
          disabled={isRequesting}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold w-full max-w-xs"
        >
          {isRequesting ? 'Requesting...' : isDenied ? 'Try Again' : 'Allow Camera Access'}
        </button>
      </div>
    </div>
  );
}

// Mount Selection Screen
function MountSelectionScreen({
  onSelect,
  onBack,
}: {
  onSelect: (mountType: MountType) => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <button onClick={onBack} className="text-blue-600 mb-8">
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Mount Type</h2>
      <p className="text-gray-600 mb-8">
        How will your shades be mounted?
      </p>

      <div className="space-y-4">
        <button
          onClick={() => onSelect('inside')}
          className="w-full p-6 border-2 border-gray-200 rounded-lg text-left hover:border-blue-600"
        >
          <span className="font-semibold text-gray-900">Inside Mount</span>
          <p className="text-gray-600 text-sm mt-1">
            Shade fits inside the window frame
          </p>
        </button>

        <button
          onClick={() => onSelect('outside')}
          className="w-full p-6 border-2 border-gray-200 rounded-lg text-left hover:border-blue-600"
        >
          <span className="font-semibold text-gray-900">Outside Mount</span>
          <p className="text-gray-600 text-sm mt-1">
            Shade covers the window from outside
          </p>
        </button>
      </div>
    </div>
  );
}

// Pass Review Screen
function PassReviewScreen({
  passNumber,
  result,
  showPass3Option,
  recommendPass3,
  recommendReason,
  onContinue,
  onSkipToResults,
  onBack,
}: {
  passNumber: number;
  result: PassResult;
  showPass3Option: boolean;
  recommendPass3: boolean;
  recommendReason: string;
  onContinue: () => void;
  onSkipToResults?: () => void;
  onBack: () => void;
}) {
  const width = formatInchesFraction(roundUpToSixteenth(result.widthInInches));
  const height = formatInchesFraction(roundUpToSixteenth(result.heightInInches));

  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <button onClick={onBack} className="text-blue-600 mb-8">
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Pass {passNumber} Complete</h2>

      <div className="bg-gray-100 rounded-lg p-6 mb-6">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Measured Dimensions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {width} × {height}
          </p>
          <p className="text-sm mt-2">
            <span className={`inline-block px-2 py-1 rounded ${
              result.category === 'Excellent' ? 'bg-green-100 text-green-800' :
              result.category === 'OK' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {result.category} ({formatConfidence(result.confidence)})
            </span>
          </p>
        </div>
      </div>

      {showPass3Option && recommendPass3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 text-sm">{recommendReason}</p>
        </div>
      )}

      <div className="mt-auto space-y-3">
        <button
          onClick={onContinue}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold w-full"
        >
          {passNumber === 1 ? 'Continue to Pass 2' : recommendPass3 ? 'Take Pass 3' : 'View Results'}
        </button>

        {showPass3Option && onSkipToResults && (
          <button
            onClick={onSkipToResults}
            className="text-gray-600 py-2 w-full"
          >
            {recommendPass3 ? 'Skip and View Results' : 'View Results'}
          </button>
        )}
      </div>
    </div>
  );
}

// Completion Screen
function CompletionScreen({
  width,
  height,
  confidence,
  category,
  passCount,
  mountType,
  onViewDetails,
  onSettings,
  onRestart,
}: {
  width: number;
  height: number;
  confidence: number;
  category: string;
  passCount: number;
  mountType: MountType;
  onViewDetails: () => void;
  onSettings: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Measurement Complete</h2>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-gray-100 rounded-lg p-8 w-full max-w-sm">
          <p className="text-gray-600 text-sm text-center">Final Dimensions ({mountType} mount)</p>
          <p className="text-3xl font-bold text-gray-900 text-center mt-2">
            {formatDimensions(width, height)}
          </p>

          <div className="mt-6 text-center">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              category === 'Excellent' ? 'bg-green-100 text-green-800' :
              category === 'OK' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {category}
            </span>
            <p className="text-gray-500 text-sm mt-2">
              {formatConfidence(confidence)} confidence • {passCount} passes
            </p>
          </div>
        </div>

        {category === 'Not Great' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 max-w-sm">
            <p className="text-amber-800 text-sm text-center">
              Consider measuring again for better accuracy
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={onViewDetails}
          className="bg-gray-100 text-gray-900 px-8 py-4 rounded-lg font-semibold w-full"
        >
          View Details
        </button>

        <button
          onClick={onRestart}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold w-full"
        >
          Measure Another Window
        </button>

        <button
          onClick={onSettings}
          className="text-gray-500 text-sm w-full"
        >
          Settings
        </button>
      </div>
    </div>
  );
}

// Details Screen
function DetailsScreen({
  passes,
  onBack,
}: {
  passes: PassResult[];
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <button onClick={onBack} className="text-blue-600 mb-8">
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Measurement Details</h2>

      <div className="space-y-4">
        {passes.map((pass, index) => (
          <div key={index} className="bg-gray-100 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-gray-900">Pass {index + 1}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                pass.category === 'Excellent' ? 'bg-green-100 text-green-800' :
                pass.category === 'OK' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {pass.category}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Width</p>
                <p className="font-mono">{formatInchesFraction(roundUpToSixteenth(pass.widthInInches))}</p>
              </div>
              <div>
                <p className="text-gray-500">Height</p>
                <p className="font-mono">{formatInchesFraction(roundUpToSixteenth(pass.heightInInches))}</p>
              </div>
              <div>
                <p className="text-gray-500">Confidence</p>
                <p>{formatConfidence(pass.confidence)}</p>
              </div>
              <div>
                <p className="text-gray-500">Time</p>
                <p>{new Date(pass.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Settings Screen
function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<ReturnType<typeof getDebugLog>>([]);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    setLogs(getDebugLog());
  }, []);

  const handleClear = () => {
    clearDebugLog();
    setLogs([]);
  };

  const handleCopy = async () => {
    const success = await copyDebugLogToClipboard();
    setCopyStatus(success ? 'Copied!' : 'Failed to copy');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleDownload = () => {
    downloadDebugLog();
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <button onClick={onBack} className="text-blue-600 mb-8">
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Debug Log</h3>
          <p className="text-gray-600 text-sm mb-4">
            {logs.length} records stored
          </p>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="bg-gray-100 text-gray-900 px-4 py-2 rounded text-sm"
            >
              {copyStatus || 'Copy to Clipboard'}
            </button>
            <button
              onClick={handleDownload}
              className="bg-gray-100 text-gray-900 px-4 py-2 rounded text-sm"
            >
              Download JSON
            </button>
            <button
              onClick={handleClear}
              className="bg-red-100 text-red-800 px-4 py-2 rounded text-sm"
            >
              Clear Log
            </button>
          </div>
        </div>

        {logs.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Recent Records</h3>
            <div className="bg-gray-100 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(logs.slice(-5), null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-xs">
            Window Measurement App v0.1.0
            <br />
            Using Mock Provider for UI development
          </p>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function Page() {
  return (
    <MeasurementProviderWrapper>
      <TutorialFlow />
    </MeasurementProviderWrapper>
  );
}
