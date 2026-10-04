import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ObservedRobotPresentationBuffer } from '../dist/renderer/ObservedRobotPresentationBuffer.js';

const sample = (id, time, value, connectionId = 'robot-session') => ({
  sampleId: id, connectionId, sourceObservedAtSeconds: time / 1000,
  receivedAtMs: time, jointValues: { HeadYaw: value }
});

test('buffered pose boundaries keep continuous velocity without overshooting admitted endpoints', () => {
  const buffer = new ObservedRobotPresentationBuffer();
  [0, .1, .4, .45, .3].forEach((value, index) => buffer.ingest(sample(String(index), index * 100, value)));
  const before = buffer.project(549.9).jointValues.HeadYaw;
  const boundary = buffer.project(550).jointValues.HeadYaw;
  const after = buffer.project(550.1).jointValues.HeadYaw;
  assert.ok(Math.abs((boundary-before)/.1 - (after-boundary)/.1) < .00002, 'velocity must not jump at an admitted pose');
  for (let time = 551; time < 650; time++) {
    const value = buffer.project(time).jointValues.HeadYaw;
    assert.ok(value >= .1 && value <= .4);
  }
  const turnBefore = buffer.project(749.9).jointValues.HeadYaw;
  const turn = buffer.project(750).jointValues.HeadYaw;
  const turnAfter = buffer.project(750.1).jointValues.HeadYaw;
  assert.ok(Math.abs((turn-turnBefore)/.1) < .00002);
  assert.ok(Math.abs((turnAfter-turn)/.1) < .00002);
});

test('declared source cadence survives a transport pause and same-clock burst without dropping poses', () => {
  const buffer = new ObservedRobotPresentationBuffer({ presentationDelayMs: 450 });
  const timed = (id, source, receipt, value) => ({ ...sample(id, receipt, value),
    sourceClock: 'monotonic', sourceObservedAtSeconds: 7000 + source / 1000 });
  buffer.ingest(timed('a', 0, 0, 0));
  buffer.ingest(timed('b', 100, 100, .1));
  buffer.ingest(timed('c', 200, 650, .2));
  buffer.ingest(timed('d', 300, 650, .3));
  buffer.ingest(timed('e', 400, 650, .4));
  assert.ok(Math.abs(buffer.project(700).jointValues.HeadYaw - .25) < 1e-9);
  assert.deepEqual(buffer.project(700).sourceSampleIds, ['b', 'c', 'd', 'e']);
  assert.ok(Math.abs(buffer.project(800).jointValues.HeadYaw - .35) < 1e-9);
  assert.equal(buffer.project(800).active, true);
});

test('source-clock loss, backward time and reconnection clear the timing anchor', () => {
  const buffer = new ObservedRobotPresentationBuffer();
  const first = { ...sample('a', 0, 0), sourceClock: 'monotonic', sourceObservedAtSeconds: 9000 };
  buffer.ingest(first);
  buffer.ingest({ ...first, sampleId: 'b', receivedAtMs: 100, sourceObservedAtSeconds: 8999 });
  assert.equal(buffer.project(100).fallbackReason, 'invalid_sample');
  buffer.ingest({ ...first, sampleId: 'c', connectionId: 'new', receivedAtMs: 200, sourceObservedAtSeconds: 1 });
  assert.equal(buffer.project(200).fallbackReason, 'discontinuity');
  assert.deepEqual(buffer.project(200).sourceSampleIds, ['c']);
  assert.equal(buffer.ingest({ ...first, sampleId: 'missing-clock', sourceObservedAtSeconds: null }), false);
  assert.equal(buffer.project(300), null);
});

test('receipt jitter of 400ms stays bounded and interpolates rather than snapping', () => {
  const buffer = new ObservedRobotPresentationBuffer({ presentationDelayMs: 0 });
  buffer.ingest(sample('a', 0, 0));
  buffer.ingest(sample('b', 100, 0.2));
  buffer.project(200);
  const observation = sample('c', 500, 1);
  buffer.ingest(observation);
  const frame = buffer.project(550);
  assert.equal(frame.state, 'interpolated');
  assert.ok(frame.jointValues.HeadYaw > 0.2 && frame.jointValues.HeadYaw < 1);
  assert.ok(frame.transitionDurationMs <= 200);
  assert.equal(observation.jointValues.HeadYaw, 1);
});

test('a same-clock burst does not collapse a measured 100ms transition to 16ms', () => {
  const buffer = new ObservedRobotPresentationBuffer({ presentationDelayMs: 0 });
  buffer.ingest(sample('a', 0, 0));
  buffer.ingest(sample('b', 100, 0.2));
  buffer.ingest(sample('c', 200, 0.4));
  buffer.ingest(sample('d', 200, 0.6));
  assert.equal(buffer.project(200).transitionDurationMs, 100);
  assert.ok(buffer.project(250).jointValues.HeadYaw < 0.6);
  assert.equal(buffer.project(400).jointValues.HeadYaw, 0.6);
  assert.equal(buffer.isActive(400), false);
});

test('long loss, identity change and raw mode keep their explicit discontinuities', () => {
  const buffer = new ObservedRobotPresentationBuffer({ presentationDelayMs: 0 });
  buffer.ingest(sample('a', 0, 0));
  buffer.ingest(sample('b', 100, 0.2));
  buffer.ingest(sample('c', 800, 1));
  assert.equal(buffer.project(800).fallbackReason, 'sample_gap');
  buffer.ingest(sample('d', 900, -1, 'new-session'));
  assert.equal(buffer.project(900).fallbackReason, 'discontinuity');
  buffer.setMode('raw');
  buffer.ingest(sample('e', 1000, 0.5));
  assert.equal(buffer.project(1000).state, 'raw');
  assert.equal(buffer.project(1000).jointValues.HeadYaw, 0.5);
});

test('steady telemetry follows its cadence without increasing transition lag', () => {
  const buffer = new ObservedRobotPresentationBuffer({ presentationDelayMs: 0 });
  buffer.ingest(sample('a', 0, 0));
  buffer.ingest(sample('b', 100, 1));
  assert.equal(buffer.project(150).transitionDurationMs, 100);
  assert.equal(buffer.project(150).jointValues.HeadYaw, 0.5);
  assert.equal(buffer.project(200).jointValues.HeadYaw, 1);
  assert.equal(buffer.project(1000).jointValues.HeadYaw, 1);
});

test('delayed playback keeps moving during a receipt pause instead of reaching the latest pose early', () => {
  const buffer = new ObservedRobotPresentationBuffer();
  for (let time = 0; time <= 600; time += 100) {
    buffer.ingest(sample(String(time), time, time / 1000));
  }
  const poses = [700, 750, 800, 850, 900, 950].map(time => buffer.project(time));
  for (let index = 1; index < poses.length; index++) {
    assert.ok(poses[index].jointValues.HeadYaw > poses[index - 1].jointValues.HeadYaw);
    assert.equal(poses[index].active, true);
  }
  assert.equal(buffer.getConfig().presentationDelayMs, 450);
});

test('delayed playback uses admitted endpoints, holds on underrun, and clears history on reconnect', () => {
  const buffer = new ObservedRobotPresentationBuffer({ presentationDelayMs: 300 });
  const first = sample('a', 0, 0);
  const second = sample('b', 100, 1);
  buffer.ingest(first); buffer.ingest(second);
  const between = buffer.project(350);
  assert.equal(between.jointValues.HeadYaw, 0.5);
  assert.deepEqual(between.sourceSampleIds, ['a', 'b']);
  assert.equal(buffer.isActive(350), true);
  const held = buffer.project(1000);
  assert.equal(held.jointValues.HeadYaw, 1);
  assert.equal(held.active, false);
  assert.equal(held.fallbackReason, 'sample_gap');
  buffer.ingest(sample('new', 1100, -1, 'new-session'));
  assert.deepEqual(buffer.project(1100).sourceSampleIds, ['new']);
  assert.equal(buffer.project(1100).jointValues.HeadYaw, -1);
  assert.equal(first.jointValues.HeadYaw, 0);
  assert.equal(second.jointValues.HeadYaw, 1);
});

test('buffered receipt bursts remain finite, snapshots are copied and invalidation clears playout', () => {
  const buffer = new ObservedRobotPresentationBuffer();
  const original = sample('a', 0, 0);
  buffer.ingest(original);
  original.jointValues.HeadYaw = 99;
  buffer.ingest(sample('b', 100, 0.2));
  buffer.ingest(sample('c', 500, 0.7));
  buffer.ingest(sample('d', 500, 0.8));
  for (let time = 450; time <= 950; time += 10) {
    const frame = buffer.project(time);
    assert.ok(Number.isFinite(frame.jointValues.HeadYaw));
    assert.ok(frame.jointValues.HeadYaw >= 0 && frame.jointValues.HeadYaw <= 0.8);
  }
  assert.equal(buffer.isActive(1000), false);
  buffer.ingest(sample('invalid', NaN, 0));
  assert.equal(buffer.project(1000), null);
});
