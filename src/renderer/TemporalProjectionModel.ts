import type { BodyTransform } from '@konitif/physics';

export type ViewerTemporalProjectionMode = 'raw' | 'interpolated';

export type ViewerTemporalProjectionFallbackReason =
  | 'none'
  | 'insufficient_samples'
  | 'invalid_timestamp'
  | 'sample_gap'
  | 'discontinuity'
  | 'topology_change';

export interface ViewerTemporalProjectionSample {
  sampleId: string;
  physicsTimestampMs: number;
  observedAtMs: number;
  discontinuityToken: string;
  bodyTransforms: readonly BodyTransform[];
  jointAngles: Readonly<Record<string, number>>;
  centerOfMass?: BodyTransform['position'] | null;
}

export interface ViewerTemporalProjectionConfig {
  bufferDelayMs: number;
  maxSampleGapMs: number;
  maxSamples: number;
}

export interface ViewerTemporalProjectionMetrics {
  sampleAgeMs: number;
  projectionLatencyMs: number;
  interpolationAlpha: number;
  positionError: number;
  rotationErrorRadians: number;
  jointAngleErrorRadians: number;
  correctionMagnitude: number;
}

export interface ViewerTemporalProjectionFrame {
  mode: ViewerTemporalProjectionMode;
  state: 'raw' | 'reconstructed' | 'fallback';
  fallbackReason: ViewerTemporalProjectionFallbackReason;
  renderTimestampMs: number;
  projectedPhysicsTimestampMs: number;
  projectedObservedTimestampMs: number;
  sourceSampleIds: readonly string[];
  discreteStateSourceSampleId: string;
  discontinuityToken: string;
  bodyTransforms: readonly BodyTransform[];
  jointAngles: Readonly<Record<string, number>>;
  centerOfMass: BodyTransform['position'] | null;
  metrics: ViewerTemporalProjectionMetrics;
  bufferSize: number;
}

export interface ViewerTemporalProjectionStatus {
  mode: ViewerTemporalProjectionMode;
  state: ViewerTemporalProjectionFrame['state'] | 'empty';
  fallbackReason: ViewerTemporalProjectionFallbackReason;
  sourceSampleIds: readonly string[];
  sampleAgeMs: number;
  projectionLatencyMs: number;
  interpolationAlpha: number;
  bufferSize: number;
}

const DEFAULT_CONFIG: ViewerTemporalProjectionConfig = {
  bufferDelayMs: 1000 / 30,
  maxSampleGapMs: 120,
  maxSamples: 3
};

const EMPTY_STATUS: ViewerTemporalProjectionStatus = {
  mode: 'raw',
  state: 'empty',
  fallbackReason: 'insufficient_samples',
  sourceSampleIds: [],
  sampleAgeMs: 0,
  projectionLatencyMs: 0,
  interpolationAlpha: 1,
  bufferSize: 0
};

export class ViewerTemporalProjectionBuffer {
  private readonly config: ViewerTemporalProjectionConfig;
  private samples: ViewerTemporalProjectionSample[] = [];
  private mode: ViewerTemporalProjectionMode = 'raw';
  private pendingFallbackReason: ViewerTemporalProjectionFallbackReason = 'none';
  private status: ViewerTemporalProjectionStatus = EMPTY_STATUS;

  constructor(config: Partial<ViewerTemporalProjectionConfig> = {}) {
    this.config = {
      bufferDelayMs: finiteNonNegative(config.bufferDelayMs, DEFAULT_CONFIG.bufferDelayMs),
      maxSampleGapMs: Math.max(1, finiteNonNegative(config.maxSampleGapMs, DEFAULT_CONFIG.maxSampleGapMs)),
      maxSamples: Math.max(2, Math.floor(finiteNonNegative(config.maxSamples, DEFAULT_CONFIG.maxSamples)))
    };
  }

  setMode(mode: ViewerTemporalProjectionMode): void {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.reset('discontinuity');
  }

  getMode(): ViewerTemporalProjectionMode {
    return this.mode;
  }

  getStatus(): ViewerTemporalProjectionStatus {
    return {
      ...this.status,
      sourceSampleIds: [...this.status.sourceSampleIds]
    };
  }

  getConfig(): ViewerTemporalProjectionConfig {
    return { ...this.config };
  }

  reset(reason: ViewerTemporalProjectionFallbackReason = 'discontinuity'): void {
    this.samples = [];
    this.pendingFallbackReason = reason;
    this.status = {
      ...EMPTY_STATUS,
      mode: this.mode,
      fallbackReason: reason
    };
  }

  ingest(sample: ViewerTemporalProjectionSample): boolean {
    if (!isValidSample(sample)) {
      this.reset('invalid_timestamp');
      return false;
    }

    const normalized = cloneSample(sample);
    const latest = this.samples[this.samples.length - 1];

    if (latest?.sampleId === normalized.sampleId) {
      return false;
    }

    if (latest && normalized.observedAtMs <= latest.observedAtMs) {
      this.reset('invalid_timestamp');
    } else if (latest && normalized.discontinuityToken !== latest.discontinuityToken) {
      this.reset('discontinuity');
    } else if (latest && !hasCompatibleTopology(latest, normalized)) {
      this.reset('topology_change');
    }

    this.samples.push(normalized);
    while (this.samples.length > this.config.maxSamples) {
      this.samples.shift();
    }

    return true;
  }

  project(renderTimestampMs: number): ViewerTemporalProjectionFrame | null {
    const latest = this.samples[this.samples.length - 1];

    if (!latest || !Number.isFinite(renderTimestampMs)) {
      this.status = {
        ...EMPTY_STATUS,
        mode: this.mode,
        fallbackReason: latest
          ? 'invalid_timestamp'
          : this.pendingFallbackReason === 'none'
            ? 'insufficient_samples'
            : this.pendingFallbackReason,
        bufferSize: this.samples.length
      };
      return null;
    }

    if (this.mode === 'raw') {
      return this.createRawFrame(latest, renderTimestampMs, 'none');
    }

    if (this.samples.length < 2) {
      return this.createRawFrame(
        latest,
        renderTimestampMs,
        this.pendingFallbackReason === 'none' ? 'insufficient_samples' : this.pendingFallbackReason
      );
    }

    const previous = this.samples[this.samples.length - 2];
    const sampleGapMs = latest.observedAtMs - previous.observedAtMs;

    if (sampleGapMs <= 0 || sampleGapMs > this.config.maxSampleGapMs) {
      return this.createRawFrame(latest, renderTimestampMs, 'sample_gap');
    }

    if (previous.discontinuityToken !== latest.discontinuityToken) {
      return this.createRawFrame(latest, renderTimestampMs, 'discontinuity');
    }

    if (!hasCompatibleTopology(previous, latest)) {
      return this.createRawFrame(latest, renderTimestampMs, 'topology_change');
    }

    const requestedTimestampMs = renderTimestampMs - this.config.bufferDelayMs;
    const targetTimestampMs = clamp(requestedTimestampMs, previous.observedAtMs, latest.observedAtMs);
    const alpha = clamp((targetTimestampMs - previous.observedAtMs) / sampleGapMs, 0, 1);
    const bodyTransforms = interpolateBodyTransforms(previous.bodyTransforms, latest.bodyTransforms, alpha);
    const jointAngles = interpolateJointAngles(previous.jointAngles, latest.jointAngles, alpha);
    const centerOfMass = interpolateOptionalVector(previous.centerOfMass, latest.centerOfMass, alpha);
    const projectedPhysicsTimestampMs = lerp(previous.physicsTimestampMs, latest.physicsTimestampMs, alpha);
    const projectedObservedTimestampMs = lerp(previous.observedAtMs, latest.observedAtMs, alpha);
    const metrics = createMetrics({
      renderTimestampMs,
      projectedObservedTimestampMs,
      latest,
      bodyTransforms,
      jointAngles,
      alpha
    });
    const frame: ViewerTemporalProjectionFrame = {
      mode: this.mode,
      state: 'reconstructed',
      fallbackReason: 'none',
      renderTimestampMs,
      projectedPhysicsTimestampMs,
      projectedObservedTimestampMs,
      sourceSampleIds: [previous.sampleId, latest.sampleId],
      discreteStateSourceSampleId: alpha < 1 ? previous.sampleId : latest.sampleId,
      discontinuityToken: latest.discontinuityToken,
      bodyTransforms,
      jointAngles,
      centerOfMass,
      metrics,
      bufferSize: this.samples.length
    };

    this.pendingFallbackReason = 'none';
    this.status = createStatus(frame);
    return frame;
  }

  private createRawFrame(
    latest: ViewerTemporalProjectionSample,
    renderTimestampMs: number,
    fallbackReason: ViewerTemporalProjectionFallbackReason
  ): ViewerTemporalProjectionFrame {
    const metrics = createMetrics({
      renderTimestampMs,
      projectedObservedTimestampMs: latest.observedAtMs,
      latest,
      bodyTransforms: latest.bodyTransforms,
      jointAngles: latest.jointAngles,
      alpha: 1
    });
    const frame: ViewerTemporalProjectionFrame = {
      mode: this.mode,
      state: fallbackReason === 'none' ? 'raw' : 'fallback',
      fallbackReason,
      renderTimestampMs,
      projectedPhysicsTimestampMs: latest.physicsTimestampMs,
      projectedObservedTimestampMs: latest.observedAtMs,
      sourceSampleIds: [latest.sampleId],
      discreteStateSourceSampleId: latest.sampleId,
      discontinuityToken: latest.discontinuityToken,
      bodyTransforms: cloneBodyTransforms(latest.bodyTransforms),
      jointAngles: { ...latest.jointAngles },
      centerOfMass: latest.centerOfMass ? { ...latest.centerOfMass } : null,
      metrics,
      bufferSize: this.samples.length
    };

    this.pendingFallbackReason = 'none';
    this.status = createStatus(frame);
    return frame;
  }
}

export function interpolateJointAngle(previous: number, next: number, alpha: number): number {
  if (!Number.isFinite(previous) || !Number.isFinite(next)) {
    return Number.isFinite(next) ? next : previous;
  }

  const delta = Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
  return previous + delta * clamp(alpha, 0, 1);
}

export function interpolateQuaternion(
  previous: BodyTransform['rotation'],
  next: BodyTransform['rotation'],
  alpha: number
): BodyTransform['rotation'] {
  const t = clamp(alpha, 0, 1);
  let dot = previous.x * next.x + previous.y * next.y + previous.z * next.z + previous.w * next.w;
  const target = dot < 0
    ? { x: -next.x, y: -next.y, z: -next.z, w: -next.w }
    : next;

  dot = Math.abs(dot);
  if (dot > 0.9995) {
    return normalizeQuaternion({
      x: lerp(previous.x, target.x, t),
      y: lerp(previous.y, target.y, t),
      z: lerp(previous.z, target.z, t),
      w: lerp(previous.w, target.w, t)
    });
  }

  const theta = Math.acos(clamp(dot, -1, 1));
  const sinTheta = Math.sin(theta);
  const previousWeight = Math.sin((1 - t) * theta) / sinTheta;
  const nextWeight = Math.sin(t * theta) / sinTheta;

  return normalizeQuaternion({
    x: previous.x * previousWeight + target.x * nextWeight,
    y: previous.y * previousWeight + target.y * nextWeight,
    z: previous.z * previousWeight + target.z * nextWeight,
    w: previous.w * previousWeight + target.w * nextWeight
  });
}

function interpolateBodyTransforms(
  previous: readonly BodyTransform[],
  next: readonly BodyTransform[],
  alpha: number
): BodyTransform[] {
  const previousByName = new Map(previous.map((transform) => [transform.bodyName, transform]));

  return next.map((nextTransform) => {
    const previousTransform = previousByName.get(nextTransform.bodyName) ?? nextTransform;

    return {
      ...nextTransform,
      position: {
        x: lerp(previousTransform.position.x, nextTransform.position.x, alpha),
        y: lerp(previousTransform.position.y, nextTransform.position.y, alpha),
        z: lerp(previousTransform.position.z, nextTransform.position.z, alpha)
      },
      rotation: interpolateQuaternion(previousTransform.rotation, nextTransform.rotation, alpha),
      scale: nextTransform.scale
        ? {
            x: lerp(previousTransform.scale?.x ?? nextTransform.scale.x, nextTransform.scale.x, alpha),
            y: lerp(previousTransform.scale?.y ?? nextTransform.scale.y, nextTransform.scale.y, alpha),
            z: lerp(previousTransform.scale?.z ?? nextTransform.scale.z, nextTransform.scale.z, alpha)
          }
        : undefined,
      metadata:
        alpha < 1
          ? previousTransform.metadata
            ? { ...previousTransform.metadata }
            : undefined
          : nextTransform.metadata
            ? { ...nextTransform.metadata }
            : undefined
    };
  });
}

function interpolateJointAngles(
  previous: Readonly<Record<string, number>>,
  next: Readonly<Record<string, number>>,
  alpha: number
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(next).map(([jointName, nextValue]) => [
      jointName,
      interpolateJointAngle(previous[jointName] ?? nextValue, nextValue, alpha)
    ])
  );
}

function interpolateOptionalVector(
  previous: BodyTransform['position'] | null | undefined,
  next: BodyTransform['position'] | null | undefined,
  alpha: number
): BodyTransform['position'] | null {
  if (!next) {
    return previous ? { ...previous } : null;
  }

  if (!previous) {
    return { ...next };
  }

  return {
    x: lerp(previous.x, next.x, alpha),
    y: lerp(previous.y, next.y, alpha),
    z: lerp(previous.z, next.z, alpha)
  };
}

function createMetrics(input: {
  renderTimestampMs: number;
  projectedObservedTimestampMs: number;
  latest: ViewerTemporalProjectionSample;
  bodyTransforms: readonly BodyTransform[];
  jointAngles: Readonly<Record<string, number>>;
  alpha: number;
}): ViewerTemporalProjectionMetrics {
  const positionError = maxPositionError(input.bodyTransforms, input.latest.bodyTransforms);
  const rotationErrorRadians = maxRotationError(input.bodyTransforms, input.latest.bodyTransforms);
  const jointAngleErrorRadians = maxJointAngleError(input.jointAngles, input.latest.jointAngles);

  return {
    sampleAgeMs: Math.max(0, input.renderTimestampMs - input.latest.observedAtMs),
    projectionLatencyMs: Math.max(0, input.renderTimestampMs - input.projectedObservedTimestampMs),
    interpolationAlpha: input.alpha,
    positionError,
    rotationErrorRadians,
    jointAngleErrorRadians,
    correctionMagnitude: Math.max(positionError, rotationErrorRadians, jointAngleErrorRadians)
  };
}

function maxPositionError(left: readonly BodyTransform[], right: readonly BodyTransform[]): number {
  const rightByName = new Map(right.map((transform) => [transform.bodyName, transform]));
  return left.reduce((maximum, transform) => {
    const target = rightByName.get(transform.bodyName);
    if (!target) return maximum;
    const dx = transform.position.x - target.position.x;
    const dy = transform.position.y - target.position.y;
    const dz = transform.position.z - target.position.z;
    return Math.max(maximum, Math.hypot(dx, dy, dz));
  }, 0);
}

function maxRotationError(left: readonly BodyTransform[], right: readonly BodyTransform[]): number {
  const rightByName = new Map(right.map((transform) => [transform.bodyName, transform]));
  return left.reduce((maximum, transform) => {
    const target = rightByName.get(transform.bodyName);
    if (!target) return maximum;
    const dot = Math.abs(
      transform.rotation.x * target.rotation.x +
      transform.rotation.y * target.rotation.y +
      transform.rotation.z * target.rotation.z +
      transform.rotation.w * target.rotation.w
    );
    return Math.max(maximum, 2 * Math.acos(clamp(dot, -1, 1)));
  }, 0);
}

function maxJointAngleError(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>
): number {
  return Object.entries(left).reduce((maximum, [jointName, value]) => {
    const target = right[jointName];
    if (!Number.isFinite(target)) return maximum;
    return Math.max(maximum, Math.abs(Math.atan2(Math.sin(target - value), Math.cos(target - value))));
  }, 0);
}

function createStatus(frame: ViewerTemporalProjectionFrame): ViewerTemporalProjectionStatus {
  return {
    mode: frame.mode,
    state: frame.state,
    fallbackReason: frame.fallbackReason,
    sourceSampleIds: [...frame.sourceSampleIds],
    sampleAgeMs: frame.metrics.sampleAgeMs,
    projectionLatencyMs: frame.metrics.projectionLatencyMs,
    interpolationAlpha: frame.metrics.interpolationAlpha,
    bufferSize: frame.bufferSize
  };
}

function isValidSample(sample: ViewerTemporalProjectionSample): boolean {
  return Boolean(
    sample.sampleId &&
    sample.discontinuityToken &&
    Number.isFinite(sample.physicsTimestampMs) &&
    Number.isFinite(sample.observedAtMs)
  );
}

function hasCompatibleTopology(
  previous: ViewerTemporalProjectionSample,
  next: ViewerTemporalProjectionSample
): boolean {
  const previousBodies = previous.bodyTransforms.map((transform) => transform.bodyName).sort().join('|');
  const nextBodies = next.bodyTransforms.map((transform) => transform.bodyName).sort().join('|');
  const previousJoints = Object.keys(previous.jointAngles).sort().join('|');
  const nextJoints = Object.keys(next.jointAngles).sort().join('|');
  return previousBodies === nextBodies && previousJoints === nextJoints;
}

function cloneSample(sample: ViewerTemporalProjectionSample): ViewerTemporalProjectionSample {
  return {
    ...sample,
    bodyTransforms: cloneBodyTransforms(sample.bodyTransforms),
    jointAngles: { ...sample.jointAngles },
    centerOfMass: sample.centerOfMass ? { ...sample.centerOfMass } : null
  };
}

function cloneBodyTransforms(transforms: readonly BodyTransform[]): BodyTransform[] {
  return transforms.map((transform) => ({
    ...transform,
    position: { ...transform.position },
    rotation: { ...transform.rotation },
    scale: transform.scale ? { ...transform.scale } : undefined,
    metadata: transform.metadata ? { ...transform.metadata } : undefined
  }));
}

function normalizeQuaternion(value: BodyTransform['rotation']): BodyTransform['rotation'] {
  const length = Math.hypot(value.x, value.y, value.z, value.w) || 1;
  return { x: value.x / length, y: value.y / length, z: value.z / length, w: value.w / length };
}

function finiteNonNegative(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function lerp(previous: number, next: number, alpha: number): number {
  return previous + (next - previous) * clamp(alpha, 0, 1);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
