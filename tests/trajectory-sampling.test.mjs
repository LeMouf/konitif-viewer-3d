import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sampleRobotMotionJointValuesAtTime } from '../dist/renderer/index.js';

const animation = {
  motion: {
    hasMotion: true,
    tracks: [{
      target: 'LShoulderPitch',
      property: 'angle',
      unitKind: 'angle_deg',
      interpolation: 'linear',
      keys: [
        { frame: 0, time: 0, value: 0 },
        { frame: 25, time: 1, value: 90 }
      ]
    }]
  },
  timeline: { durationSeconds: 1 }
};

test('trajectory sampling projects distinct authored poses without runtime state', () => {
  assert.deepEqual(sampleRobotMotionJointValuesAtTime(animation, 0, 1), [
    { target: 'LShoulderPitch', value: 0 }
  ]);
  assert.deepEqual(sampleRobotMotionJointValuesAtTime(animation, 0.5, 1), [
    { target: 'LShoulderPitch', value: Math.PI / 4 }
  ]);
  assert.deepEqual(sampleRobotMotionJointValuesAtTime(animation, 1, 1), [
    { target: 'LShoulderPitch', value: Math.PI / 2 }
  ]);
});
