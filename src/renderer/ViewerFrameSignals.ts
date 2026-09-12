export type ViewerFrameSignalId =
  | 'animation-pose'
  | 'physics-step'
  | 'physics-observation'
  | 'temporal-projection'
  | 'controls'
  | 'render'
  | 'runtime-history'
  | 'diagnostics';

export type ViewerFrameSignalCadence = 'raf' | 'fixed' | 'event';

export interface ViewerFrameSignalDefinition {
  id: ViewerFrameSignalId;
  profilerLabel: string;
  authority: 'session' | 'physics-worker' | 'viewer' | 'user';
  cadence: ViewerFrameSignalCadence;
  targetRateHz: number | null;
  invalidates: readonly ViewerFrameSignalId[];
}

export const VIEWER_FRAME_SIGNAL_CATALOG: Readonly<Record<ViewerFrameSignalId, ViewerFrameSignalDefinition>> = {
  'animation-pose': {
    id: 'animation-pose',
    profilerLabel: 'POSE',
    authority: 'session',
    cadence: 'raf',
    targetRateHz: null,
    invalidates: ['render']
  },
  'physics-step': {
    id: 'physics-step',
    profilerLabel: 'PHY',
    authority: 'physics-worker',
    cadence: 'fixed',
    targetRateHz: 30,
    invalidates: ['physics-observation']
  },
  'physics-observation': {
    id: 'physics-observation',
    profilerLabel: 'OBS',
    authority: 'physics-worker',
    cadence: 'event',
    targetRateHz: null,
    invalidates: ['temporal-projection', 'runtime-history', 'diagnostics']
  },
  'temporal-projection': {
    id: 'temporal-projection',
    profilerLabel: 'PRJ',
    authority: 'viewer',
    cadence: 'raf',
    targetRateHz: null,
    invalidates: ['render']
  },
  controls: {
    id: 'controls',
    profilerLabel: 'CTRL',
    authority: 'user',
    cadence: 'event',
    targetRateHz: null,
    invalidates: ['render']
  },
  render: {
    id: 'render',
    profilerLabel: 'RND',
    authority: 'viewer',
    cadence: 'raf',
    targetRateHz: null,
    invalidates: []
  },
  'runtime-history': {
    id: 'runtime-history',
    profilerLabel: 'HIST',
    authority: 'viewer',
    cadence: 'fixed',
    targetRateHz: 30,
    invalidates: []
  },
  diagnostics: {
    id: 'diagnostics',
    profilerLabel: 'DIAG',
    authority: 'viewer',
    cadence: 'fixed',
    targetRateHz: 2,
    invalidates: []
  }
};

export function resolveViewerFrameSignalIntervalMs(
  signalId: ViewerFrameSignalId,
  targetRateHz = VIEWER_FRAME_SIGNAL_CATALOG[signalId].targetRateHz
): number {
  if (targetRateHz === null || !Number.isFinite(targetRateHz) || targetRateHz <= 0) {
    return 0;
  }

  return 1000 / Math.max(1, Math.min(240, targetRateHz));
}
