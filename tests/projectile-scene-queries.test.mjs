import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Viewer3D } from '../dist/renderer/Viewer3DRenderer.js';
import { Object3D, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';

function aimFixture() {
  const robot = new Object3D(), caster = new Raycaster();
  caster.ray.origin.set(0, 1, 0);
  caster.ray.direction.set(0, 0, -1);
  caster.setFromCamera = () => {};
  let hits = [];
  caster.intersectObject = () => hits;
  const viewer = Object.assign(Object.create(Viewer3D.prototype), {
    options: {}, camera: new PerspectiveCamera(), projectilePointer: new Vector2(), projectileRaycaster: caster,
    readViewportAuthority: () => ({visible: true, left: 0, top: 0, width: 100, height: 100}),
    getPoseControlRobot: () => robot, resolveProjectilePhysicsBodyName: () => null,
    resolveDefaultProjectileTarget: () => ({point: new Vector3(0, 1, -2), bodyName: null}),
  });
  return {viewer, caster, robot, setHits: value => { hits = value; }};
}

test('a nearer caller-supplied scene obstacle wins aim over a robot behind it', () => {
  const f = aimFixture();
  f.setHits([{distance: 1, point: new Vector3(0, 1, -1), object: f.robot}]);
  let queries = 0;
  f.viewer.options.resolveProjectileObstacleAim = ray => {
    assert.equal(ray, f.caster); queries += 1;
    return {point: {x: 0, y: 1, z: -.25}, distance: .25};
  };
  const target = f.viewer.resolveProjectileTargetFromPointer({clientX: 50, clientY: 50});
  assert.deepEqual(target.point.toArray(), [0, 1, -.25]);
  assert.equal(target.bodyName, null);
  assert.equal(queries, 1);
});

test('an obstacle behind the support floor does not replace the nearest floor pick', () => {
  const f = aimFixture(); f.caster.ray.direction.set(0, -1, 0);
  const floor = f.viewer.resolveProjectileTargetFromPointer({clientX: 50, clientY: 50});
  f.viewer.options.resolveProjectileObstacleAim = () => ({point: {x: 0, y: -100, z: 0}, distance: 101});
  const target = f.viewer.resolveProjectileTargetFromPointer({clientX: 50, clientY: 50});
  assert.deepEqual(target.point.toArray(), floor.point.toArray());
});

test('advancing a particle sweeps the scene and reflects at the reported centre', () => {
  const particle = {
    position: new Vector3(0, 1, 0), velocity: new Vector3(0, 0, 1),
    phase: 'flight', bornAt: 0, phaseStartedAt: 0, lastUpdatedAt: 0,
    rotationX: 0, rotationY: 0, lastRobotContactAt: -Infinity
  };
  let queries = 0;
  const viewer = Object.assign(Object.create(Viewer3D.prototype), {
    destroyed: false, robot: null, projectileParticles: [particle],
    options: { resolveProjectileObstacleHit(origin, end, radius) {
      queries += 1;
      assert.equal(origin, particle.position);
      assert.ok(end.z > 0);
      assert.ok(radius > 0);
      return { point: {x: 0, y: 1, z: .05}, normal: {x: 0, y: 0, z: -1}, distance: .05 };
    } },
    resolveProjectileVisualScale: () => 1
  });
  assert.equal(viewer.updateProjectileInteraction(100), true);
  assert.equal(queries, 1);
  assert.ok(Math.abs(particle.position.z - .0499) < 1e-9);
  assert.ok(particle.velocity.z < 0);
  assert.equal(particle.phase, 'flight');
});

function contactFixture(distance) {
  const robot = new Object3D(), caster = new Raycaster();
  caster.intersectObject = () => [{distance, point: new Vector3(0, 0, distance), object: robot, face: {normal: new Vector3(0, 0, -1)}}];
  let phases = 0;
  const viewer = Object.assign(Object.create(Viewer3D.prototype), {
    destroyed: false, projectileRaycaster: caster, resolveProjectilePhysicsColliderHit: () => null,
    resolveProjectilePhysicsBodyName: () => null, setProjectileParticlePhase: () => { phases += 1; },
  });
  const particle = {position: new Vector3(), velocity: new Vector3(0, 0, 1)};
  return {viewer, robot, particle, phases: () => phases};
}

test('a nearer scene obstacle prevents a robot collision and its side effects', () => {
  const f = contactFixture(1);
  const contact = f.viewer.resolveProjectileRobotCollision(f.particle, new Vector3(0, 0, 2), new Vector3(0, 0, 1), f.robot, null, 10, .5);
  assert.equal(contact, false);
  assert.equal(f.phases(), 0);
  assert.deepEqual(f.particle.position.toArray(), [0, 0, 0]);
});

test('a robot in front of the obstacle still receives the normal visual collision', () => {
  const f = contactFixture(.25);
  const contact = f.viewer.resolveProjectileRobotCollision(f.particle, new Vector3(0, 0, 2), new Vector3(0, 0, 1), f.robot, null, 10, 1);
  assert.equal(contact, true);
  assert.equal(f.phases(), 1);
  assert.ok(f.particle.velocity.z < 0);
});
