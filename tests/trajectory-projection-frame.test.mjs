import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Group, Vector3 } from 'three';
import { projectViewerTrajectoryPointToFrame } from '../dist/renderer/index.js';

test('trajectory points remain stable in the presentation frame', () => {
  const frame = new Group();
  frame.position.set(1.25, 0.4, -0.75);
  frame.rotation.set(0, Math.PI / 3, 0);
  frame.scale.setScalar(1.2);
  frame.updateMatrixWorld(true);

  const worldPoint = new Vector3(1.8, 1.1, -0.2);
  const localPoint = projectViewerTrajectoryPointToFrame(worldPoint, frame);
  const reconstructedWorldPoint = frame.localToWorld(localPoint.clone());

  assert.ok(reconstructedWorldPoint.distanceTo(worldPoint) < 1e-10);

  frame.position.set(-0.5, 0.8, 0.25);
  frame.updateMatrixWorld(true);
  const movedWorldPoint = frame.localToWorld(localPoint.clone());

  assert.ok(movedWorldPoint.distanceTo(worldPoint) > 0.1);
});
