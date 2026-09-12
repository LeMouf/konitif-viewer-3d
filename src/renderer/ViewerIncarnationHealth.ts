export type ViewerIncarnationLossReason = 'destroyed' | 'canvas-detached' | 'context-lost';

export type ViewerIncarnationHealth =
  | { operational: true; reason: null }
  | { operational: false; reason: ViewerIncarnationLossReason };

export function resolveViewerIncarnationHealth(input: {
  destroyed: boolean;
  canvasAttached: boolean;
  contextLost: boolean;
}): ViewerIncarnationHealth {
  if (input.destroyed) {
    return { operational: false, reason: 'destroyed' };
  }

  if (!input.canvasAttached) {
    return { operational: false, reason: 'canvas-detached' };
  }

  if (input.contextLost) {
    return { operational: false, reason: 'context-lost' };
  }

  return { operational: true, reason: null };
}
