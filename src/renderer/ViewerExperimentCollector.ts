import type { ViewerMetadata } from './ViewerMetadata.js';

/** Collector supplied for one viewer protocol adapter. The provider owns
 * admission, retained observations, summaries and output formats.
 * Timestamps are milliseconds; no clock or scheduling is owned by this port.
 */
export interface ViewerExperimentCollector<Artifact, Snapshot> {
  start(input: { runId: string; conditionId: string; startedAtMs: number; environment: ViewerMetadata }): void;
  markPhase(phaseId: string, observedAtMs: number, provenance?: ViewerMetadata): boolean;
  record(input: {
    observedAtMs: number;
    metrics: Readonly<Record<string, number | null | undefined>>;
    provenance?: ViewerMetadata;
  }): boolean;
  stop(input: { endedAtMs: number; status?: 'completed' | 'invalid'; reason?: string | null }): Artifact;
  isRecording(): boolean;
  snapshot(): Snapshot;
}
