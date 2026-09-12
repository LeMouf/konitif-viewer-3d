export type RobotInterpolationCurve = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type RobotInterpolationPreset =
  | 'step_or_linear'
  | 'step'
  | 'linear'
  | 'ease_in'
  | 'ease_out'
  | 'ease_in_out';

export type RobotSegmentInterpolation = RobotInterpolationPreset | 'custom';

export type RobotMotionTrack = {
  target: string | null;
  property: 'angle' | 'ratio';
  unitKind?: string | null;
  interpolation: RobotInterpolationPreset;
  keys: Array<{
    frame: number;
    time: number | null;
    value: number | null;
    interpolationToNext?: RobotSegmentInterpolation;
    interpolationCurveToNext?: RobotInterpolationCurve;
  }>;
};

export type RobotMotionAnimation = {
  motion: {
    hasMotion: boolean;
    tracks: RobotMotionTrack[];
  };
  timeline?: {
    durationSeconds?: number | null;
  };
  composition?: {
    clips?: Array<{
      time: number | null;
      durationSeconds: number;
    }>;
  };
};

type RenderableRobotMotionTrackKey = {
  sourceIndex: number;
  time: number;
  value: number;
};

type RenderableRobotMotionTrackCache = {
  sourceKeys: RobotMotionTrack['keys'];
  sourceKeyCount: number;
  firstSourceKey: RobotMotionTrack['keys'][number] | undefined;
  lastSourceKey: RobotMotionTrack['keys'][number] | undefined;
  keys: RenderableRobotMotionTrackKey[];
};

type RenderableRobotMotionTrackCursor = {
  keys: RenderableRobotMotionTrackKey[];
  segmentIndex: number;
};

const defaultCurve: RobotInterpolationCurve = {
  x1: 0.22,
  y1: 0,
  x2: 0.18,
  y2: 1
};

const presetCurves: Record<RobotInterpolationPreset, RobotInterpolationCurve | null> = {
  step_or_linear: null,
  linear: { x1: 0, y1: 0, x2: 1, y2: 1 },
  step: null,
  ease_in: { x1: 0.42, y1: 0, x2: 1, y2: 1 },
  ease_out: { x1: 0, y1: 0, x2: 0.58, y2: 1 },
  ease_in_out: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 }
};

const animationDurationCache = new WeakMap<RobotMotionAnimation, number>();
const renderableTrackKeyCache = new WeakMap<RobotMotionTrack, RenderableRobotMotionTrackCache>();
const renderableTrackCursorCache = new WeakMap<RobotMotionTrack, RenderableRobotMotionTrackCursor>();

export function getRobotMotionAnimationDuration(animation: RobotMotionAnimation): number {
  const cachedDuration = animationDurationCache.get(animation);

  if (typeof cachedDuration === 'number') {
    return cachedDuration;
  }

  const keyTimes = animation.motion.tracks.flatMap((track) =>
    track.keys.map((key) => key.time).filter((time): time is number => typeof time === 'number')
  );
  const compositionTimes = (animation.composition?.clips ?? [])
    .map((clip) => (typeof clip.time === 'number' ? clip.time + Math.max(0, clip.durationSeconds) : null))
    .filter((time): time is number => typeof time === 'number');
  const candidates = [
    animation.timeline?.durationSeconds && animation.timeline.durationSeconds > 0 ? animation.timeline.durationSeconds : null,
    ...keyTimes,
    ...compositionTimes
  ].filter((time): time is number => typeof time === 'number' && Number.isFinite(time) && time > 0);

  const duration = candidates.length > 0 ? Math.max(...candidates) : 0;
  animationDurationCache.set(animation, duration);

  return duration;
}

/**
 * Resolves the complete playback domain. The product projection may extend
 * beyond motion keys (for example while audio continues), so the Viewer must
 * not shorten that domain back to its locally observable motion duration.
 */
export function resolveRobotMotionPlaybackDuration(
  animation: RobotMotionAnimation,
  projectionDurationSeconds?: number | null
): number {
  const motionDuration = getRobotMotionAnimationDuration(animation);
  const projectionDuration = typeof projectionDurationSeconds === 'number' &&
    Number.isFinite(projectionDurationSeconds) && projectionDurationSeconds > 0
    ? projectionDurationSeconds
    : 0;

  return Math.max(motionDuration, projectionDuration);
}

export function interpolateRobotMotionTrackValueAtTime(track: RobotMotionTrack, time: number): number | null {
  const value = interpolateRawRobotMotionTrackValueAtTime(track, time);
  return value === null ? null : toRobotMotionJointValue(track, value);
}

/** Viewer joints consume radians; authored keys remain in their declared units.
 * Undeclared/legacy units preserve the historical radians contract.
 */
export function toRobotMotionJointValue(track: Pick<RobotMotionTrack, 'property' | 'unitKind'>, value: number): number {
  return track.property === 'angle' && track.unitKind === 'angle_deg' ? value * Math.PI / 180 : value;
}

function interpolateRawRobotMotionTrackValueAtTime(track: RobotMotionTrack, time: number): number | null {
  const normalizedKeys = getRenderableTrackKeys(track);

  if (normalizedKeys.length === 0) {
    return null;
  }

  const first = normalizedKeys[0];
  const last = normalizedKeys[normalizedKeys.length - 1];

  if (time < (first.time ?? 0)) {
    return null;
  }

  if ((first.time ?? 0) >= time) {
    return first.value;
  }

  if ((last.time ?? 0) <= time) {
    return last.value;
  }

  const segmentIndex = resolveRenderableTrackSegmentIndex(track, normalizedKeys, time);
  const current = normalizedKeys[segmentIndex];
  const next = normalizedKeys[segmentIndex + 1];

  if (current && next) {
    const span = next.time - current.time;

    if (span <= 0) {
      return current.value;
    }

    const resolvedInterpolation = resolveTrackSegmentInterpolation(track, current.sourceIndex);
    const progress = applyInterpolationProgress(
      resolvedInterpolation.interpolation,
      (time - current.time) / span,
      resolvedInterpolation.curve
    );

    return current.value + (next.value - current.value) * progress;
  }

  return last.value;
}

function resolveRenderableTrackSegmentIndex(
  track: RobotMotionTrack,
  keys: RenderableRobotMotionTrackKey[],
  time: number
): number {
  const cached = renderableTrackCursorCache.get(track);

  if (cached?.keys === keys && isRenderableTrackSegmentMatch(keys, cached.segmentIndex, time)) {
    return cached.segmentIndex;
  }

  const cachedIndex = cached?.keys === keys ? cached.segmentIndex : -1;

  if (cachedIndex >= 0) {
    const nearbyIndex = resolveNearbyRenderableTrackSegmentIndex(keys, cachedIndex, time);

    if (nearbyIndex !== null) {
      renderableTrackCursorCache.set(track, { keys, segmentIndex: nearbyIndex });
      return nearbyIndex;
    }
  }

  let low = 0;
  let high = keys.length - 2;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const current = keys[mid];
    const next = keys[mid + 1];

    if (!current || !next) {
      break;
    }

    if (time < current.time) {
      high = mid - 1;
    } else if (time > next.time) {
      low = mid + 1;
    } else {
      renderableTrackCursorCache.set(track, { keys, segmentIndex: mid });
      return mid;
    }
  }

  const fallbackIndex = Math.max(0, Math.min(keys.length - 2, low));
  renderableTrackCursorCache.set(track, { keys, segmentIndex: fallbackIndex });
  return fallbackIndex;
}

function resolveNearbyRenderableTrackSegmentIndex(
  keys: RenderableRobotMotionTrackKey[],
  segmentIndex: number,
  time: number
): number | null {
  const nextIndex = segmentIndex + 1;
  const previousIndex = segmentIndex - 1;

  if (isRenderableTrackSegmentMatch(keys, nextIndex, time)) {
    return nextIndex;
  }

  if (isRenderableTrackSegmentMatch(keys, previousIndex, time)) {
    return previousIndex;
  }

  return null;
}

function isRenderableTrackSegmentMatch(
  keys: RenderableRobotMotionTrackKey[],
  segmentIndex: number,
  time: number
): boolean {
  const current = keys[segmentIndex];
  const next = keys[segmentIndex + 1];

  return !!current && !!next && current.time <= time && next.time >= time;
}

function getRenderableTrackKeys(track: RobotMotionTrack): RenderableRobotMotionTrackKey[] {
  const cached = renderableTrackKeyCache.get(track);
  const firstSourceKey = track.keys[0];
  const lastSourceKey = track.keys[track.keys.length - 1];

  if (
    cached &&
    cached.sourceKeys === track.keys &&
    cached.sourceKeyCount === track.keys.length &&
    cached.firstSourceKey === firstSourceKey &&
    cached.lastSourceKey === lastSourceKey
  ) {
    return cached.keys;
  }

  let previousTime = Number.NEGATIVE_INFINITY;
  let needsSort = false;
  const normalizedKeys: RenderableRobotMotionTrackKey[] = [];

  for (let sourceIndex = 0; sourceIndex < track.keys.length; sourceIndex += 1) {
    const key = track.keys[sourceIndex];

    if (key.time === null || key.value === null) {
      continue;
    }

    if (key.time < previousTime) {
      needsSort = true;
    }

    previousTime = key.time;
    normalizedKeys.push({
      sourceIndex,
      time: key.time,
      value: key.value
    });
  }

  const keys = needsSort ? normalizedKeys.sort((left, right) => left.time - right.time) : normalizedKeys;
  renderableTrackKeyCache.set(track, {
    sourceKeys: track.keys,
    sourceKeyCount: track.keys.length,
    firstSourceKey,
    lastSourceKey,
    keys
  });

  return keys;
}

function resolveTrackSegmentInterpolation(
  track: RobotMotionTrack,
  fromKeyIndex: number
): {
  interpolation: RobotSegmentInterpolation;
  curve: RobotInterpolationCurve | null;
} {
  if (fromKeyIndex < 0 || fromKeyIndex >= track.keys.length - 1) {
    return {
      interpolation: track.interpolation,
      curve: null
    };
  }

  const override = track.keys[fromKeyIndex]?.interpolationToNext;
  const overrideCurve = track.keys[fromKeyIndex]?.interpolationCurveToNext ?? null;

  if (!override || override === 'step_or_linear') {
    return {
      interpolation: track.interpolation,
      curve: null
    };
  }

  return {
    interpolation: override,
    curve: override === 'custom' ? normalizeInterpolationCurve(overrideCurve) : null
  };
}

function applyInterpolationProgress(
  interpolation: RobotSegmentInterpolation,
  progress: number,
  curve: RobotInterpolationCurve | null = null
): number {
  const clampedProgress = clampUnit(progress);

  if (interpolation === 'step') {
    return clampedProgress < 1 ? 0 : 1;
  }

  const interpolationCurve = getInterpolationCurve(interpolation, curve);

  if (!interpolationCurve) {
    return clampedProgress;
  }

  return solveBezierProgress(clampedProgress, interpolationCurve);
}

function getInterpolationCurve(
  interpolation: RobotSegmentInterpolation,
  curve: RobotInterpolationCurve | null = null
): RobotInterpolationCurve | null {
  if (interpolation === 'custom') {
    return normalizeInterpolationCurve(curve);
  }

  return presetCurves[interpolation];
}

function normalizeInterpolationCurve(curve: Partial<RobotInterpolationCurve> | null | undefined): RobotInterpolationCurve {
  return {
    x1: clampUnit(curve?.x1 ?? defaultCurve.x1),
    y1: clampUnit(curve?.y1 ?? defaultCurve.y1),
    x2: clampUnit(curve?.x2 ?? defaultCurve.x2),
    y2: clampUnit(curve?.y2 ?? defaultCurve.y2)
  };
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function sampleCubicBezierAtT(t: number, control1: number, control2: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * control1 + 3 * inverse * t * t * control2 + t * t * t;
}

function sampleCubicBezierSlopeAtT(t: number, control1: number, control2: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * control1 + 6 * inverse * t * (control2 - control1) + 3 * t * t * (1 - control2);
}

function solveBezierProgress(progress: number, curve: RobotInterpolationCurve): number {
  let parameter = clampUnit(progress);

  for (let iteration = 0; iteration < 6; iteration += 1) {
    const currentX = sampleCubicBezierAtT(parameter, curve.x1, curve.x2) - progress;
    const slope = sampleCubicBezierSlopeAtT(parameter, curve.x1, curve.x2);

    if (Math.abs(currentX) < 0.0001 || Math.abs(slope) < 0.0001) {
      break;
    }

    parameter -= currentX / slope;
    parameter = clampUnit(parameter);
  }

  return clampUnit(sampleCubicBezierAtT(parameter, curve.y1, curve.y2));
}
