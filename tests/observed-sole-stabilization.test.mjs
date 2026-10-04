import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ObservedSoleAnchors, projectBoundedSoleCorrection } from '../dist/renderer/ObservedSoleStabilization.js';

const group = (id, x, eligible = true) => ({ id, position: [x, 0, 0], eligible });
test('opposed sole drift gets independent inferred targets without changing samples', () => {
  const anchors = new ObservedSoleAnchors();
  anchors.resolve('session', [group('left', -.1), group('right', .1)], 1);
  const input = [group('left', -.104), group('right', .104)];
  const targets = anchors.resolve('session', input, .75);
  assert.ok(Math.abs(targets[0].target[0] + .101) < 1e-12);
  assert.ok(Math.abs(targets[1].target[0] - .101) < 1e-12);
  assert.equal(input[0].position[0], -.104);
  assert.equal(targets[0].inferred, true);
});
test('lift, session change, disabling and oversized motion release sole anchors', () => {
  const anchors = new ObservedSoleAnchors();
  anchors.resolve('a', [group('left', 0)], 1);
  assert.equal(anchors.resolve('a', [group('left', .005, false)], 1).length, 0);
  assert.equal(anchors.resolve('a', [group('left', .008)], 1)[0].target[0], .008);
  assert.equal(anchors.resolve('b', [group('left', .009)], 1)[0].target[0], .009);
  assert.equal(anchors.resolve('b', [group('left', .009)], 0).length, 0);
  assert.equal(anchors.resolve('b', [group('left', .010)], 1)[0].target[0], .010);
  assert.equal(anchors.resolve('b', [group('left', .03)], 1).length, 0);
  assert.equal(anchors.resolve('b', [group('left', .031)], 1).length, 0);
  anchors.reset();
  assert.equal(anchors.resolve('b', [group('left', .031)], 1)[0].target[0], .031);
});
test('bounded articulated correction reduces slip, preserves inputs and respects angle limits', () => {
  const source = [0,0];
  const result = projectBoundedSoleCorrection({ values: source, limits: [[-.02,.02],[-.05,.05]],
    targetPosition: [.003,0,0], targetOrientation: [0,0,0,1],
    evaluate(values) { return { position: [.2*values[0],0,0], orientation: [0,0,Math.sin(values[1]/2),Math.cos(values[1]/2)] }; } });
  assert.ok(result.residualMeters < .0001);
  assert.ok(Math.abs(result.values[0]) <= .02);
  assert.deepEqual(source,[0,0]);
  assert.equal(result.physicsAffected,false);
});
test('unreachable targets stay bounded and failed evaluations do not fabricate a correction', () => {
  const evaluate = values => ({ position: [.1*values[0],0,0], orientation: [0,0,0,1] });
  const result = projectBoundedSoleCorrection({ values: [0], limits: [[-.01,.01]],
    targetPosition: [1,0,0], targetOrientation: [0,0,0,1], evaluate });
  assert.ok(result.values[0] <= .01);
  assert.ok(result.residualMeters > .9);
  assert.throws(() => projectBoundedSoleCorrection({ values: [0], limits: [[-1,1]],
    targetPosition: [0,0,0], targetOrientation: [0,0,0,1], evaluate: () => ({ position: [NaN,0,0], orientation: [0,0,0,1] }) }));
});

test('a visible sole surface constraint is distinct from its centroid and rejects missing geometry', () => {
  const source = [0];
  const result = projectBoundedSoleCorrection({ values: source, limits: [[-.1, .1]],
    targetPosition: [0, 0, 0], targetOrientation: [0, 0, 0, 1], targetSupportMinimumY: 0,
    evaluate(values) { return { position: [0, values[0] * .2, 0], orientation: [0,0,0,1], supportMinimumY: .001 + values[0] * .2 }; } });
  assert.ok(Math.abs(.001 + result.values[0] * .2) < .0001);
  assert.deepEqual(source, [0]);
  assert.throws(() => projectBoundedSoleCorrection({ values: source, limits: [[-.1, .1]],
    targetPosition: [0,0,0], targetOrientation: [0,0,0,1], targetSupportMinimumY: 0,
    evaluate: () => ({ position: [0,0,0], orientation: [0,0,0,1] }) }));
});
