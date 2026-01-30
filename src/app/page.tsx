'use client';

import React, { useState, useEffect } from 'react';

type MountType = 'inside' | 'outside';
type Screen = 'home' | 'permission' | 'mountSelection' | 'pass1' | 'pass1Review' | 'pass2' | 'pass2Review' | 'pass3' | 'completion' | 'details' | 'settings';

interface PassResult {
  widthInInches: number;
  heightInInches: number;
  confidence: number;
  category: 'Excellent' | 'OK' | 'Not Great';
  timestamp: number;
}

// Round UP to nearest 1/16
function roundUp(n: number): number {
  return Math.ceil(n * 16) / 16;
}

// Format as fraction
function formatFraction(inches: number): string {
  const rounded = roundUp(inches);
  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  if (frac === 0) return `${whole}"`;

  const sixteenths = Math.round(frac * 16);
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const d = gcd(sixteenths, 16);
  const num = sixteenths / d;
  const den = 16 / d;

  if (whole === 0) return `${num}/${den}"`;
  return `${whole} ${num}/${den}"`;
}

// Mock capture
function mockCapture(): PassResult {
  const confidence = 0.7 + Math.random() * 0.25;
  return {
    widthInInches: 35 + Math.random() * 2,
    heightInInches: 47 + Math.random() * 2,
    confidence,
    category: confidence >= 0.85 ? 'Excellent' : confidence >= 0.65 ? 'OK' : 'Not Great',
    timestamp: Date.now(),
  };
}

// Aggregate passes
function aggregate(passes: PassResult[]) {
  if (passes.length === 0) return null;
  const maxW = Math.max(...passes.map(p => p.widthInInches));
  const maxH = Math.max(...passes.map(p => p.heightInInches));
  const avgConf = passes.reduce((sum, p) => sum + p.confidence, 0) / passes.length;
  return {
    width: roundUp(maxW),
    height: roundUp(maxH),
    confidence: avgConf,
    category: avgConf >= 0.85 ? 'Excellent' : avgConf >= 0.65 ? 'OK' : 'Not Great' as const,
    passCount: passes.length,
  };
}

// Client-only app to avoid hydration issues
function ClientApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mountType, setMountType] = useState<MountType | null>(null);
  const [passes, setPasses] = useState<PassResult[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [clickCount, setClickCount] = useState(0); // Debug counter

  const results = aggregate(passes);

  // Debug: log clicks
  const handleClick = (action: string, callback: () => void) => {
    return () => {
      setClickCount(c => c + 1);
      console.log(`[Click ${clickCount + 1}] ${action}`);
      callback();
    };
  };

  const doCapture = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setTimeout(() => {
      const result = mockCapture();
      setPasses(prev => [...prev, result]);
      if (screen === 'pass1') setScreen('pass1Review');
      else if (screen === 'pass2') setScreen('pass2Review');
      else if (screen === 'pass3') setScreen('completion');
      setIsCapturing(false);
    }, 500);
  };

  const restart = () => {
    setPasses([]);
    setMountType(null);
    setScreen('home');
  };

  // HOME
  if (screen === 'home') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Window Measurement</h1>
        <p className="text-gray-600 mb-8 text-center">Measure your windows for perfect-fit shades</p>

        <button
          type="button"
          onClick={handleClick('Start Measuring', () => setScreen('permission'))}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold mb-4 w-full max-w-xs"
        >
          Start Measuring
        </button>

        <button
          type="button"
          onClick={handleClick('Settings', () => setScreen('settings'))}
          className="text-gray-500 text-sm"
        >
          Settings
        </button>

        <p className="text-gray-400 text-xs mt-8">Version 0.1.3 • Clicks: {clickCount}</p>
      </div>
    );
  }

  // PERMISSION
  if (screen === 'permission') {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-white">
        <button type="button" onClick={handleClick('Back', () => setScreen('home'))} className="text-blue-600 mb-8">
          ← Back
        </button>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">📷</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Camera Access</h2>
          <p className="text-gray-600 mb-8 text-center">We need camera access to measure your windows.</p>
          <button
            type="button"
            onClick={handleClick('Allow Camera', () => setScreen('mountSelection'))}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold w-full max-w-xs"
          >
            Allow Camera Access
          </button>
        </div>
        <p className="text-gray-400 text-xs text-center">Clicks: {clickCount}</p>
      </div>
    );
  }

  // MOUNT SELECTION
  if (screen === 'mountSelection') {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-white">
        <button type="button" onClick={handleClick('Back', () => setScreen('permission'))} className="text-blue-600 mb-8">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Mount Type</h2>
        <p className="text-gray-600 mb-8">How will your shades be mounted?</p>
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleClick('Inside Mount', () => { setMountType('inside'); setScreen('pass1'); })}
            className="w-full p-6 border-2 border-gray-200 rounded-lg text-left"
          >
            <span className="font-semibold text-gray-900">Inside Mount</span>
            <p className="text-gray-600 text-sm mt-1">Shade fits inside the window frame</p>
          </button>
          <button
            type="button"
            onClick={handleClick('Outside Mount', () => { setMountType('outside'); setScreen('pass1'); })}
            className="w-full p-6 border-2 border-gray-200 rounded-lg text-left"
          >
            <span className="font-semibold text-gray-900">Outside Mount</span>
            <p className="text-gray-600 text-sm mt-1">Shade covers the window from outside</p>
          </button>
        </div>
        <p className="text-gray-400 text-xs text-center mt-8">Clicks: {clickCount}</p>
      </div>
    );
  }

  // PASS 1/2/3 (Camera screens)
  if (screen === 'pass1' || screen === 'pass2' || screen === 'pass3') {
    const passNum = screen === 'pass1' ? 1 : screen === 'pass2' ? 2 : 3;
    const backTo: Screen = screen === 'pass1' ? 'mountSelection' : screen === 'pass2' ? 'pass1Review' : 'pass2Review';

    return (
      <div className="h-screen flex flex-col bg-black">
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <button type="button" onClick={handleClick('Back', () => setScreen(backTo))} className="text-white">
            ← Back
          </button>
          <span className="font-semibold">Pass {passNum} of {passNum <= 2 ? '2+' : '3'}</span>
          <div className="w-12" />
        </div>

        <div className="flex-1 bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-2">Mock Camera View</div>
            <div className="border-2 border-dashed border-gray-500 w-48 h-64 flex items-center justify-center">
              <span className="text-gray-500 text-xs">Window Frame</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 flex justify-center">
          <button
            type="button"
            onClick={handleClick('Capture', doCapture)}
            disabled={isCapturing}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center bg-white border-gray-300 ${isCapturing ? 'opacity-50' : ''}`}
          >
            {isCapturing ? '...' : <div className="w-14 h-14 rounded-full bg-red-500" />}
          </button>
        </div>

        <div className="bg-gray-900 text-white text-center pb-6 text-sm">
          {passNum === 1 && 'Position window in frame and capture'}
          {passNum === 2 && 'Capture from a slightly different angle'}
          {passNum === 3 && 'Optional: One more capture for better accuracy'}
          <br />
          <span className="text-gray-500 text-xs">Clicks: {clickCount}</span>
        </div>
      </div>
    );
  }

  // PASS REVIEW
  if (screen === 'pass1Review' || screen === 'pass2Review') {
    const passNum = screen === 'pass1Review' ? 1 : 2;
    const lastPass = passes[passes.length - 1];
    const lowConf = passes.reduce((sum, p) => sum + p.confidence, 0) / passes.length < 0.65;
    const needsPass3 = passNum === 2 && lowConf && passes.length < 3;

    return (
      <div className="min-h-screen flex flex-col p-6 bg-white">
        <button type="button" onClick={handleClick('Back', () => setScreen(passNum === 1 ? 'pass1' : 'pass2'))} className="text-blue-600 mb-8">
          ← Back
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Pass {passNum} Complete</h2>

        <div className="bg-gray-100 rounded-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-gray-600 text-sm">Measured Dimensions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatFraction(lastPass.widthInInches)} × {formatFraction(lastPass.heightInInches)}
            </p>
            <p className="text-sm mt-2">
              <span className={`inline-block px-2 py-1 rounded ${
                lastPass.category === 'Excellent' ? 'bg-green-100 text-green-800' :
                lastPass.category === 'OK' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {lastPass.category} ({Math.round(lastPass.confidence * 100)}%)
              </span>
            </p>
          </div>
        </div>

        {needsPass3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">Low confidence - an additional pass may improve accuracy</p>
          </div>
        )}

        <div className="mt-auto space-y-3">
          <button
            type="button"
            onClick={handleClick('Continue', () => {
              if (passNum === 1) setScreen('pass2');
              else if (needsPass3) setScreen('pass3');
              else setScreen('completion');
            })}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold w-full"
          >
            {passNum === 1 ? 'Continue to Pass 2' : needsPass3 ? 'Take Pass 3' : 'View Results'}
          </button>

          {passNum === 2 && (
            <button
              type="button"
              onClick={handleClick('Skip to Results', () => setScreen('completion'))}
              className="text-gray-600 py-2 w-full"
            >
              {needsPass3 ? 'Skip and View Results' : 'View Results'}
            </button>
          )}
        </div>

        <p className="text-gray-400 text-xs text-center mt-4">Clicks: {clickCount}</p>
      </div>
    );
  }

  // COMPLETION
  if (screen === 'completion' && results) {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Measurement Complete</h2>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-gray-100 rounded-lg p-8 w-full max-w-sm">
            <p className="text-gray-600 text-sm text-center">Final Dimensions ({mountType} mount)</p>
            <p className="text-3xl font-bold text-gray-900 text-center mt-2">
              {formatFraction(results.width)} × {formatFraction(results.height)}
            </p>
            <div className="mt-6 text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                results.category === 'Excellent' ? 'bg-green-100 text-green-800' :
                results.category === 'OK' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {results.category}
              </span>
              <p className="text-gray-500 text-sm mt-2">
                {Math.round(results.confidence * 100)}% confidence • {results.passCount} passes
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleClick('View Details', () => setScreen('details'))}
            className="bg-gray-100 text-gray-900 px-8 py-4 rounded-lg font-semibold w-full"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={handleClick('Measure Another', restart)}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold w-full"
          >
            Measure Another Window
          </button>
          <button
            type="button"
            onClick={handleClick('Settings', () => setScreen('settings'))}
            className="text-gray-500 text-sm w-full"
          >
            Settings
          </button>
        </div>

        <p className="text-gray-400 text-xs text-center mt-4">Clicks: {clickCount}</p>
      </div>
    );
  }

  // DETAILS
  if (screen === 'details') {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-white">
        <button type="button" onClick={handleClick('Back', () => setScreen('completion'))} className="text-blue-600 mb-8">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Measurement Details</h2>
        <div className="space-y-4">
          {passes.map((pass, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-gray-900">Pass {i + 1}</span>
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
                  <p className="font-mono">{formatFraction(pass.widthInInches)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Height</p>
                  <p className="font-mono">{formatFraction(pass.heightInInches)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-xs text-center mt-8">Clicks: {clickCount}</p>
      </div>
    );
  }

  // SETTINGS
  if (screen === 'settings') {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-white">
        <button type="button" onClick={handleClick('Back', () => setScreen(results ? 'completion' : 'home'))} className="text-blue-600 mb-8">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Debug Info</h3>
            <p className="text-gray-600 text-sm">Click counter: {clickCount}</p>
            <p className="text-gray-600 text-sm">Current screen: {screen}</p>
            <p className="text-gray-600 text-sm">Passes completed: {passes.length}</p>
          </div>
          <div className="pt-6 border-t border-gray-200">
            <p className="text-gray-500 text-xs">
              Window Measurement App v0.1.3
              <br />
              Client-only render (no SSR hydration)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <div className="p-6">Unknown screen: {screen}</div>;
}

// Main page - render nothing on server, only on client
export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading until client-side JS runs
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Window Measurement</h1>
        <p className="text-gray-600 mb-8">Loading...</p>
      </div>
    );
  }

  return <ClientApp />;
}
