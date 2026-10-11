/** CPU observation only: never interpreted as GPU execution time. */
export interface ViewerPerformanceObserver {
  isEnabled(label?: string): boolean;
  recordMeasure(label: 'viewer.loop.cpu' | 'viewer.controls.cpu' | 'viewer.draw.cpu', durationMs: number): void;
}

/** Optional observation must not change the result or failure of rendering. */
export function measureViewerOperation<T>(
  observer: ViewerPerformanceObserver | null,
  label: Parameters<ViewerPerformanceObserver['recordMeasure']>[0],
  operation: () => T,
  now: () => number = () => performance.now()
): T {
  let enabled = false;
  try { enabled = observer?.isEnabled(label) ?? false; } catch { /* Observer isolation. */ }
  if (!enabled) return operation();
  const startedAt = now();
  try { return operation(); }
  finally {
    try { observer?.recordMeasure(label, Math.max(0, now() - startedAt)); }
    catch { /* A failed observation must not break rendering or cleanup. */ }
  }
}
