import assert from 'node:assert/strict';
import {
  createViewer3DSceneSnapshot,
  createViewer3DWorkflowCompositionSource,
  createViewerWorkflowCompositionSource
} from '@konitif/viewer-3d';
import {
  Viewer3D,
  VIEWER3D_PROJECTILE_PARTICLE_LIMIT as rendererParticleLimit,
  normalizeConfiguredDisplayFrameRate,
  resolveViewerPoseHandleDistanceOpacity
} from '@konitif/viewer-3d/renderer';
import { resolveViewerOrientationGizmoTransform, VIEWER_ORIENTATION_GIZMO_IDENTITY_TRANSFORM } from '@konitif/viewer-3d/orientation';
import { VIEWER3D_PROJECTILE_PARTICLE_LIMIT } from '@konitif/viewer-3d/projectile';

assert.equal(rendererParticleLimit, VIEWER3D_PROJECTILE_PARTICLE_LIMIT);

assert.equal(resolveViewerOrientationGizmoTransform({ x: 0, y: 0, z: 0, w: 1 }), VIEWER_ORIENTATION_GIZMO_IDENTITY_TRANSFORM);

assert.equal(typeof document, 'undefined');
assert.equal(typeof Viewer3D, 'function');
assert.equal(typeof Viewer3D.prototype.setIncarnationMaterialProjection, 'function');
// Verify the retained release archive, not merely the source checkout.
const { Group, Mesh, BoxGeometry, MeshPhysicalMaterial } = await import('three');
const authoredMaterial = new MeshPhysicalMaterial();
const compile = () => {};
const cacheKey = () => 'consumer-observed-led';
authoredMaterial.onBeforeCompile = compile;
authoredMaterial.customProgramCacheKey = cacheKey;
const mesh = new Mesh(new BoxGeometry(), authoredMaterial);
const observed = new Group(); observed.add(mesh);
const renderer = Object.assign(Object.create(Viewer3D.prototype), {
  observedRobotGhostMaterialBaselines: new Map(),
  observedRobotGhostRenderOrderBaselines: new Map(),
  observedRobotGhostShadowMaterials: new Map(),
  options: { showObservedRobotGhost: true },
  robotComparisonAppearance: { observed: { opacity: 1 } }
});
renderer.configureObservedRobotGhostMaterials(observed);
assert.notEqual(mesh.material, authoredMaterial);
assert.equal(mesh.material.onBeforeCompile, compile);
assert.equal(mesh.material.customProgramCacheKey, cacheKey);
assert.equal(createViewer3DWorkflowCompositionSource, createViewerWorkflowCompositionSource);
assert.deepEqual(
  createViewer3DSceneSnapshot({ selectedIds: ['subject'], observedAtMs: -1 }).selectedIds,
  ['subject']
);
assert.equal(normalizeConfiguredDisplayFrameRate(10), 30);
assert.equal(typeof resolveViewerPoseHandleDistanceOpacity(1), 'number');

assert.equal(normalizeViewerVisualGroundConfig({ components: { reflection: false } }).components.reflection, false);
import { normalizeViewerVisualGroundConfig } from '@konitif/viewer-3d/visual-ground';
