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
  /** Explicit host guarantee: source timestamps are monotonic within this connection. */
  sourceClock?: 'monotonic';
  receivedAtMs: number;
  jointValues: Readonly<Record<string, number>>;
}

export interface ObservedRobotPresentationConfig {
  minimumTransitionMs: number;
  maximumTransitionMs: number;
  maximumSampleGapMs: number;
  presentationDelayMs: number;
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
  maximumTransitionMs: 200,
  maximumSampleGapMs: 500,
  presentationDelayMs: 450
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
 * Buffered playback trails the local receipt clock so both interpolation
 * endpoints are already admitted observations, not predicted destinations.
 * Without an explicit source-clock guarantee, timing uses local receipts.
 * A declared monotonic source clock is mapped relatively onto the first local
 * receipt, preserving sensor spacing through transport bursts. Clock epochs
 * are never compared, and session changes discard the mapping.
 */
export class ObservedRobotPresentationBuffer {
  private readonly config: ObservedRobotPresentationConfig;
  private mode: ObservedRobotPresentationMode = 'interpolated';
  private latestSample: ObservedRobotPresentationSample | null = null;
  private transitionStartValues: Readonly<Record<string, number>> = {};
  private transitionSourceSampleIds: readonly string[] = [];
  private transitionStartedAtMs = 0;
  private transitionDurationMs = 0;
  private receiptCadenceMs: number[] = [];
  private bufferedSamples: (ObservedRobotPresentationSample & { presentationAtMs: number })[] = [];
  private previousBufferedSample: (ObservedRobotPresentationSample & { presentationAtMs: number }) | null = null;
  private sourceClockAnchor: { sourceSeconds: number; receiptMs: number } | null = null;
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
      presentationDelayMs: typeof config.presentationDelayMs === 'number' && Number.isFinite(config.presentationDelayMs)
        ? clamp(config.presentationDelayMs, 0, 500)
        : DEFAULT_CONFIG.presentationDelayMs,
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
    this.receiptCadenceMs = [];
    this.bufferedSamples = [];
    this.previousBufferedSample = null;
    this.sourceClockAnchor = null;
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

    const sourceTimed = previous.sourceClock === 'monotonic' && normalized.sourceClock === 'monotonic' &&
      previous.sourceObservedAtSeconds !== null && normalized.sourceObservedAtSeconds !== null;
    const sourceGapMs = sourceTimed
      ? (normalized.sourceObservedAtSeconds! - previous.sourceObservedAtSeconds!) * 1000 : sampleGapMs;
    if (sourceTimed && sourceGapMs <= 0) {
      this.reset('invalid_sample');
      this.acceptFirstSample(normalized, 'invalid_sample');
      return true;
    }
    if (previous.sourceClock !== normalized.sourceClock || sourceGapMs > this.config.maximumSampleGapMs) {
      this.acceptFirstSample(normalized, 'sample_gap');
      return true;
    }

    if (this.mode === 'interpolated' && this.config.presentationDelayMs > 0) {
      const presentationAtMs = this.resolvePresentationTime(normalized);
      // Undeclared receipt-clock bursts cannot provide distinct timing.
      // Source-clock bursts retain every distinct admitted pose.
      if (this.bufferedSamples.at(-1)?.presentationAtMs === presentationAtMs) this.bufferedSamples.pop();
      this.bufferedSamples.push({ ...normalized, presentationAtMs });
      if (this.bufferedSamples.length > 64) {
        this.previousBufferedSample = this.bufferedSamples[this.bufferedSamples.length - 65]!;
      }
      this.bufferedSamples = this.bufferedSamples.slice(-64);
      this.latestSample = normalized;
      this.pendingFallbackReason = 'none';
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
    // A transport burst is not a new sensor cadence: keep the recent cadence
    // instead of turning several queued observations into near-instant jumps.
    if (sampleGapMs >= this.config.minimumTransitionMs) {
      this.receiptCadenceMs = [...this.receiptCadenceMs, sampleGapMs].slice(-5);
    }
    const sortedCadence = [...this.receiptCadenceMs].sort((left, right) => left - right);
    const middle = Math.floor(sortedCadence.length / 2);
    const cadenceMs = sortedCadence.length === 0
      ? sampleGapMs
      : sortedCadence.length % 2 === 1
        ? sortedCadence[middle]!
        : (sortedCadence[middle - 1]! + sortedCadence[middle]!) / 2;
    this.transitionDurationMs = clamp(
      cadenceMs,
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

    if (this.mode === 'interpolated' && this.config.presentationDelayMs > 0) {
      return this.projectBuffered(renderedAtMs);
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
    if (this.mode === 'interpolated' && this.config.presentationDelayMs > 0) {
      return Boolean(this.latestSample && this.bufferedSamples.length > 1 &&
        Number.isFinite(renderedAtMs) &&
        renderedAtMs - this.config.presentationDelayMs < this.bufferedSamples.at(-1)!.presentationAtMs);
    }
    return Boolean(
      this.mode === 'interpolated' &&
      this.latestSample &&
      this.transitionDurationMs > 0 &&
      Number.isFinite(renderedAtMs) &&
      renderedAtMs < this.transitionStartedAtMs + this.transitionDurationMs
    );
  }

  private projectBuffered(renderedAtMs: number): ObservedRobotPresentationFrame {
    const latest = this.latestSample!;
    const targetMs = renderedAtMs - this.config.presentationDelayMs;
    while (this.bufferedSamples.length > 2 && this.bufferedSamples[1]!.presentationAtMs <= targetMs) {
      this.previousBufferedSample = this.bufferedSamples.shift()!;
    }
    const left = this.bufferedSamples[0]!;
    const right = this.bufferedSamples[1];
    const latestTime = this.bufferedSamples.at(-1)!.presentationAtMs;
    const hasSegment = Boolean(right && targetMs >= left.presentationAtMs && targetMs <= right.presentationAtMs);
    const endpoint = targetMs < left.presentationAtMs ? left : latest;
    const durationMs = hasSegment ? right!.presentationAtMs - left.presentationAtMs : 0;
    const alpha = hasSegment ? clamp((targetMs - left.presentationAtMs) / durationMs, 0, 1) : 1;
    const active = this.isActive(renderedAtMs);
    const previous = this.previousBufferedSample;
    const following = this.bufferedSamples[2];
    const frame: ObservedRobotPresentationFrame = {
      mode: this.mode,
      state: hasSegment ? 'interpolated' : 'fallback',
      fallbackReason: hasSegment ? 'none' : targetMs > latestTime ? 'sample_gap'
        : this.pendingFallbackReason === 'none' ? 'insufficient_samples' : this.pendingFallbackReason,
      provenance: hasSegment ? 'observed-interpolated' : 'observed-raw',
      sourceSampleIds: hasSegment ? [previous, left, right, following].filter((sample): sample is NonNullable<typeof sample> => Boolean(sample)).map(sample => sample.sampleId) : [endpoint.sampleId],
      connectionId: latest.connectionId,
      sourceObservedAtSeconds: hasSegment ? right!.sourceObservedAtSeconds : endpoint.sourceObservedAtSeconds,
      renderedAtMs,
      latestReceivedAtMs: latest.receivedAtMs,
      interpolationAlpha: alpha,
      transitionDurationMs: durationMs,
      active,
      jointValues: hasSegment ? Object.fromEntries(Object.entries(right!.jointValues).map(([name, value]) => [
        name, interpolateBufferedJoint(
          left.jointValues[name] ?? value, value, alpha, durationMs,
          previous?.jointValues[name], previous ? left.presentationAtMs - previous.presentationAtMs : null,
          following?.jointValues[name], following ? following.presentationAtMs - right!.presentationAtMs : null
        )
      ])) : { ...endpoint.jointValues }
    };
    this.status = createStatus(frame);
    return frame;
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
    this.receiptCadenceMs = [];
    this.sourceClockAnchor = sample.sourceClock === 'monotonic' && sample.sourceObservedAtSeconds !== null
      ? { sourceSeconds: sample.sourceObservedAtSeconds, receiptMs: sample.receivedAtMs } : null;
    this.bufferedSamples = [{ ...sample, presentationAtMs: sample.receivedAtMs }];
    this.previousBufferedSample = null;
    this.pendingFallbackReason =
      fallbackReason === 'none' ? 'insufficient_samples' : fallbackReason;
  }

  private resolvePresentationTime(sample: ObservedRobotPresentationSample): number {
    return this.sourceClockAnchor && sample.sourceClock === 'monotonic' && sample.sourceObservedAtSeconds !== null
      ? this.sourceClockAnchor.receiptMs + (sample.sourceObservedAtSeconds - this.sourceClockAnchor.sourceSeconds) * 1000
      : sample.receivedAtMs;
  }
}

function normalizeSample(
  sample: ObservedRobotPresentationSample
): ObservedRobotPresentationSample | null {
  if (
    !sample.sampleId ||
    !sample.connectionId ||
    (sample.sourceClock === 'monotonic' && sample.sourceObservedAtSeconds === null) ||
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

/** Shape-preserving Hermite interpolation using only admitted neighboring poses. */
function interpolateBufferedJoint(left: number, right: number, alpha: number, duration: number,
  previous: number | undefined, previousDuration: number | null,
  following: number | undefined, followingDuration: number | null): number {
  const delta = interpolateJointAngle(left, right, 1) - left;
  const secant = delta / duration;
  const tangent = (a: number, b: number, ha: number, hb: number) => {
    if (a * b <= 0) return 0;
    const w1 = 2 * hb + ha;
    const w2 = hb + 2 * ha;
    return (w1 + w2) / (w1 / a + w2 / b);
  };
  const start = previous !== undefined && previousDuration !== null && previousDuration > 0
    ? tangent((interpolateJointAngle(previous, left, 1) - previous) / previousDuration, secant, previousDuration, duration)
    : secant;
  const end = following !== undefined && followingDuration !== null && followingDuration > 0
    ? tangent(secant, (interpolateJointAngle(right, following, 1) - right) / followingDuration, duration, followingDuration)
    : secant;
  const t2 = alpha * alpha;
  const t3 = t2 * alpha;
  const offset = (-2 * t3 + 3 * t2) * delta + (t3 - 2 * t2 + alpha) * duration * start + (t3 - t2) * duration * end;
  return left + clamp(offset, Math.min(0, delta), Math.max(0, delta));
}
