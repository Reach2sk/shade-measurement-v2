'use client';

import React, { useState } from 'react';
import { formatInchesFraction, formatConfidence, formatDimensions } from '@/utils/format';
import { roundUpToSixteenth } from '@/utils/format';
import { shouldRecommendAdditionalPass, aggregateResults } from '@/utils/aggregate';
import type { PassResult, ConfidenceCategory } from '@/providers/types';

type MountType = 'inside' | 'outside';
type Screen = 'home' | 'permission' | 'mountSelection' | 'pass1' | 'pass1Review' | 'pass2' | 'pass2Review' | 'pass3' | 'completion' | 'details' | 'settings';

// Simplified mock capture - returns simulated measurement
function mockCapture(): PassResult {
  const baseWidth = 35 + Math.random() * 2;
  const baseHeight = 47 + Math.random() * 2;
  const confidence = 0.7 + Math.random() * 0.25;

  return {
    widthInInches: baseWidth,
    heightInInches: baseHeight,
    confidence,
    category: confidence >= 0.85 ? 'Excellent' : confidence >= 0.65 ? 'OK' : 'Not Great',
    timestamp: Date.now(),
    frameMetadata: {
      pxToInchUsed: null,
      detectorConfidence: confidence,
    },
  };
}

// Main Tutorial Flow - simplified without MeasurementProviderWrapper
function TutorialFlow() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mountType, setMountType] = useState<MountType | null>(null);
  const [passes, setPasses] = useState<PassResult[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  // Handle capture action - simplified
  const handleCapture = () => {
    if (isCapturing) return;
    setIsCapturing(true);

    // Simulate async capture with timeout
    setTimeout(() => {
      const result = mockCapture();
      setPasses(prev => [...prev, result]);

      // Move to review screen
      if (screen === 'pass1') setScreen('pass1Review');
      else if (screen === 'pass2') setScreen('pass2Review');
      else if (screen === 'pass3') setScreen('completion');

      setIsCapturing(false);
    }, 500);
  };

  // Calculate final results
  const finalResults = passes.length > 0 ? aggregateResults(passes) : null;

  // Navigation helpers
  const goToScreen = (s: Screen) => setScreen(s);

  const restart = () => {
    setPasses([]);
    setMountType(null);
    setScreen('home');
  };

  // Render based on current screen
  switch (screen) {
    case 'home':
      return <HomeScreen onStart={() => goToScreen('permission')} onSettings={() => goToScreen('settings')} />;

    case 'permission':
      return (
        <PermissionScreen
          onGranted={() => goToScreen('mountSelection')}
          onBack={() => goToScreen('home')}
        />
      );

    case 'mountSelection':
      return (
        <MountSelectionScreen
          onSelect={(mt) => {
            setMountType(mt);
            goToScreen('pass1');
          }}
          onBack={() => goToScreen('permission')}
        />
      );

    case 'pass1':
    case 'pass2':
    case 'pass3':
      const passNumber = screen === 'pass1' ? 1 : screen === 'pass2' ? 2 : 3;
      const backScreen: Screen = screen === 'pass1' ? 'mountSelection' : screen === 'pass2' ? 'pass1Review' : 'pass2Review';
      return (
        <div className="h-screen flex flex-col bg-black">
          <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
            <button
              onClick={() => goToScreen(backScreen)}
              className="text-white active:text-gray-400"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              ← Back
            </button>
            <span className="font-semibold">Pass {passNumber} of {passNumber <= 2 ? '2+' : '3'}</span>
            <div className="w-12" />
          </div>

          <div className="flex-1 relative bg-gray-800">
            {/* Mock Camera View */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-2">Mock Camera View</div>
                <div className="border-2 border-dashed border-gray-500 w-48 h-64 mx-auto flex items-center justify-center">
                  <span className="text-gray-500 text-xs">Window Frame</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-6 flex justify-center">
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center bg-white border-gray-300 ${isCapturing ? 'opacity-50' : ''}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isCapturing ? (
                <span className="text-gray-600">...</span>
              ) : (
                <div className="w-14 h-14 rounded-full bg-red-500" />
              )}
            </button>
          </div>

          <div className="bg-gray-900 text-white text-center pb-6 text-sm">
            {passNumber === 1 && 'Position window in frame and capture'}
            {passNumber === 2 && 'Capture from a slightly different angle'}
            {passNumber === 3 && 'Optional: One more capture for better accuracy'}
          </div>
        </div>
      );

    case 'pass1Review':
    case 'pass2Review':
      const reviewPassNumber = screen === 'pass1Review' ? 1 : 2;
      const lastPass = passes[passes.length - 1];
      const recommendation = shouldRecommendAdditionalPass(passes);

      return (
        <PassReviewScreen
          passNumber={reviewPassNumber}
          result={lastPass}
          showPass3Option={reviewPassNumber === 2}
          recommendPass3={recommendation.recommend}
          recommendReason={recommendation.reason}
          onContinue={() => {
            if (reviewPassNumber === 1) {
              goToScreen('pass2');
            } else if (recommendation.recommend) {
              goToScreen('pass3');
            } else {
              goToScreen('completion');
            }
          }}
          onSkipToResults={reviewPassNumber === 2 ? () => goToScreen('completion') : undefined}
          onBack={() => goToScreen(reviewPassNumber === 1 ? 'pass1' : 'pass2')}
        />
      );

    case 'completion':
      if (!finalResults) return null;
      return (
        <CompletionScreen
          width={finalResults.widthInches}
          height={finalResults.heightInches}
          confidence={finalResults.averageConfidence}
          category={finalResults.category}
          passCount={finalResults.passCount}
          mountType={mountType!}
          onViewDetails={() => goToScreen('details')}
          onSettings={() => goToScreen('settings')}
          onRestart={restart}
        />
      );

    case 'details':
      return (
        <DetailsScreen
          passes={passes}
          onBack={() => goToScreen('completion')}
        />
      );

    case 'settings':
      return (
        <SettingsScreen
          onBack={() => goToScreen(finalResults ? 'completion' : 'home')}
        />
      );

    default:
      return <div>Unknown screen</div>;
  }
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
        className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold mb-4 w-full max-w-xs active:bg-blue-700 select-none"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        Start Measuring
      </button>

      <button
        onClick={onSettings}
        className="text-gray-500 text-sm select-none"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        Settings
      </button>

      <p className="text-gray-400 text-xs mt-8">Version 0.1.2</p>
    </div>
  );
}

// Permission Screen - simplified
function PermissionScreen({
  onGranted,
  onBack,
}: {
  onGranted: () => void;
  onBack: () => void;
}) {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPermission = () => {
    setIsRequesting(true);
    // Simulate permission request
    setTimeout(() => {
      setIsRequesting(false);
      onGranted();
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <button
        onClick={onBack}
        className="text-blue-600 mb-8 select-none"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        ← Back
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl">📷</span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Camera Access</h2>
        <p className="text-gray-600 mb-8 text-center">
          We need access to your camera to measure your windows.
        </p>

        <button
          onClick={requestPermission}
          disabled={isRequesting}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold w-full max-w-xs active:bg-blue-700 select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          {isRequesting ? 'Requesting...' : 'Allow Camera Access'}
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
      <button
        onClick={onBack}
        className="text-blue-600 mb-8 select-none"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Mount Type</h2>
      <p className="text-gray-600 mb-8">
        How will your shades be mounted?
      </p>

      <div className="space-y-4">
        <button
          onClick={() => onSelect('inside')}
          className="w-full p-6 border-2 border-gray-200 rounded-lg text-left active:border-blue-600 select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          <span className="font-semibold text-gray-900">Inside Mount</span>
          <p className="text-gray-600 text-sm mt-1">
            Shade fits inside the window frame
          </p>
        </button>

        <button
          onClick={() => onSelect('outside')}
          className="w-full p-6 border-2 border-gray-200 rounded-lg text-left active:border-blue-600 select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
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
      <button
        onClick={onBack}
        className="text-blue-600 mb-8 select-none"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
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
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold w-full active:bg-blue-700 select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          {passNumber === 1 ? 'Continue to Pass 2' : recommendPass3 ? 'Take Pass 3' : 'View Results'}
        </button>

        {showPass3Option && onSkipToResults && (
          <button
            onClick={onSkipToResults}
            className="text-gray-600 py-2 w-full select-none"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
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
  category: ConfidenceCategory;
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
          className="bg-gray-100 text-gray-900 px-8 py-4 rounded-lg font-semibold w-full select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          View Details
        </button>

        <button
          onClick={onRestart}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold w-full active:bg-blue-700 select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          Measure Another Window
        </button>

        <button
          onClick={onSettings}
          className="text-gray-500 text-sm w-full select-none"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
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
      <button
        onClick={onBack}
        className="text-blue-600 mb-8 select-none"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
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

// Settings Screen - simplified
function SettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <button
        onClick={onBack}
        className="text-blue-600 mb-8 select-none"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Debug Info</h3>
          <p className="text-gray-600 text-sm mb-4">
            This is a simplified version for testing Safari button clicks.
          </p>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-xs">
            Window Measurement App v0.1.2
            <br />
            Simplified Mock Provider (no context wrapper)
          </p>
        </div>
      </div>
    </div>
  );
}

// Main page component - NO wrapper, direct render
export default function Page() {
  return <TutorialFlow />;
}
