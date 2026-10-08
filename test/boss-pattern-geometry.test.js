import assert from 'node:assert/strict';
import test from 'node:test';

import { getVolleyPositions } from '../src/game/bossPatternGeometry.js';

test('meteor volleys keep their authored spacing at both arena edges', () => {
  const left = getVolleyPositions({
    center: 40,
    count: 3,
    spacing: 150,
    minX: 40,
    maxX: 920,
    offset: -30,
  });
  const right = getVolleyPositions({
    center: 920,
    count: 3,
    spacing: 150,
    minX: 40,
    maxX: 920,
    offset: 30,
  });

  assert.deepEqual(left, [40, 190, 340]);
  assert.deepEqual(right, [620, 770, 920]);
  for (const positions of [left, right]) {
    assert.deepEqual(
      positions.slice(1).map((position, index) => position - positions[index]),
      [150, 150],
    );
  }
});

test('meteor volleys preserve an in-bounds offset without changing their gaps', () => {
  assert.deepEqual(
    getVolleyPositions({
      center: 480,
      count: 3,
      spacing: 150,
      minX: 40,
      maxX: 920,
      offset: 25,
    }),
    [355, 505, 655],
  );
});

test('volley geometry rejects an impossible arena instead of compressing hazards', () => {
  assert.throws(
    () => getVolleyPositions({
      center: 100,
      count: 3,
      spacing: 150,
      minX: 0,
      maxX: 200,
    }),
    RangeError,
  );
});
