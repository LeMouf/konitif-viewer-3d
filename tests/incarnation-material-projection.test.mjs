import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MeshPhysicalMaterial, MeshBasicMaterial, Texture, Mesh, BoxGeometry, Group } from 'three';
import { IncarnationMaterialProjector, Viewer3D } from '../dist/renderer/index.js';

const tuning = { enabled: true, environmentIntensity: 0.5, roughnessScale: 0.5, metalnessScale: 0.5, clearcoatScale: 0.5 };
test('observed material isolation preserves its own authored shader hooks', () => {
  const source = new MeshPhysicalMaterial();
  const compile = () => {};
  source.onBeforeCompile = compile;
  source.customProgramCacheKey = () => 'observed-authored-surface';
  const mesh = new Mesh(new BoxGeometry(), source);
  const root = new Group(); root.add(mesh);
  const renderer = Object.assign(Object.create(Viewer3D.prototype), {
    observedRobotGhostMaterialBaselines: new Map(), observedRobotGhostRenderOrderBaselines: new Map(),
    observedRobotGhostShadowMaterials: new Map(), options: { showObservedRobotGhost: true },
    robotComparisonAppearance: { observed: { opacity: 1 } }
  });
  renderer.configureObservedRobotGhostMaterials(root);
  assert.notEqual(mesh.material, source);
  assert.equal(mesh.material.onBeforeCompile, compile);
  assert.equal(mesh.material.customProgramCacheKey(), 'observed-authored-surface');
});
test('material tuning is idempotent, reversible and leaves color/opacity and other incarnations alone', () => {
  const texture = new Texture();
  const source = new MeshPhysicalMaterial({ envMap: texture, envMapIntensity: 2, roughness: 0.8, metalness: 0.6, clearcoat: 0.4, iridescence: 0.2, sheen: 0.3, transmission: 0.1, color: '#123456', opacity: 0.7 });
  const observed = source.clone();
  const projector = new IncarnationMaterialProjector();
  projector.apply([observed], tuning);
  projector.apply([observed], tuning);
  assert.equal(observed.roughness, 0.4);
  assert.equal(observed.envMapIntensity, 1);
  assert.equal(source.roughness, 0.8);
  assert.equal(observed.color.getHexString(), source.color.getHexString());
  assert.equal(observed.opacity, 0.7);
  projector.apply([observed], { ...tuning, enabled: false });
  assert.equal(observed.envMap, null);
  assert.equal(observed.metalness, 0);
  assert.equal(observed.iridescence, 0);
  assert.equal(observed.sheen, 0);
  assert.equal(observed.transmission, 0);
  projector.apply([observed], { ...tuning, environmentIntensity: 1, roughnessScale: 1, metalnessScale: 1, clearcoatScale: 1 });
  assert.equal(observed.envMap, texture);
  assert.equal(observed.roughness, 0.8);
  assert.equal(observed.clearcoat, 0.4);
  assert.equal(observed.iridescence, source.iridescence);
  assert.equal(observed.sheen, source.sheen);
  assert.equal(observed.transmission, source.transmission);
});
test('invalid values are refused before any material effect and basic materials stay unchanged', () => {
  const material = new MeshPhysicalMaterial({ roughness: 0.8 });
  const projector = new IncarnationMaterialProjector();
  assert.throws(() => projector.apply([material], { ...tuning, roughnessScale: NaN }), /Invalid/);
  assert.equal(material.roughness, 0.8);
  const basic = new MeshBasicMaterial({ opacity: 0.4 });
  projector.apply([basic], tuning);
  assert.equal(basic.opacity, 0.4);
});
