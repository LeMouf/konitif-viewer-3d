/** Scene data exchanged by the viewer, not the application's history authority.
 * Metadata encoding is supplied by the consumer; these contracts perform no validation.
 */
export interface ViewerHistoryVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ViewerHistoryQuaternion extends ViewerHistoryVector3 {
  w: number;
}

export interface ViewerHistoryTransform<Metadata> {
  id: string;
  position: ViewerHistoryVector3;
  rotation?: ViewerHistoryQuaternion;
  scale?: ViewerHistoryVector3;
  sourceId?: string;
  metadata?: Metadata;
}

export interface ViewerHistoryCameraSample {
  position: ViewerHistoryVector3;
  target: ViewerHistoryVector3;
  projection: string;
}

export interface ViewerHistoryPhysicsSample<Metadata> {
  engine: string;
  enabled: boolean;
  motorsCoupled?: boolean;
  bodyCount: number;
  jointCount: number;
  centerOfMass?: ViewerHistoryVector3 | null;
  bodyTransforms?: ViewerHistoryTransform<Metadata>[];
  jointStates?: Record<string, number>;
}

export interface ViewerHistoryPlaybackSample {
  sourceId?: string;
  /** Playback cursor in seconds. */
  currentTime: number;
  isPlaying: boolean;
  playbackRate?: number;
  duration?: number;
}

export interface ViewerHistorySceneSample<Metadata> {
  camera?: ViewerHistoryCameraSample;
  joints?: Record<string, number>;
  physics?: ViewerHistoryPhysicsSample<Metadata>;
  playback?: ViewerHistoryPlaybackSample;
  metadata?: Metadata;
}

export interface ViewerHistorySample<Metadata> {
  /** Entry identifier assigned by the history owner, not a scene entity identifier. */
  id: number;
  timeSeconds: number;
  /** Recording timestamp in milliseconds, supplied by the history owner. */
  recordedAt: number;
  viewer?: ViewerHistorySceneSample<Metadata>;
  metadata?: Metadata;
}
