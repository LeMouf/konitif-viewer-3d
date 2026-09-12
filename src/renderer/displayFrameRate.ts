export const DEFAULT_DISPLAY_FRAME_RATE_HZ = 60;

const MIN_DISPLAY_FRAME_RATE_HZ = 30;
const MAX_DISPLAY_FRAME_RATE_HZ = 240;

export function normalizeConfiguredDisplayFrameRate(value: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(MIN_DISPLAY_FRAME_RATE_HZ, Math.min(MAX_DISPLAY_FRAME_RATE_HZ, value));
}

export function observeDisplayFrameRateCeiling(
  currentCeilingHz: number,
  observedFrameDurationMs: number
): number {
  if (!Number.isFinite(observedFrameDurationMs) || observedFrameDurationMs < 1000 / MAX_DISPLAY_FRAME_RATE_HZ) {
    return currentCeilingHz;
  }

  const observedFrameRateHz = 1000 / observedFrameDurationMs;

  if (observedFrameRateHz < MIN_DISPLAY_FRAME_RATE_HZ) {
    return currentCeilingHz;
  }

  return Math.max(
    currentCeilingHz,
    Math.min(MAX_DISPLAY_FRAME_RATE_HZ, Math.round(observedFrameRateHz))
  );
}

export function resolveDisplayFrameRateTarget(
  configuredFrameRateHz: number | null,
  observedCeilingHz: number
): number {
  return configuredFrameRateHz ?? Math.max(
    MIN_DISPLAY_FRAME_RATE_HZ,
    Math.min(MAX_DISPLAY_FRAME_RATE_HZ, observedCeilingHz)
  );
}
