import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ONE_WAY_LANDING_TOLERANCE,
  findOneWayPlatformsUnder,
  hasClearedPlatform,
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

function standing({ bottom = 100, left = 40, right = 70 } = {}) {
  return { bottom, left, right, velocity: { y: 0 }, prev: { y: bottom - 40 }, height: 40 };
}

function spanned(kind, { top = 100, left = 0, right = 200 } = {}) {
  const platform = terrain(kind, top);
  platform.active = true;
  Object.assign(platform.body, { left, right, x: left });
  return platform;
}

test('↓ finds only the one-way platforms under the feet', () => {
  const below = spanned('platform');
  const ground = spanned('ground');
  const aside = spanned('platform', { left: 300, right: 400 });
  const higher = spanned('platform', { top: 60 });
  assert.deepEqual(findOneWayPlatformsUnder(standing(), [below, ground, aside, higher]), [below]);
  assert.deepEqual(findOneWayPlatformsUnder(standing({ bottom: 130 }), [below]), []);
  assert.deepEqual(findOneWayPlatformsUnder(undefined, [below]), []);
});

test('a dropping body ignores its platform until it is clearly below it', () => {
  const platform = spanned('platform');
  const ignore = new Set([platform]);
  const resting = { body: standing() };
  assert.equal(shouldCollideWithTerrain(resting, platform), true);
  assert.equal(shouldCollideWithTerrain(resting, platform, { ignore }), false);
  assert.equal(shouldCollideWithTerrain(resting, spanned('platform'), { ignore }), true);
  assert.equal(shouldCollideWithTerrain(resting, spanned('ground'), { ignore: new Set([spanned('ground')]) }), true);

  assert.equal(hasClearedPlatform(standing({ bottom: 104 }), platform, 10), false);
  assert.equal(hasClearedPlatform(standing({ bottom: 111 }), platform, 10), true);
  assert.equal(hasClearedPlatform(standing({ left: 210, right: 240 }), platform, 10), true);
  platform.active = false;
  assert.equal(hasClearedPlatform(standing(), platform, 10), true);
});
