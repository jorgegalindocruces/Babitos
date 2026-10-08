import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ONE_WAY_LANDING_TOLERANCE,
  isOneWayPlatform,
  shouldCollideWithTerrain,
} from '../src/game/platformCollision.js';

function terrain(kind, top = 100) {
  return {
    body: { top, y: top },
    getData(key) {
      if (key === 'kind') return kind;
      if (key === 'isPlatform') return true;
      return undefined;
    },
  };
}

function mover({ velocityY = 0, previousBottom = 100, height = 40 } = {}) {
  return {
    body: {
      velocity: { y: velocityY },
      prev: { y: previousBottom - height },
      height,
      bottom: previousBottom,
    },
  };
}

test('ground and unclassified terrain stay solid from every direction', () => {
  assert.equal(shouldCollideWithTerrain(mover({ velocityY: -200 }), terrain('ground')), true);
  assert.equal(shouldCollideWithTerrain(mover({ previousBottom: 130 }), terrain('ground')), true);
  assert.equal(shouldCollideWithTerrain(mover(), terrain(undefined)), true);
  assert.equal(isOneWayPlatform(terrain('ground')), false);
});

test('elevated platforms are traversable while ascending or already underneath', () => {
  const platform = terrain('platform');
  assert.equal(isOneWayPlatform(platform), true);
  assert.equal(
    shouldCollideWithTerrain(mover({ velocityY: -240, previousBottom: 96 }), platform),
    false,
  );
  assert.equal(
    shouldCollideWithTerrain(mover({ velocityY: 120, previousBottom: 105 }), platform),
    false,
  );
});

test('a descending or resting body lands only when it approached from above', () => {
  const platform = terrain('platform');
  assert.equal(
    shouldCollideWithTerrain(mover({ velocityY: 220, previousBottom: 96 }), platform),
    true,
  );
  assert.equal(
    shouldCollideWithTerrain(mover({ velocityY: 0, previousBottom: 100 }), platform),
    true,
  );
  assert.equal(
    shouldCollideWithTerrain(
      mover({ velocityY: 80, previousBottom: 100 + ONE_WAY_LANDING_TOLERANCE }),
      platform,
    ),
    true,
  );
  assert.equal(
    shouldCollideWithTerrain(
      mover({ velocityY: 80, previousBottom: 101 + ONE_WAY_LANDING_TOLERANCE }),
      platform,
    ),
    false,
  );
});

test('the process callback accepts reversed arguments and fails safely on missing metadata', () => {
  const platform = terrain('platform');
  assert.equal(
    shouldCollideWithTerrain(platform, mover({ velocityY: 160, previousBottom: 98 })),
    true,
  );
  assert.equal(shouldCollideWithTerrain(platform, {}), true);
  assert.equal(
    shouldCollideWithTerrain(
      { body: { velocity: { y: Number.NaN }, prev: { y: 40 }, height: 40 } },
      platform,
    ),
    true,
  );
});
