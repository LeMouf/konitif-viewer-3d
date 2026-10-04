import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveObservedRobotTemporalSupportAnchorProjection } from '../dist/renderer/ObservedRobotGroundingProjection.js';

test('centroid anchoring cancels common sole drift, but cannot cancel opposed per-foot drift', () => {
  const points = [
    { x: -0.1, y: 0, z: -0.05 }, { x: -0.1, y: 0, z: 0.05 },
    { x: 0.1, y: 0, z: -0.05 }, { x: 0.1, y: 0, z: 0.05 }
  ];
  const ids = ['left-front', 'left-back', 'right-front', 'right-back'];
  const input = { supportPoints: points, activeIndices: [0, 1, 2, 3], activeContactIds: ids };
  const acquired = resolveObservedRobotTemporalSupportAnchorProjection({ ...input, previousState: null });
  const common = resolveObservedRobotTemporalSupportAnchorProjection({ ...input,
    previousState: acquired.state, supportPoints: points.map(point => ({ ...point, x: point.x + 0.005 })) });
  assert.ok(Math.abs(common.offsetX + 0.005) < 1e-12);
  const opposed = resolveObservedRobotTemporalSupportAnchorProjection({ ...input,
    previousState: acquired.state, supportPoints: points.map(point => ({ ...point,
      x: point.x + (point.x < 0 ? -0.005 : 0.005) })) });
  assert.equal(opposed.status, 'preserved');
  assert.equal(opposed.offsetX, 0);
  assert.equal(opposed.physicsAffected, false);
});
