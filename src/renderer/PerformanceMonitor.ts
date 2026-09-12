const ROBOT_VIEWER_PROFILER_SMOOTHING = 0.12;
const ROBOT_VIEWER_PROFILER_HISTORY_MS = 60_000;

export interface Viewer3DProfilerSample {
  time: number;
  rafFrameRate: number;
  globalRafFrameRate: number;
  renderFrameRate: number;
  drawMs: number;
  loopMs: number;
  schedulerWaitMs: number;
  longTaskMs: number;
}

export interface Viewer3DPerformanceSummary {
  sampleCount: number;
  averageRafFrameRate: number;
  onePercentLowRafFrameRate: number;
  frameTimeMs: Viewer3DPerformancePercentiles;
  drawMs: Viewer3DPerformancePercentiles;
  loopMs: Viewer3DPerformancePercentiles;
  schedulerWaitMs: Viewer3DPerformancePercentiles;
  longTaskCount: number;
  longTaskTotalMs: number;
}

export interface Viewer3DPerformancePercentiles {
  p50: number;
  p95: number;
  p99: number;
}

export class PerformanceMonitor {
  readonly samples: Viewer3DProfilerSample[] = [];
  readonly signalCounts = new Map<string, number>();

  markSignal(label: string): void {
    const normalizedLabel = label.trim();

    if (!normalizedLabel) {
      return;
    }

    this.signalCounts.set(normalizedLabel, (this.signalCounts.get(normalizedLabel) ?? 0) + 1);
  }

  clearSignals(): void {
    this.signalCounts.clear();
  }

  recordSample(sample: Viewer3DProfilerSample): void {
    this.samples.push(sample);

    const cutoff = sample.time - ROBOT_VIEWER_PROFILER_HISTORY_MS;

    while (this.samples.length > 0 && (this.samples[0]?.time ?? 0) < cutoff) {
      this.samples.shift();
    }
  }

  updateAverage(currentAverage: number, sampleMs: number): number {
    if (!Number.isFinite(sampleMs) || sampleMs < 0) {
      return currentAverage;
    }

    if (currentAverage <= 0) {
      return sampleMs;
    }

    return currentAverage * (1 - ROBOT_VIEWER_PROFILER_SMOOTHING) + sampleMs * ROBOT_VIEWER_PROFILER_SMOOTHING;
  }

  formatSignals(elapsedSeconds = 1): string {
    if (this.signalCounts.size === 0) {
      return '-';
    }

    const validElapsedSeconds =
      Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? elapsedSeconds : 1;

    return [...this.signalCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([label, count]) => `${label}:${Math.round(count / validElapsedSeconds)}`)
      .join(' ');
  }

  getSummary(): Viewer3DPerformanceSummary {
    return summarizeViewer3DPerformance(this.samples);
  }
}

export function summarizeViewer3DPerformance(
  samples: readonly Viewer3DProfilerSample[]
): Viewer3DPerformanceSummary {
  const rafFrameRates = finiteNonNegativeValues(samples.map((sample) => sample.rafFrameRate));
  const frameTimes = rafFrameRates.filter((value) => value > 0).map((value) => 1000 / value);
  const longTaskDurations = finiteNonNegativeValues(samples.map((sample) => sample.longTaskMs)).filter(
    (value) => value > 0
  );

  return {
    sampleCount: samples.length,
    averageRafFrameRate: average(rafFrameRates),
    onePercentLowRafFrameRate: percentile(rafFrameRates, 0.01),
    frameTimeMs: percentiles(frameTimes),
    drawMs: percentiles(samples.map((sample) => sample.drawMs)),
    loopMs: percentiles(samples.map((sample) => sample.loopMs)),
    schedulerWaitMs: percentiles(samples.map((sample) => sample.schedulerWaitMs)),
    longTaskCount: longTaskDurations.length,
    longTaskTotalMs: longTaskDurations.reduce((total, value) => total + value, 0)
  };
}

function percentiles(values: readonly number[]): Viewer3DPerformancePercentiles {
  return {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99)
  };
}

function percentile(values: readonly number[], quantile: number): number {
  const sorted = finiteNonNegativeValues(values).sort((left, right) => left - right);
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.ceil(Math.min(1, Math.max(0, quantile)) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function finiteNonNegativeValues(values: readonly number[]): number[] {
  return values.filter((value) => Number.isFinite(value) && value >= 0);
}
