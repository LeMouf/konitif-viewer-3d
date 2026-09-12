export interface RobotPoseTransitionTrack {
  target: string;
  startValue: number;
  targetValue: number;
}

export interface RobotPoseTransition {
  startedAtMs: number;
  durationMs: number;
  tracks: readonly RobotPoseTransitionTrack[];
}

export interface RobotPoseTransitionSample {
  progress: number;
  completed: boolean;
  jointValues: Readonly<Record<string, number>>;
}

export function resolveRobotPoseEntryTransitionEndTime(input: {
  startTimeSeconds: number;
  firstKeyTimeSeconds: number;
  minimumDurationSeconds: number;
}): number {
  const startTimeSeconds = Number.isFinite(input.startTimeSeconds) ? input.startTimeSeconds : 0;
  const firstKeyTimeSeconds = Number.isFinite(input.firstKeyTimeSeconds)
    ? input.firstKeyTimeSeconds
    : startTimeSeconds;
  const minimumDurationSeconds = Number.isFinite(input.minimumDurationSeconds)
    ? Math.max(0, input.minimumDurationSeconds)
    : 0;

  return Math.max(firstKeyTimeSeconds, startTimeSeconds + minimumDurationSeconds);
}

export function resolveRobotPoseExitTransitionStartTime(input: {
  endTimeSeconds: number;
  lastKeyTimeSeconds: number;
  minimumDurationSeconds: number;
}): number {
  const endTimeSeconds = Number.isFinite(input.endTimeSeconds) ? Math.max(0, input.endTimeSeconds) : 0;
  const lastKeyTimeSeconds = Number.isFinite(input.lastKeyTimeSeconds)
    ? Math.max(0, Math.min(endTimeSeconds, input.lastKeyTimeSeconds))
    : endTimeSeconds;
  const minimumDurationSeconds = Number.isFinite(input.minimumDurationSeconds)
    ? Math.max(0, input.minimumDurationSeconds)
    : 0;

  return Math.min(lastKeyTimeSeconds, Math.max(0, endTimeSeconds - minimumDurationSeconds));
}

export function createRobotPoseTransition(input: {
  startedAtMs: number;
  durationMs: number;
  targets: Iterable<string>;
  sourcePose: Readonly<Record<string, number>>;
  targetPose: Readonly<Record<string, number>>;
}): RobotPoseTransition | null {
  const tracks = [...new Set(input.targets)]
    .sort()
    .flatMap((target): RobotPoseTransitionTrack[] => {
      const startValue = input.sourcePose[target];
      const targetValue = input.targetPose[target];

      if (
        typeof startValue !== 'number' ||
        !Number.isFinite(startValue) ||
        typeof targetValue !== 'number' ||
        !Number.isFinite(targetValue) ||
        Math.abs(startValue - targetValue) <= 0.000001
      ) {
        return [];
      }

      return [{ target, startValue, targetValue }];
    });

  if (tracks.length === 0) {
    return null;
  }

  return {
    startedAtMs: Number.isFinite(input.startedAtMs) ? input.startedAtMs : 0,
    durationMs: Math.max(1, Number.isFinite(input.durationMs) ? input.durationMs : 1),
    tracks
  };
}

export function sampleRobotPoseTransition(
  transition: RobotPoseTransition,
  observedAtMs: number
): RobotPoseTransitionSample {
  const elapsedMs = Math.max(0, observedAtMs - transition.startedAtMs);
  const progress = clampUnit(elapsedMs / transition.durationMs);
  const easedProgress = progress * progress * (3 - 2 * progress);
  const jointValues: Record<string, number> = {};

  for (const track of transition.tracks) {
    jointValues[track.target] =
      track.startValue + (track.targetValue - track.startValue) * easedProgress;
  }

  return {
    progress,
    completed: progress >= 1,
    jointValues
  };
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}
