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
