import type { ViewerMetadata } from './ViewerMetadata.js';
import type { ViewerExperimentCollector } from './ViewerExperimentCollector.js';
import type { ViewerExperimentStart } from './ViewerExperimentPort.js';
import type { Viewer3DProfilerSample } from './PerformanceMonitor.js';
import type {
  ViewerTemporalProjectionConfig,
  ViewerTemporalProjectionFallbackReason,
  ViewerTemporalProjectionFrame,
  ViewerTemporalProjectionMode
} from './TemporalProjectionModel.js';

export interface ViewerTemporalProjectionExperimentStart extends ViewerExperimentStart {
  mode: ViewerTemporalProjectionMode;
  projectionConfig: ViewerTemporalProjectionConfig;
}

export interface ViewerTemporalProjectionPhysicsStep {
  observedAtMs: number;
  deltaSeconds: number;
  stepDurationMs: number;
  stepCount: number;
  simulatedTimeMs: number;
}

export class ViewerTemporalProjectionExperimentAdapter<Artifact, Snapshot> {
  private activeMode: ViewerTemporalProjectionMode | null = null;
  private conditionChanged = false;

  /** The supplied collector must be dedicated to this adapter and configured for its protocol. */
  constructor(private readonly recorder: ViewerExperimentCollector<Artifact, Snapshot>) {}

  start(input: ViewerTemporalProjectionExperimentStart): void {
    this.recorder.start({
      runId: input.runId,
      conditionId: input.mode,
      startedAtMs: input.startedAtMs,
      environment: {
        ...input.environment,
        adapter: 'workbench.viewer.temporal-projection',
        projectionConfig: {
          bufferDelayMs: input.projectionConfig.bufferDelayMs,
          maxSampleGapMs: input.projectionConfig.maxSampleGapMs,
          maxSamples: input.projectionConfig.maxSamples,
          extrapolation: false
        }
      }
    });
    this.activeMode = input.mode;
    this.conditionChanged = false;
  }

  markPhase(phaseId: string, observedAtMs: number, provenance: ViewerMetadata = {}): boolean {
    return this.recorder.markPhase(phaseId, observedAtMs, provenance);
  }

  recordPerformance(sample: Viewer3DProfilerSample): boolean {
    return this.recorder.record({
      observedAtMs: sample.time,
      metrics: {
        'render.raf_fps': sample.rafFrameRate,
        'render.fps': sample.renderFrameRate,
        'render.frame_time_ms': sample.rafFrameRate > 0 ? 1000 / sample.rafFrameRate : null,
        'render.draw_ms': sample.drawMs,
        'render.loop_ms': sample.loopMs,
        'render.scheduler_wait_ms': sample.schedulerWaitMs,
        'render.long_task_ms': sample.longTaskMs
      },
      provenance: { source: 'viewer-performance-monitor' }
    });
  }

  recordPhysicsStep(step: ViewerTemporalProjectionPhysicsStep): boolean {
    return this.recorder.record({
      observedAtMs: step.observedAtMs,
      metrics: {
        'physics.tick_hz': step.deltaSeconds > 0 ? 1 / step.deltaSeconds : null,
        'physics.step_ms': step.stepDurationMs
      },
      provenance: {
        source: 'physics-service',
        stepCount: step.stepCount,
        simulatedTimeMs: step.simulatedTimeMs
      }
    });
  }

  recordProjection(frame: ViewerTemporalProjectionFrame): boolean {
    if (this.activeMode && frame.mode !== this.activeMode) {
      this.conditionChanged = true;
    }

    return this.recorder.record({
      observedAtMs: frame.renderTimestampMs,
      metrics: {
        'projection.sample_age_ms': frame.metrics.sampleAgeMs,
        'projection.latency_ms': frame.metrics.projectionLatencyMs,
        'projection.alpha': frame.metrics.interpolationAlpha,
        'projection.position_error': frame.metrics.positionError,
        'projection.rotation_error_rad': frame.metrics.rotationErrorRadians,
        'projection.joint_error_rad': frame.metrics.jointAngleErrorRadians,
        'projection.correction_magnitude': frame.metrics.correctionMagnitude,
        'projection.fallback': frame.state === 'fallback' ? 1 : 0
      },
      provenance: {
        source: 'viewer-temporal-projection',
        mode: frame.mode,
        state: frame.state,
        fallbackReason: frame.fallbackReason,
        sourceSampleIds: [...frame.sourceSampleIds],
        projectedPhysicsTimestampMs: frame.projectedPhysicsTimestampMs,
        projectedObservedTimestampMs: frame.projectedObservedTimestampMs,
        discreteStateSourceSampleId: frame.discreteStateSourceSampleId,
        discontinuityToken: frame.discontinuityToken,
        bufferSize: frame.bufferSize
      }
    });
  }

  recordReset(reason: ViewerTemporalProjectionFallbackReason, observedAtMs: number): boolean {
    return this.recorder.record({
      observedAtMs,
      metrics: { 'projection.buffer_reset': 1 },
      provenance: { source: 'viewer-temporal-projection', event: 'buffer-reset', reason }
    });
  }

  recordConditionChange(mode: ViewerTemporalProjectionMode, observedAtMs: number): boolean {
    if (!this.activeMode || mode === this.activeMode) {
      return false;
    }

    this.conditionChanged = true;
    return this.recorder.record({
      observedAtMs,
      metrics: {},
      provenance: {
        source: 'viewer-temporal-projection',
        event: 'condition-changed',
        previousMode: this.activeMode,
        nextMode: mode
      }
    });
  }

  stop(endedAtMs: number): Artifact {
    const artifact = this.recorder.stop({
      endedAtMs,
      status: this.conditionChanged ? 'invalid' : 'completed',
      reason: this.conditionChanged ? 'condition_changed_during_run' : null
    });
    this.activeMode = null;
    this.conditionChanged = false;
    return artifact;
  }

  isRecording(): boolean {
    return this.recorder.isRecording();
  }

  snapshot(): Snapshot {
    return this.recorder.snapshot();
  }
}
