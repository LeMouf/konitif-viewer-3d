import {
  createViewer3DSceneSnapshot,
  type Viewer3DPort,
  type ViewerLedPlacementDefinition
} from '@konitif/viewer-3d';
import {
  Viewer3D,
  type Viewer3DOptions,
  type ViewerExperimentPort,
  normalizeConfiguredDisplayFrameRate
} from '@konitif/viewer-3d/renderer';
import { resolveViewerOrientationGizmoTransform, type ViewerOrientationQuaternion } from '@konitif/viewer-3d/orientation';
import {
  VIEWER3D_PROJECTILE_PARTICLE_LIMIT,
  createViewerProjectileLaunchSolution,
  sampleViewerProjectilePosition,
  type ViewerProjectileLaunchSolution
} from '@konitif/viewer-3d/projectile';
import { resolveViewerLedRingCalibration, type ViewerLedRingCalibration } from '@konitif/viewer-3d/led-calibration';

declare const calibrationDefaults: Readonly<ViewerLedRingCalibration>;
const calibration: ViewerLedRingCalibration = resolveViewerLedRingCalibration({}, calibrationDefaults);
const launch: ViewerProjectileLaunchSolution = createViewerProjectileLaunchSolution({
  origin: { x: 0, y: 1, z: 0 }, target: { x: 1, y: 1, z: 0 }, speedMetersPerSecond: 3
});
void calibration;
void sampleViewerProjectilePosition(launch, launch.durationSeconds);
void VIEWER3D_PROJECTILE_PARTICLE_LIMIT;

const cameraRotation: ViewerOrientationQuaternion = { x: 0, y: 0, z: 0, w: 1 };
const compassTransform: string = resolveViewerOrientationGizmoTransform(cameraRotation);
void compassTransform;

const snapshot = createViewer3DSceneSnapshot({ selectedIds: ['subject'] });
const placement: ViewerLedPlacementDefinition = {
  id: 'head',
  anchorNames: ['Head'],
  vertical: { x: 0, y: 1, z: 0 },
  forward: { x: 0, y: 0, z: 1 },
  normal: { x: 0, y: 0, z: 1 },
  mirrorDirection: 1
};
declare const port: Viewer3DPort;
declare const container: HTMLDivElement;
declare const physicsService: Viewer3DOptions['physicsService'];
const collector = {
  start() {}, markPhase: () => false, record: () => false, isRecording: () => false,
  snapshot: () => ({ customState: 'idle' }), stop: () => ({ evidence: Symbol('artifact') })
};
const renderer = new Viewer3D(container, {
  physicsService,
  temporalProjectionExperimentCollector: collector
});
const experimentPort: ViewerExperimentPort<{ evidence: symbol }, { customState: string }> = renderer;
const artifact: { evidence: symbol } = experimentPort.stopTemporalProjectionExperiment(1);
void snapshot;
void placement;
void port;
void artifact;
void normalizeConfiguredDisplayFrameRate(60);
// @ts-expect-error The independent renderer requires an explicit collector.
const invalidRenderer = new Viewer3D(container, { physicsService });
void invalidRenderer;

const ground: { size: number } = normalizeViewerVisualGroundConfig();
void ground;
import { normalizeViewerVisualGroundConfig } from '@konitif/viewer-3d/visual-ground';
