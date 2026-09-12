import assert from 'node:assert/strict';
import {
  createViewer3DSceneSnapshot,
  createViewer3DWorkflowCompositionSource,
  createViewerWorkflowCompositionSource
} from '@konitif/viewer-3d';
import {
  Viewer3D,
  normalizeConfiguredDisplayFrameRate,
  resolveViewerPoseHandleDistanceOpacity
} from '@konitif/viewer-3d/renderer';

assert.equal(typeof document, 'undefined');
assert.equal(typeof Viewer3D, 'function');
assert.equal(createViewer3DWorkflowCompositionSource, createViewerWorkflowCompositionSource);
assert.deepEqual(
  createViewer3DSceneSnapshot({ selectedIds: ['subject'], observedAtMs: -1 }).selectedIds,
  ['subject']
);
assert.equal(normalizeConfiguredDisplayFrameRate(10), 30);
assert.equal(typeof resolveViewerPoseHandleDistanceOpacity(1), 'number');
