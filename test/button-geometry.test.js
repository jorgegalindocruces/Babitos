import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buttonHitAreaContains,
  getButtonHitArea,
} from '../src/ui/buttonGeometry.js';

test('button hit area covers the complete visual button and its shadow', () => {
  const area = getButtonHitArea(150, 42, 5);

  assert.deepEqual(area, {
    x: 0,
    y: 0,
    width: 150,
    height: 47,
  });
  assert.equal(buttonHitAreaContains(area, 0, 0), true);
  assert.equal(buttonHitAreaContains(area, 75, 21), true);
  assert.equal(buttonHitAreaContains(area, 150, 47), true);
  assert.equal(buttonHitAreaContains(area, 151, 21), false);
  assert.equal(buttonHitAreaContains(area, 75, 48), false);
});

test('button hit area never shifts into negative local coordinates', () => {
  const area = getButtonHitArea(48, 32, 5);

  assert.equal(area.x, 0);
  assert.equal(area.y, 0);
  assert.equal(buttonHitAreaContains(area, -1, 10), false);
  assert.equal(buttonHitAreaContains(area, 10, -1), false);
  assert.equal(buttonHitAreaContains(area, 47, 36), true);
});

test('optional hit slop adds touch tolerance on every edge', () => {
  const area = getButtonHitArea(48, 32, 5, 4);

  assert.deepEqual(area, {
    x: -4,
    y: -4,
    width: 56,
    height: 45,
  });
  assert.equal(buttonHitAreaContains(area, -4, -4), true);
  assert.equal(buttonHitAreaContains(area, 52, 41), true);
  assert.equal(buttonHitAreaContains(area, -5, 0), false);
  assert.equal(buttonHitAreaContains(area, 53, 0), false);
});

test('button hit area sanitizes invalid geometry', () => {
  assert.deepEqual(getButtonHitArea('bad', -8, Number.NaN), {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
});
