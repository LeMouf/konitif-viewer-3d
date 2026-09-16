import { defineKonitifToolModule } from '@konitif/tools';
import {
  createViewerSnapshot,
  createViewerWorkflowCompositionSource,
  type ViewerIntent,
  type ViewerPort,
  type ViewerSnapshot,
  type ViewerWorkflowCompositionSource
} from '@konitif/viewer';

export {
  createViewerWorkflowCompositionSource,
  type ViewerIntent,
  type ViewerPort,
  type ViewerSnapshot,
  type ViewerWorkflowCompositionSource
} from '@konitif/viewer';

export interface Viewer3DVector {
  x: number;
  y: number;
  z: number;
}

export interface Viewer3DQuaternion extends Viewer3DVector {
  w: number;
}

export interface Viewer3DTransform {
  id: string;
  position: Viewer3DVector;
  rotation: Viewer3DQuaternion;
}

export interface Viewer3DSceneSnapshot extends ViewerSnapshot {
  transforms: readonly Viewer3DTransform[];
}

export type Viewer3DIntent =
  | ViewerIntent
  | { type: 'set-camera'; cameraId: string };

export interface Viewer3DPort extends ViewerPort<Viewer3DSceneSnapshot, Viewer3DIntent> {}

/**
 * @deprecated Use ViewerWorkflowCompositionSource from @konitif/viewer.
 */
export type Viewer3DWorkflowCompositionSource = ViewerWorkflowCompositionSource;

/** @deprecated Use createViewerWorkflowCompositionSource from @konitif/viewer. */
export const createViewer3DWorkflowCompositionSource = createViewerWorkflowCompositionSource;

export function createViewer3DSceneSnapshot(
  input: Partial<Viewer3DSceneSnapshot> = {}
): Viewer3DSceneSnapshot {
  const snapshot = createViewerSnapshot(input);
  return {
    ...snapshot,
    transforms: [...(input.transforms ?? [])]
  };
}

export const viewer3DToolModule = defineKonitifToolModule({
  id: 'konitif.viewer-3d',
  name: 'KONITIF Viewer 3D',
  capability: 'spatial-projection',
  description: 'Product-neutral spatial observation and manipulation surface.'
});

export type { ViewerJointHandleDefinition } from './jointHandleDefinition.js';
export type { ViewerSupportDefinition } from './supportDefinition.js';
export type { ViewerDiagnosticContactDefinition } from './diagnosticContactDefinition.js';
export type { ViewerBalanceFootprintDefinition } from './balanceFootprintDefinition.js';
export type { ViewerHandTipDefinition } from './handTipDefinition.js';
export type { ViewerLedLayout, ViewerLedRingCalibration } from './ledRingCalibration.js';
export type { ViewerLedReferenceFrame } from './ledReferenceFrame.js';
export type { ViewerLedPlacementDefinition } from './ledPlacementDefinition.js';

export * from './orientationGizmoProjection.js';
export * from './visualGroundConfig.js';
