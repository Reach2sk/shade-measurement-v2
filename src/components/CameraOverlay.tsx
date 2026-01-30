'use client';

import React from 'react';
import type { DetectionResult, StabilityState } from '@/providers/types';

interface CameraOverlayProps {
  detection: DetectionResult | null;
  stability: StabilityState;
  suggestCapture: boolean;
  containerWidth: number;
  containerHeight: number;
  showGrid?: boolean;
}

/**
 * SVG overlay for detection bounding box, grid, and warnings
 */
export function CameraOverlay({
  detection,
  stability,
  suggestCapture,
  containerWidth,
  containerHeight,
  showGrid = true,
}: CameraOverlayProps) {
  if (!detection) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/70 text-white px-4 py-2 rounded-lg">
          Looking for window...
        </div>
      </div>
    );
  }

  // Convert normalized coordinates to pixels
  const boxX = detection.x * containerWidth;
  const boxY = detection.y * containerHeight;
  const boxWidth = detection.width * containerWidth;
  const boxHeight = detection.height * containerHeight;

  // Determine box color based on stability and suggestion
  let boxColor = '#f59e0b'; // yellow - not stable
  if (suggestCapture) {
    boxColor = '#22c55e'; // green - ready to capture
  } else if (stability.isStable) {
    boxColor = '#3b82f6'; // blue - stable but not confident enough
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
    >
      {/* Detection bounding box */}
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        fill="none"
        stroke={boxColor}
        strokeWidth={3}
        strokeDasharray={suggestCapture ? 'none' : '10,5'}
      />

      {/* Corner markers */}
      <g stroke={boxColor} strokeWidth={4} fill="none">
        {/* Top-left */}
        <path d={`M ${boxX} ${boxY + 20} L ${boxX} ${boxY} L ${boxX + 20} ${boxY}`} />
        {/* Top-right */}
        <path
          d={`M ${boxX + boxWidth - 20} ${boxY} L ${boxX + boxWidth} ${boxY} L ${boxX + boxWidth} ${boxY + 20}`}
        />
        {/* Bottom-left */}
        <path
          d={`M ${boxX} ${boxY + boxHeight - 20} L ${boxX} ${boxY + boxHeight} L ${boxX + 20} ${boxY + boxHeight}`}
        />
        {/* Bottom-right */}
        <path
          d={`M ${boxX + boxWidth - 20} ${boxY + boxHeight} L ${boxX + boxWidth} ${boxY + boxHeight} L ${boxX + boxWidth} ${boxY + boxHeight - 20}`}
        />
      </g>

      {/* Grid overlay (3x3) */}
      {showGrid && (
        <g stroke={boxColor} strokeWidth={1} opacity={0.3}>
          {/* Vertical lines */}
          <line
            x1={boxX + boxWidth / 3}
            y1={boxY}
            x2={boxX + boxWidth / 3}
            y2={boxY + boxHeight}
          />
          <line
            x1={boxX + (2 * boxWidth) / 3}
            y1={boxY}
            x2={boxX + (2 * boxWidth) / 3}
            y2={boxY + boxHeight}
          />
          {/* Horizontal lines */}
          <line
            x1={boxX}
            y1={boxY + boxHeight / 3}
            x2={boxX + boxWidth}
            y2={boxY + boxHeight / 3}
          />
          <line
            x1={boxX}
            y1={boxY + (2 * boxHeight) / 3}
            x2={boxX + boxWidth}
            y2={boxY + (2 * boxHeight) / 3}
          />
        </g>
      )}

      {/* Confidence indicator */}
      <text
        x={boxX + boxWidth / 2}
        y={boxY - 10}
        textAnchor="middle"
        fill={boxColor}
        fontSize={14}
        fontWeight="bold"
      >
        {Math.round(detection.confidence * 100)}%
      </text>
    </svg>
  );
}

/**
 * Warning messages display
 */
export function CameraWarnings({
  stability,
  suggestCapture,
}: {
  stability: StabilityState;
  suggestCapture: boolean;
}) {
  const warnings: string[] = [];

  if (!stability.isStable && stability.jitter > 0.3) {
    warnings.push('Hold steady');
  }

  if (stability.frameCount < 10) {
    warnings.push('Analyzing...');
  }

  if (warnings.length === 0 && suggestCapture) {
    return (
      <div className="absolute bottom-24 left-0 right-0 flex justify-center">
        <div className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">
          Ready to capture!
        </div>
      </div>
    );
  }

  if (warnings.length > 0) {
    return (
      <div className="absolute bottom-24 left-0 right-0 flex justify-center">
        <div className="bg-amber-600 text-white px-4 py-2 rounded-lg">
          {warnings.join(' • ')}
        </div>
      </div>
    );
  }

  return null;
}
