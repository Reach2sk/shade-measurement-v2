/**
 * Debug Log utilities
 *
 * Stores debug records in localStorage for troubleshooting.
 * No images are stored - only metadata and measurements.
 */

import type { PassResult, ConfidenceCategory } from '@/providers/types';
import { roundUpToSixteenth, formatInchesFraction } from './format';

const DEBUG_LOG_KEY = 'wm-debug-log';

export interface DebugRecord {
  timestamp: number;
  timestampFormatted: string;

  // Raw values
  rawWidthInches: number;
  rawHeightInches: number;

  // Rounded display values
  displayWidth: string;
  displayHeight: string;

  // Confidence
  confidence: number;
  category: ConfidenceCategory;

  // Provider metadata
  providerType: 'mock' | 'web';
  metadata: Record<string, unknown>;
}

/**
 * Convert a PassResult to a DebugRecord and append to log
 */
export function appendDebugRecord(
  result: PassResult,
  providerType: 'mock' | 'web'
): void {
  const record: DebugRecord = {
    timestamp: result.timestamp,
    timestampFormatted: new Date(result.timestamp).toISOString(),

    rawWidthInches: result.widthInInches,
    rawHeightInches: result.heightInInches,

    displayWidth: formatInchesFraction(roundUpToSixteenth(result.widthInInches)),
    displayHeight: formatInchesFraction(roundUpToSixteenth(result.heightInInches)),

    confidence: result.confidence,
    category: result.category,

    providerType,
    metadata: result.frameMetadata.detectorMetadata || {},
  };

  const log = getDebugLog();
  log.push(record);

  // Keep only last 100 records to prevent localStorage bloat
  const trimmedLog = log.slice(-100);

  try {
    localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(trimmedLog));
  } catch {
    // localStorage might be full or unavailable
    console.warn('Failed to save debug log to localStorage');
  }
}

/**
 * Get all debug records
 */
export function getDebugLog(): DebugRecord[] {
  try {
    const data = localStorage.getItem(DEBUG_LOG_KEY);
    if (!data) return [];
    return JSON.parse(data) as DebugRecord[];
  } catch {
    return [];
  }
}

/**
 * Clear all debug records
 */
export function clearDebugLog(): void {
  try {
    localStorage.removeItem(DEBUG_LOG_KEY);
  } catch {
    console.warn('Failed to clear debug log');
  }
}

/**
 * Export debug log as JSON string (for download or clipboard)
 */
export function exportDebugLog(): string {
  const log = getDebugLog();
  return JSON.stringify(log, null, 2);
}

/**
 * Copy debug log to clipboard
 */
export async function copyDebugLogToClipboard(): Promise<boolean> {
  try {
    const json = exportDebugLog();
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download debug log as JSON file
 */
export function downloadDebugLog(): void {
  const json = exportDebugLog();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `window-measurement-debug-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
