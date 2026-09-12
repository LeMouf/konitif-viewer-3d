/** Borrowed history access. The owner retains replay controls, retention and disposal. */
export interface ViewerHistoryPort<SampleInput, Snapshot> {
  isRecording(): boolean;
  recordSample(sample: SampleInput): void;
  snapshot(): Snapshot;
  subscribe(listener: (snapshot: Snapshot) => void): () => void;
}

/** Read-side requirements only; the history owner selects the sample and replay cursor. */
export interface ViewerHistoryObservation<Sample> {
  readonly replayState: 'live' | 'paused' | 'playing';
  /** Seconds, or null when the selected sample supplies the cursor. */
  readonly replayTimeSeconds: number | null;
  readonly selectedSample: Sample | null;
}
