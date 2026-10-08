import assert from 'node:assert/strict';
import test from 'node:test';
import babilandia from '../src/data/levels/babilandia.json' with { type: 'json' };
import jungla from '../src/data/levels/jungla.json' with { type: 'json' };
import {
  findSupportingSurface,
  getSurfaceBounds,
  placeOnSurface,
  TUTORIAL_SIGN_STYLE,
} from '../src/game/surfaceAnchoring.js';

const overlappingSurfaces = Object.freeze([
  Object.freeze({ id: 'ground', x: 50, y: 110, width: 100, height: 20, kind: 'ground' }),
  Object.freeze({ id: 'ledge', x: 80, y: 60, width: 20, height: 20, kind: 'platform' }),
]);

test('surface bounds use the visible top edge of centered level geometry', () => {
  assert.deepEqual(getSurfaceBounds(overlappingSurfaces[0]), {
    left: 0,
    right: 100,
    surfaceY: 100,
  });
  assert.equal(getSurfaceBounds({ x: 0, y: 0, width: 0, height: 10 }), null);
});

test('the highest surface supporting the complete footprint wins', () => {
  const elevated = findSupportingSurface(overlappingSurfaces, {
    x: 88,
    width: 4,
  });
  assert.equal(elevated.platform.id, 'ledge');
  assert.equal(elevated.surfaceY, 50);

  const fallsBackToGround = findSupportingSurface(overlappingSurfaces, {
    x: 89,
    width: 4,
  });
  assert.equal(fallsBackToGround.platform.id, 'ground');
  assert.equal(fallsBackToGround.surfaceY, 100);
});

test('surface placement accounts for origin, height and a requested gap', () => {
  const placement = placeOnSurface(overlappingSurfaces, {
    x: 25,
    width: 10,
    height: 20,
    originY: 0.5,
    gap: 4,
  });

  assert.equal(placement.y, 86);
  assert.equal(placement.y + 20 * (1 - 0.5), placement.surfaceY - 4);
  assert.equal(placeOnSurface(overlappingSurfaces, { x: 140, width: 10 }), null);
});

test('every Babilandia tutorial sign is data-driven and physically supported', () => {
  const expectedSurfaceY = new Map([
    ['movement', 480],
    ['come', 377],
    ['vuela', 480],
    ['da_vueltas', 407],
    ['portal', 352],
  ]);
  const ids = new Set();

  for (const sign of babilandia.tutorialSigns) {
    assert.ok(sign.id && sign.text, 'each tutorial sign needs an id and text');
    assert.equal(Object.hasOwn(sign, 'y'), false, `${sign.id} must not store a manual y`);
    assert.equal(ids.has(sign.id), false, `duplicate tutorial sign id ${sign.id}`);
    ids.add(sign.id);

    const placement = placeOnSurface(babilandia.platforms, {
      x: sign.x,
      width: TUTORIAL_SIGN_STYLE.postWidth,
      originY: 1,
    });
    assert.ok(placement, `${sign.id} has no supporting platform`);
    assert.equal(placement.surfaceY, expectedSurfaceY.get(sign.id));
    assert.equal(placement.y, placement.surfaceY, `${sign.id} must touch its support`);
  }

  assert.deepEqual(
    [...ids].sort(),
    [...expectedSurfaceY.keys()].sort(),
    'the complete tutorial sign set must remain present',
  );

  const daVueltas = babilandia.enemies.find((enemy) => enemy.id === 'da_vueltas_1');
  const fountain = babilandia.checkpoints.find((checkpoint) => checkpoint.id === 'fountain');
  const warning = babilandia.tutorialSigns.find((sign) => sign.id === 'da_vueltas');
  assert.ok(
    Math.abs(warning.x - daVueltas.x) >= 160,
    'the tutorial sign must remain visually clear of the enemy',
  );
  assert.ok(
    Math.abs(warning.x - (fountain.x - 42)) >= 160,
    'the tutorial sign must remain visually clear of the checkpoint flag',
  );

  const warningPlacement = placeOnSurface(babilandia.platforms, {
    x: warning.x,
    width: TUTORIAL_SIGN_STYLE.postWidth,
    originY: 1,
  });
  const boardBounds = {
    left: warning.x - TUTORIAL_SIGN_STYLE.maxBoardWidth / 2,
    right: warning.x + TUTORIAL_SIGN_STYLE.maxBoardWidth / 2,
    top: warningPlacement.surfaceY
      - TUTORIAL_SIGN_STYLE.postHeight
      - TUTORIAL_SIGN_STYLE.minBoardHeight,
    bottom: warningPlacement.surfaceY - TUTORIAL_SIGN_STYLE.postHeight,
  };
  for (const platform of babilandia.platforms) {
    if (platform === warningPlacement.support.platform) continue;
    const surface = getSurfaceBounds(platform);
    const platformBottom = platform.y + platform.height / 2;
    const overlaps = boardBounds.left < surface.right
      && boardBounds.right > surface.left
      && boardBounds.top < platformBottom
      && boardBounds.bottom > surface.surfaceY;
    assert.equal(overlaps, false, 'the DA VUELTAS board must not intersect another platform');
  }
});

test('every La Jungla tutorial sign is data-driven and physically supported', () => {
  const ids = new Set();

  for (const sign of jungla.tutorialSigns) {
    assert.ok(sign.id && sign.text, 'each tutorial sign needs an id and text');
    assert.equal(Object.hasOwn(sign, 'y'), false, `${sign.id} must not store a manual y`);
    assert.equal(ids.has(sign.id), false, `duplicate tutorial sign id ${sign.id}`);
    ids.add(sign.id);

    const placement = placeOnSurface(jungla.platforms, {
      x: sign.x,
      width: TUTORIAL_SIGN_STYLE.postWidth,
      originY: 1,
    });
    assert.ok(placement, `${sign.id} has no supporting platform`);
    assert.equal(placement.y, placement.surfaceY, `${sign.id} must touch its support`);
  }

  assert.equal(ids.size, 7, 'the complete Jungle tutorial sign set must remain present');
});
