export type ViewerPlaybackCompletionBehavior = 'hold' | 'return-to-default';

export interface ViewerPlaybackCompletionTransitionInput {
  isPlaying: boolean;
  completionReached: boolean;
  completionBehavior: ViewerPlaybackCompletionBehavior;
}

/**
 * A transport pause freezes the authored pose. Returning to the configured
 * boundary pose is reserved for an explicitly completed playback.
 */
export function shouldStartViewerPlaybackCompletionTransition(
  input: ViewerPlaybackCompletionTransitionInput
): boolean {
  return (
    !input.isPlaying &&
    input.completionReached &&
    input.completionBehavior === 'return-to-default'
  );
}

export interface ViewerPlaybackPhysicsAdvanceInput {
  hasPlaybackState: boolean;
  isPlaying: boolean;
  bufferedProjectionActive: boolean;
  completionTransitionActive: boolean;
  boundaryTransitionActive: boolean;
}

/** A buffered projection has already been simulated and must never be stepped twice. */
export function shouldAdvanceViewerPlaybackPhysics(
  input: ViewerPlaybackPhysicsAdvanceInput
): boolean {
  if (input.bufferedProjectionActive || input.boundaryTransitionActive) {
    return false;
  }

  return (
    !input.hasPlaybackState ||
    input.isPlaying ||
    input.completionTransitionActive
  );
}

export interface ViewerPlaybackProjectionTimeInput {
  synchronizedTimeSeconds: number;
  elapsedSeconds: number;
  playbackRate: number;
  authoritativeTimeSeconds?: number | null;
}

/** The transport clock wins; local elapsed time is only a degraded fallback. */
export function resolveViewerPlaybackProjectionTime(
  input: ViewerPlaybackProjectionTimeInput
): number {
  if (
    typeof input.authoritativeTimeSeconds === 'number' &&
    Number.isFinite(input.authoritativeTimeSeconds)
  ) {
    return Math.max(0, input.authoritativeTimeSeconds);
  }

  return Math.max(
    0,
    input.synchronizedTimeSeconds + input.elapsedSeconds * input.playbackRate
  );
}
