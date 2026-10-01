import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Viewer3D } from '../dist/renderer/index.js';

test('trajectory markers synchronize after pose convergence and before drawing', () => {
  const order = [];
  const viewer = Object.create(Viewer3D.prototype);

  Object.assign(viewer, {
    projectComparisonSimulation: () => order.push('pose-converged'),
    observedRobotGhostMirrorsSimulatedRobot: false,
    options: { showTrajectories: true },
    trajectoryAnimation: { motion: { hasMotion: true } },
    trajectorySignature: "",
    rebuildTrajectoryPreview: () => order.push("trajectory-rebuilt"),
    updateTrajectoryCurrentMarkers: () => order.push('trajectory-markers'),
    updatePoseHandleScreenScale: () => {},
    updateProjectileCameraProjection: () => {},
    visualGroundLayer: null,
    composer: null,
    renderer: { render: () => order.push('draw') },
    scene: {},
    camera: {}
  });

  viewer.render();

  assert.deepEqual(order, ['pose-converged', 'trajectory-rebuilt', 'trajectory-markers', 'draw']);
});
