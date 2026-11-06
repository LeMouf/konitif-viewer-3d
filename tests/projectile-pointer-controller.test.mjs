import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ProjectilePointerController} from '../dist/renderer/ProjectilePointerController.js';

const event = (type, pointerId = 7, button = 2) => Object.assign(new Event(type, {cancelable: true}), {pointerId, button});
class Surface extends EventTarget {
  captures = new Set();
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) {
    this.captures.delete(id);
    this.dispatchEvent(event('lostpointercapture', id));
  }
}
function fixture() {
  const element = new Surface();
  let enabled = true, charging = false, starts = 0, launches = 0, cancels = 0;
  const controller = new ProjectilePointerController({
    element, enabled: () => enabled,
    begin() { if (charging) return false; starts += 1; charging = true; return true; },
    launch() { launches += 1; charging = false; },
    cancel() { cancels += 1; charging = false; },
  });
  return {element, controller, mode: value => { enabled = value; }, charging: value => { charging = value; },
    snapshot: () => ({starts, launches, cancels, charging})};
}

test('constructing a pointer projection issues no host command', () => {
  const f = fixture();
  assert.deepEqual(f.snapshot(), {starts: 0, launches: 0, cancels: 0, charging: false});
  assert.equal(f.controller.active, false);
  f.controller.dispose();
});

test('right press owns one pointer and matching release launches exactly once', () => {
  const f = fixture();
  const press = event('pointerdown'); f.element.dispatchEvent(press);
  assert.equal(press.defaultPrevented, true);
  assert.equal(f.element.hasPointerCapture(7), true);
  assert.equal(f.controller.active, true);
  f.element.dispatchEvent(event('pointerdown'));
  f.element.dispatchEvent(event('pointerup'));
  assert.deepEqual(f.snapshot(), {starts: 1, launches: 1, cancels: 0, charging: false});
  assert.equal(f.controller.active, false);
  assert.equal(f.element.hasPointerCapture(7), false);
  f.controller.dispose();
});

test('an unrelated pointer or button cannot release the captured charge', () => {
  const f = fixture();
  f.element.dispatchEvent(event('pointerdown'));
  f.element.dispatchEvent(event('pointerup', 8));
  f.element.dispatchEvent(event('pointerup', 7, 0));
  assert.equal(f.controller.active, true);
  assert.equal(f.snapshot().launches, 0);
  f.element.dispatchEvent(event('pointerup'));
  assert.equal(f.snapshot().launches, 1);
  f.controller.dispose();
});

test('cancellation and lost capture discard the charge without launching', () => {
  for (const type of ['pointercancel', 'lostpointercapture']) {
    const f = fixture();
    f.element.dispatchEvent(event('pointerdown'));
    f.element.dispatchEvent(event(type));
    assert.equal(f.controller.active, false);
    assert.equal(f.snapshot().cancels, 1);
    assert.equal(f.snapshot().launches, 0);
    f.controller.dispose();
  }
});

test('other interaction modes keep their pointer and context-menu behavior', () => {
  const f = fixture(); f.mode(false);
  const down = event('pointerdown'); f.element.dispatchEvent(down);
  const menu = event('contextmenu'); f.element.dispatchEvent(menu);
  assert.equal(down.defaultPrevented, false);
  assert.equal(menu.defaultPrevented, false);
  assert.equal(f.snapshot().starts, 0);
  f.controller.dispose();
});

test('pointer input does not take ownership of an existing keyboard charge', () => {
  const f = fixture(); f.charging(true);
  f.element.dispatchEvent(event('pointerdown'));
  f.controller.cancel();
  assert.equal(f.controller.active, false);
  assert.deepEqual(f.snapshot(), {starts: 0, launches: 0, cancels: 0, charging: true});
  f.controller.dispose();
});

test('disposal cancels its own charge and detaches all pointer listeners', () => {
  const f = fixture(); f.element.dispatchEvent(event('pointerdown'));
  f.controller.dispose();
  f.element.dispatchEvent(event('pointerdown')); f.element.dispatchEvent(event('pointerup'));
  f.controller.dispose();
  assert.deepEqual(f.snapshot(), {starts: 1, launches: 0, cancels: 1, charging: false});
});

test('projectile mode suppresses its native context menu only while enabled', () => {
  const f = fixture();
  const menu = event('contextmenu'); f.element.dispatchEvent(menu);
  assert.equal(menu.defaultPrevented, true);
  f.controller.dispose();
});
