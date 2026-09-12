import type { ViewerMetadata } from './ViewerMetadata.js';

/** Caller-provided context; the viewer supplies its current mode and configuration. */
export interface ViewerExperimentStart {
  runId: string;
  startedAtMs: number;
  environment: ViewerMetadata;
}

/** Public experiment control, distinct from the collector's measurement sink.
 * Artifact and Snapshot belong to the supplied experiment provider. This port
 * neither interprets their schema nor owns collection, admission or persistence.
 * Timestamps are milliseconds; provider errors and output references propagate.
 */
export interface ViewerExperimentPort<Artifact, Snapshot> {
  startTemporalProjectionExperiment(input: ViewerExperimentStart): Snapshot;
  markTemporalProjectionExperimentPhase(phaseId: string, observedAtMs: number, provenance?: ViewerMetadata): boolean;
  stopTemporalProjectionExperiment(endedAtMs: number): Artifact;
  getTemporalProjectionExperimentSnapshot(): Snapshot;
}
