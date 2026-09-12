import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createViewer3DSceneSnapshot,
  createViewer3DWorkflowCompositionSource,
  createViewerWorkflowCompositionSource,
  viewer3DToolModule
} from '../dist/index.js';
import {
  DEFAULT_DISPLAY_FRAME_RATE_HZ,
  normalizeConfiguredDisplayFrameRate,
  observeDisplayFrameRateCeiling,
  resolveDisplayFrameRateTarget,
  ViewerTemporalProjectionBuffer
} from '../dist/renderer/index.js';

test('3D snapshots extend the amodal Viewer snapshot without sharing mutable inputs', () => {
  const transforms = [{
    id: 'head',
    position: { x: 1, y: 2, z: 3 },
    rotation: { x: 0, y: 0, z: 0, w: 1 }
  }];
  const snapshot = createViewer3DSceneSnapshot({
    selectedIds: ['head'],
    observedAtMs: -5,
    transforms
  });
  transforms.push({
    id: 'torso',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 }
  });

  assert.deepEqual(snapshot.selectedIds, ['head']);
  assert.equal(snapshot.observedAtMs, 0);
  assert.equal(snapshot.transforms.length, 1);
  assert.equal(viewer3DToolModule.capability, 'spatial-projection');
});

test('the historical 3D workflow name remains an alias of the amodal authority', () => {
  assert.equal(createViewer3DWorkflowCompositionSource, createViewerWorkflowCompositionSource);
});

test('the renderer entry loads in Node without browser globals and exposes deterministic helpers', () => {
  assert.equal(DEFAULT_DISPLAY_FRAME_RATE_HZ, 60);
  assert.equal(normalizeConfiguredDisplayFrameRate(undefined), null);
  assert.equal(normalizeConfiguredDisplayFrameRate(10), 30);
  assert.equal(normalizeConfiguredDisplayFrameRate(500), 240);
  assert.equal(observeDisplayFrameRateCeiling(60, 1000 / 120), 120);
  assert.equal(resolveDisplayFrameRateTarget(null, 144), 144);
  const buffer = new ViewerTemporalProjectionBuffer();
  assert.equal(buffer.project(0), null);
  assert.equal(buffer.getStatus().state, 'empty');
});
