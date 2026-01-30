/**
 * Tutorial Flow State Machine using XState v5
 *
 * States:
 * - home: Initial start screen
 * - permission: Camera permission request
 * - mountSelection: Inside/Outside mount choice
 * - pass1: First measurement capture
 * - pass2: Second measurement capture (required)
 * - pass3: Optional third capture if quality insufficient
 * - completion: Results display
 * - details: Per-pass details view
 * - settings: Debug log management
 */

import { setup, assign } from 'xstate';
import type { PassResult, ConfidenceCategory } from '@/providers/types';

// Mount type selection
export type MountType = 'inside' | 'outside';

// Context for the state machine
export interface TutorialContext {
  mountType: MountType | null;
  passes: PassResult[];
  cameraPermissionDenied: boolean;
  finalWidth: number | null;
  finalHeight: number | null;
  finalConfidence: number | null;
  finalCategory: ConfidenceCategory | null;
}

// Events
export type TutorialEvent =
  | { type: 'START' }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'RETRY_PERMISSION' }
  | { type: 'SELECT_MOUNT'; mountType: MountType }
  | { type: 'CAPTURE_COMPLETE'; result: PassResult }
  | { type: 'CONTINUE_TO_PASS2' }
  | { type: 'CONTINUE_TO_PASS3' }
  | { type: 'SKIP_PASS3' }
  | { type: 'VIEW_RESULTS' }
  | { type: 'VIEW_DETAILS' }
  | { type: 'VIEW_SETTINGS' }
  | { type: 'BACK' }
  | { type: 'RESTART' };

// Initial context
const initialContext: TutorialContext = {
  mountType: null,
  passes: [],
  cameraPermissionDenied: false,
  finalWidth: null,
  finalHeight: null,
  finalConfidence: null,
  finalCategory: null,
};

// Helper to calculate final results from passes
function calculateFinalResults(passes: PassResult[]): {
  width: number;
  height: number;
  confidence: number;
  category: ConfidenceCategory;
} {
  if (passes.length === 0) {
    return { width: 0, height: 0, confidence: 0, category: 'Not Great' };
  }

  // Use max width and max height across all passes
  const width = Math.max(...passes.map((p) => p.widthInInches));
  const height = Math.max(...passes.map((p) => p.heightInInches));

  // Average confidence
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

  return { width, height, confidence: avgConfidence, category };
}

// Check if we should suggest pass 3
function shouldSuggestPass3(passes: PassResult[]): boolean {
  if (passes.length < 2) return false;
  const avgConfidence =
    passes.reduce((sum, p) => sum + p.confidence, 0) / passes.length;
  return avgConfidence < 0.75;
}

export const tutorialMachine = setup({
  types: {
    context: {} as TutorialContext,
    events: {} as TutorialEvent,
  },
  actions: {
    setMountType: assign({
      mountType: (_, params: { mountType: MountType }) => params.mountType,
    }),
    addPassResult: assign({
      passes: ({ context }, params: { result: PassResult }) => [
        ...context.passes,
        params.result,
      ],
    }),
    calculateFinal: assign(({ context }) => {
      const results = calculateFinalResults(context.passes);
      return {
        finalWidth: results.width,
        finalHeight: results.height,
        finalConfidence: results.confidence,
        finalCategory: results.category,
      };
    }),
    setPermissionDenied: assign({
      cameraPermissionDenied: () => true,
    }),
    clearPermissionDenied: assign({
      cameraPermissionDenied: () => false,
    }),
    resetContext: assign(() => initialContext),
  },
  guards: {
    shouldSuggestPass3: ({ context }) => shouldSuggestPass3(context.passes),
    hasLowConfidence: ({ context }) => {
      const results = calculateFinalResults(context.passes);
      return results.confidence < 0.75;
    },
  },
}).createMachine({
  id: 'tutorial',
  initial: 'home',
  context: initialContext,
  states: {
    home: {
      on: {
        START: 'permission',
        VIEW_SETTINGS: 'settings',
      },
    },
    permission: {
      on: {
        PERMISSION_GRANTED: {
          target: 'mountSelection',
          actions: ['clearPermissionDenied'],
        },
        PERMISSION_DENIED: {
          actions: ['setPermissionDenied'],
        },
        RETRY_PERMISSION: {
          actions: ['clearPermissionDenied'],
        },
        BACK: 'home',
      },
    },
    mountSelection: {
      on: {
        SELECT_MOUNT: {
          target: 'pass1',
          actions: [
            {
              type: 'setMountType',
              params: ({ event }) => ({ mountType: event.mountType }),
            },
          ],
        },
        BACK: 'permission',
      },
    },
    pass1: {
      on: {
        CAPTURE_COMPLETE: {
          target: 'pass1Review',
          actions: [
            {
              type: 'addPassResult',
              params: ({ event }) => ({ result: event.result }),
            },
          ],
        },
        BACK: 'mountSelection',
      },
    },
    pass1Review: {
      on: {
        CONTINUE_TO_PASS2: 'pass2',
        BACK: 'pass1',
      },
    },
    pass2: {
      on: {
        CAPTURE_COMPLETE: {
          target: 'pass2Review',
          actions: [
            {
              type: 'addPassResult',
              params: ({ event }) => ({ result: event.result }),
            },
          ],
        },
        BACK: 'pass1Review',
      },
    },
    pass2Review: {
      on: {
        CONTINUE_TO_PASS3: 'pass3',
        SKIP_PASS3: {
          target: 'completion',
          actions: ['calculateFinal'],
        },
        VIEW_RESULTS: {
          target: 'completion',
          actions: ['calculateFinal'],
        },
      },
    },
    pass3: {
      on: {
        CAPTURE_COMPLETE: {
          target: 'completion',
          actions: [
            {
              type: 'addPassResult',
              params: ({ event }) => ({ result: event.result }),
            },
            'calculateFinal',
          ],
        },
        SKIP_PASS3: {
          target: 'completion',
          actions: ['calculateFinal'],
        },
        BACK: 'pass2Review',
      },
    },
    completion: {
      on: {
        VIEW_DETAILS: 'details',
        VIEW_SETTINGS: 'settings',
        RESTART: {
          target: 'home',
          actions: ['resetContext'],
        },
      },
    },
    details: {
      on: {
        BACK: 'completion',
      },
    },
    settings: {
      on: {
        BACK: [
          {
            guard: ({ context }) => context.finalWidth !== null,
            target: 'completion',
          },
          {
            target: 'home',
          },
        ],
      },
    },
  },
});
