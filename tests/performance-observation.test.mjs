import assert from 'node:assert/strict';
import test from 'node:test';
import { measureViewerOperation } from '../dist/renderer/PerformanceObservation.js';
import { Viewer3D } from '../dist/renderer/index.js';

test('observation disabled never reads the timer or emits a measurement', () => {
  let reads = 0;
  const observer = { isEnabled: () => false, recordMeasure() { assert.fail(); } };
  assert.equal(measureViewerOperation(observer, 'viewer.draw.cpu', () => 42, () => { reads++; return 0; }), 42);
  assert.equal(reads, 0);
});
test('reports actual CPU operation duration and preserves its result', () => {
  const samples = [];
  let clock = 10;
  const observer = { isEnabled: () => true, recordMeasure: (...args) => samples.push(args) };
  assert.equal(measureViewerOperation(observer, 'viewer.draw.cpu', () => { clock = 12; return 42; }, () => clock), 42);
  assert.deepEqual(samples, [['viewer.draw.cpu', 2]]);
});
test('observer failure cannot replace a renderer failure', () => {
  const cause = new Error('renderer');
  const observer = { isEnabled: () => true, recordMeasure() { throw new Error('observer'); } };
  assert.throws(() => measureViewerOperation(observer, 'viewer.draw.cpu', () => { throw cause; }), error => error === cause);
});
test('observer activation failure cannot prevent rendering', () => {
  assert.equal(measureViewerOperation({ isEnabled() { throw new Error(); }, recordMeasure() {} },
    'viewer.draw.cpu', () => 42), 42);
});

test('actual renderer draw boundary emits an optional local observation without scheduling work', () => {
  const samples = [];
  let rendered = 0;
  const receiver = {
    performanceObserver: { isEnabled: () => true, recordMeasure: (...args) => samples.push(args) },
    renderScene() { rendered++; }
  };
  Viewer3D.prototype.render.call(receiver);
  assert.equal(rendered, 1);
  assert.equal(samples.length, 1);
  assert.equal(samples[0][0], 'viewer.draw.cpu');
  assert.ok(samples[0][1] >= 0);
});
