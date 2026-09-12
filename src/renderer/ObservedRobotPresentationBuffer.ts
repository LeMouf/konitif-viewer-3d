import { interpolateJointAngle } from './TemporalProjectionModel.js';

export type ObservedRobotPresentationMode = 'raw' | 'interpolated';

export type ObservedRobotPresentationFallbackReason =
  | 'none'
  | 'insufficient_samples'
  | 'invalid_sample'
  | 'sample_gap'
  | 'discontinuity';

export interface ObservedRobotPresentationSample {
  sampleId: string;
  connectionId: string;
  sourceObservedAtSeconds: number | null;
  receivedAtMs: number;
  jointValues: Readonly<Record<string, number>>;
}

export interface ObservedRobotPresentationConfig {
  minimumTransitionMs: number;
  maximumTransitionMs: number;
  maximumSampleGapMs: number;
}

export interface ObservedRobotPresentationFrame {
  mode: ObservedRobotPresentationMode;
  state: 'raw' | 'interpolated' | 'fallback';
  fallbackReason: ObservedRobotPresentationFallbackReason;
  provenance: 'observed-raw' | 'observed-interpolated';
  sourceSampleIds: readonly string[];
  connectionId: string;
  sourceObservedAtSeconds: number | null;
  renderedAtMs: number;
  latestReceivedAtMs: number;
  interpolationAlpha: number;
  transitionDurationMs: number;
  active: boolean;
  jointValues: Readonly<Record<string, number>>;
}

export interface ObservedRobotPresentationStatus {
  mode: ObservedRobotPresentationMode;
  state: ObservedRobotPresentationFrame['state'] | 'empty';
  fallbackReason: ObservedRobotPresentationFallbackReason;
  provenance: ObservedRobotPresentationFrame['provenance'] | null;
  sourceSampleIds: readonly string[];
  interpolationAlpha: number;
  transitionDurationMs: number;
  active: boolean;
}

const DEFAULT_CONFIG: ObservedRobotPresentationConfig = {
  minimumTransitionMs: 16,
  maximumTransitionMs: 120,
  maximumSampleGapMs: 250
};

const EMPTY_STATUS: ObservedRobotPresentationStatus = {
  mode: 'interpolated',
  state: 'empty',
  fallbackReason: 'insufficient_samples',
  provenance: null,
  sourceSampleIds: [],
  interpolationAlpha: 1,
  transitionDurationMs: 0,
  active: false
};

/**
 * Reconstructs only the visible pose of an observed robot between admitted
 * telemetry samples. Source observations remain immutable and never inherit
 * values produced by this presentation buffer.
 *
 * The transition clock is the local receipt clock. The upstream
 * sourceObservedAtSeconds value is retained as provenance, but it is not used
 * for interpolation because its clock domain is not part of the observation
 * contract yet.
 */
export class ObservedRobotPresentationBuffer {
  private readonly config: ObservedRobotPresentationConfig;
  private mode: ObservedRobotPresentationMode = 'interpolated';
  private latestSample: ObservedRobotPresentationSample | null = null;
  private transitionStartValues: Readonly<Record<string, number>> = {};
  private transitionSourceSampleIds: readonly string[] = [];
  private transitionStartedAtMs = 0;
  private transitionDurationMs = 0;
  private pendingFallbackReason: ObservedRobotPresentationFallbackReason = 'insufficient_samples';
  private status: ObservedRobotPresentationStatus = EMPTY_STATUS;

  constructor(config: Partial<ObservedRobotPresentationConfig> = {}) {
    const minimumTransitionMs = finitePositive(
      config.minimumTransitionMs,
      DEFAULT_CONFIG.minimumTransitionMs
    );
    const maximumTransitionMs = Math.max(
      minimumTransitionMs,
      finitePositive(config.maximumTransitionMs, DEFAULT_CONFIG.maximumTransitionMs)
    );
    this.config = {
      minimumTransitionMs,
      maximumTransitionMs,
      maximumSampleGapMs: Math.max(
        maximumTransitionMs,
        finitePositive(config.maximumSampleGapMs, DEFAULT_CONFIG.maximumSampleGapMs)
      )
    };
  }

  setMode(mode: ObservedRobotPresentationMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.reset('discontinuity');
  }

  getMode(): ObservedRobotPresentationMode {
    return this.mode;
  }

  getStatus(): ObservedRobotPresentationStatus {
    return { ...this.status, sourceSampleIds: [...this.status.sourceSampleIds] };
  }

  getConfig(): ObservedRobotPresentationConfig {
    return { ...this.config };
  }

  reset(reason: ObservedRobotPresentationFallbackReason = 'discontinuity'): void {
    this.latestSample = null;
    this.transitionStartValues = {};
    this.transitionSourceSampleIds = [];
    this.transitionStartedAtMs = 0;
    this.transitionDurationMs = 0;
    this.pendingFallbackReason = reason;
    this.status = {
      ...EMPTY_STATUS,
      mode: this.mode,
      fallbackReason: reason
    };
  }

  ingest(sample: ObservedRobotPresentationSample): boolean {
    const normalized = normalizeSample(sample);
    if (!normalized) {
      this.reset('invalid_sample');
      return false;
    }

    const previous = this.latestSample;
    if (
      previous?.sampleId === normalized.sampleId &&
      previous.connectionId === normalized.connectionId
    ) {
      return false;
    }

    if (previous && previous.connectionId !== normalized.connectionId) {
      this.reset('discontinuity');
      this.acceptFirstSample(normalized, 'discontinuity');
      return true;
    }

    if (!previous) {
      this.acceptFirstSample(normalized, this.pendingFallbackReason);
      return true;
    }

    const sampleGapMs = normalized.receivedAtMs - previous.receivedAtMs;
    if (sampleGapMs < 0) {
      this.reset('invalid_sample');
      this.acceptFirstSample(normalized, 'invalid_sample');
      return true;
    }

    if (sampleGapMs > this.config.maximumSampleGapMs) {
      this.acceptFirstSample(normalized, 'sample_gap');
      return true;
    }

    const currentFrame = this.project(normalized.receivedAtMs);
    this.transitionStartValues = Object.fromEntries(
      Object.entries(normalized.jointValues).map(([jointName, nextValue]) => [
        jointName,
        currentFrame?.jointValues[jointName] ?? previous.jointValues[jointName] ?? nextValue
      ])
    );
    this.transitionSourceSampleIds = uniqueTail(
      [...(currentFrame?.sourceSampleIds ?? [previous.sampleId]), normalized.sampleId],
      3
    );
    this.latestSample = normalized;
    this.transitionStartedAtMs = normalized.receivedAtMs;
    this.transitionDurationMs = clamp(
      sampleGapMs,
      this.config.minimumTransitionMs,
      this.config.maximumTransitionMs
    );
    this.pendingFallbackReason = 'none';
    return true;
  }

  project(renderedAtMs: number): ObservedRobotPresentationFrame | null {
    const latest = this.latestSample;
    if (!latest || !Number.isFinite(renderedAtMs)) {
      this.status = {
        ...EMPTY_STATUS,
        mode: this.mode,
        fallbackReason: latest ? 'invalid_sample' : this.pendingFallbackReason
      };
      return null;
    }

    if (this.mode === 'raw' || this.transitionDurationMs <= 0) {
      const fallbackReason =
        this.mode === 'raw' ? 'none' : this.pendingFallbackReason;
      const frame: ObservedRobotPresentationFrame = {
        mode: this.mode,
        state: fallbackReason === 'none' ? 'raw' : 'fallback',
        fallbackReason,
        provenance: 'observed-raw',
        sourceSampleIds: [latest.sampleId],
        connectionId: latest.connectionId,
        sourceObservedAtSeconds: latest.sourceObservedAtSeconds,
        renderedAtMs,
        latestReceivedAtMs: latest.receivedAtMs,
        interpolationAlpha: 1,
        transitionDurationMs: 0,
        active: false,
        jointValues: { ...latest.jointValues }
      };
      this.status = createStatus(frame);
      return frame;
    }

    const interpolationAlpha = clamp(
      (renderedAtMs - this.transitionStartedAtMs) / this.transitionDurationMs,
      0,
      1
    );
    const active = interpolationAlpha < 1;
    const frame: ObservedRobotPresentationFrame = {
      mode: this.mode,
      state: 'interpolated',
      fallbackReason: 'none',
      provenance: 'observed-interpolated',
      sourceSampleIds: active ? [...this.transitionSourceSampleIds] : [latest.sampleId],
      connectionId: latest.connectionId,
      sourceObservedAtSeconds: latest.sourceObservedAtSeconds,
      renderedAtMs,
      latestReceivedAtMs: latest.receivedAtMs,
      interpolationAlpha,
      transitionDurationMs: this.transitionDurationMs,
      active,
      jointValues: Object.fromEntries(
        Object.entries(latest.jointValues).map(([jointName, nextValue]) => [
          jointName,
          interpolateJointAngle(
            this.transitionStartValues[jointName] ?? nextValue,
            nextValue,
            interpolationAlpha
          )
        ])
      )
    };
    this.status = createStatus(frame);
    return frame;
  }

  isActive(renderedAtMs: number): boolean {
    return Boolean(
      this.mode === 'interpolated' &&
      this.latestSample &&
      this.transitionDurationMs > 0 &&
      Number.isFinite(renderedAtMs) &&
      renderedAtMs < this.transitionStartedAtMs + this.transitionDurationMs
    );
  }

  private acceptFirstSample(
    sample: ObservedRobotPresentationSample,
    fallbackReason: ObservedRobotPresentationFallbackReason
  ): void {
    this.latestSample = sample;
    this.transitionStartValues = { ...sample.jointValues };
    this.transitionSourceSampleIds = [sample.sampleId];
    this.transitionStartedAtMs = sample.receivedAtMs;
    this.transitionDurationMs = 0;
    this.pendingFallbackReason =
      fallbackReason === 'none' ? 'insufficient_samples' : fallbackReason;
  }
}

function normalizeSample(
  sample: ObservedRobotPresentationSample
): ObservedRobotPresentationSample | null {
  if (
    !sample.sampleId ||
    !sample.connectionId ||
    !Number.isFinite(sample.receivedAtMs) ||
    (sample.sourceObservedAtSeconds !== null && !Number.isFinite(sample.sourceObservedAtSeconds))
  ) {
    return null;
  }

  const jointValues = Object.fromEntries(
    Object.entries(sample.jointValues).filter((entry): entry is [string, number] => {
      const [jointName, value] = entry;
      return Boolean(jointName) && typeof value === 'number' && Number.isFinite(value);
    })
  );
  if (Object.keys(jointValues).length === 0) return null;

  return {
    ...sample,
    jointValues
  };
}

function createStatus(frame: ObservedRobotPresentationFrame): ObservedRobotPresentationStatus {
  return {
    mode: frame.mode,
    state: frame.state,
    fallbackReason: frame.fallbackReason,
    provenance: frame.provenance,
    sourceSampleIds: [...frame.sourceSampleIds],
    interpolationAlpha: frame.interpolationAlpha,
    transitionDurationMs: frame.transitionDurationMs,
    active: frame.active
  };
}

function uniqueTail(values: readonly string[], maximum: number): string[] {
  const unique = [...new Set(values)];
  return unique.slice(Math.max(0, unique.length - maximum));
}

function finitePositive(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
