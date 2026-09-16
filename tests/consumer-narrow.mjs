import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Test tooling uses preinstalled Node >=22.15; no loader dependency is added.
const guard = registerHooks({
  resolve(specifier, context, nextResolve) {
    assert.doesNotMatch(specifier, /^three(?:\/|$)/, 'Narrow entries must not admit Three.js');
    assert.notEqual(specifier, '@konitif/viewer-3d/renderer');
    const resolved = nextResolve(specifier, context);
    assert.doesNotMatch(resolved.url, /\/dist\/renderer\/(?:index|Viewer3DRenderer)\.js(?:[?#]|$)/);
    return resolved;
  }
});

try {
  const orientation = await import('@konitif/viewer-3d/orientation');
  const ground = await import('@konitif/viewer-3d/visual-ground');
  const projectile = await import('@konitif/viewer-3d/projectile');
  const led = await import('@konitif/viewer-3d/led-calibration');
  assert.equal(typeof document, 'undefined');
  assert.equal(typeof window, 'undefined');
  assert.equal(orientation.resolveViewerOrientationGizmoTransform({ x: 0, y: 0, z: 0, w: 1 }), orientation.VIEWER_ORIENTATION_GIZMO_IDENTITY_TRANSFORM);
  assert.equal(ground.normalizeViewerVisualGroundConfig({ components: { reflection: false } }).components.reflection, false);
  assert.equal(projectile.VIEWER3D_PROJECTILE_PARTICLE_LIMIT, 24);
  const launch = projectile.createViewerProjectileLaunchSolution({
    origin: { x: 1, y: 2, z: 3 }, target: { x: 2, y: 2, z: 3 }, speedMetersPerSecond: 3
  });
  assert.deepEqual(projectile.sampleViewerProjectilePosition(launch, 0), launch.origin);
  const end = projectile.sampleViewerProjectilePosition(launch, launch.durationSeconds);
  for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(end[axis] - launch.target[axis]) < 1e-10);

  const defaults = Object.freeze({
    layout: 'circle', forwardOffset: 1, verticalOffset: 2, lateralOffset: 3, separation: 4,
    radius: 5, stripLength: 6, ledCount: 8, ledSize: 0.1,
    rotationX: 0, rotationY: 0, rotationZ: 0, isVisible: true, mireVisible: true,
    variantCount: 1, variantStep: 0.01
  });
  const input = Object.freeze({ tiltY: 0.2, tiltX: 0.4, radius: 0, isVisible: false, ledSize: NaN });
  const calibration = led.resolveViewerLedRingCalibration(input, defaults);
  assert.equal(calibration.layout, 'circle');
  assert.equal(calibration.rotationY, 0.2);
  assert.equal(calibration.rotationZ, 0.4);
  assert.equal(calibration.radius, 0);
  assert.equal(calibration.isVisible, false);
  assert.equal(calibration.ledSize, defaults.ledSize);
  assert.equal(defaults.radius, 5);
  assert.equal(input.radius, 0);
  const strip = led.resolveViewerLedRingCalibration({ layout: 'strip', stripLength: 0 }, defaults);
  assert.equal(strip.layout, 'strip');
  assert.equal(strip.stripLength, 0);
} finally {
  guard.deregister();
}
