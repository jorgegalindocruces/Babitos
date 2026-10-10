import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import gameData from '../src/data/game-data.json' with { type: 'json' };
import {
  ENEMY_ANIMATION_CLIPS,
  ENEMY_SHEET_ASSETS,
  ENEMY_STATE_CLIPS,
  buildEnemyFrameRectangles,
  enemyUsesPlatformCollision,
  getEnemyClipDurationMs,
  getEnemyClipForState,
  getEnemyStateAfterHit,
  getEnemyTintForState,
  resolveEnemyQaPresentation,
  resetEnemyVisualForDefeat,
  shouldIgnoreEnemyClipIfPlaying,
} from '../src/game/EnemyAnimations.js';
import { getEnemyPatrolDirection, getEnemyWallDirection } from '../src/game/EnemyBehavior.js';
import {
  getEnemyVisualAnchor,
  getEnemyVisualTop,
  shouldFlipEnemyVisual,
} from '../src/game/EnemyPresentation.js';
import {
  BOSS_POSE_CLIPS,
  sampleBossPose,
} from '../src/game/BossAnimator.js';
import {
  PROCEDURAL_ENEMY_SHEETS,
  getProceduralFramePixelBounds,
} from '../src/game/ProceduralEnemySheets.js';
import { decodeRgbaPng } from '../scripts/normalize-vuela-atlas.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

test('enemy sheets expose a complete frame row for every authored clip', () => {
  for (const [type, asset] of Object.entries(ENEMY_SHEET_ASSETS)) {
    const rows = asset.yBounds.length - 1;
    const columns = asset.xBounds.length - 1;
    const frames = buildEnemyFrameRectangles(type);
    assert.equal(frames.length, rows * columns);
    for (const clip of Object.values(ENEMY_ANIMATION_CLIPS[type])) {
      assert.ok(clip.row >= 0 && clip.row < rows, `${type} clip row must exist`);
      assert.ok(clip.frameRate >= 5, `${type} clip must visibly animate`);
      for (const column of clip.columns ?? Array.from({ length: columns }, (_, index) => index)) {
        assert.ok(column >= 0 && column < columns, `${type} clip column must exist`);
      }
    }
  }
});

test('procedural enemy sheets use exact uniform cells without clipped edges', () => {
  for (const [type, definition] of Object.entries(PROCEDURAL_ENEMY_SHEETS)) {
    const frames = buildEnemyFrameRectangles(type);
    const widths = new Set(frames.map((entry) => entry.width));
    const heights = new Set(frames.map((entry) => entry.height));
    const finalFrame = frames.at(-1);

    assert.deepEqual(widths, new Set([definition.cellWidth]));
    assert.deepEqual(heights, new Set([definition.cellHeight]));
    assert.equal(finalFrame.x + finalFrame.width, definition.columns * definition.cellWidth);
    assert.equal(finalFrame.y + finalFrame.height, definition.rows * definition.cellHeight);
    assert.equal(ENEMY_SHEET_ASSETS[type].procedural, true);
    assert.equal(ENEMY_SHEET_ASSETS[type].url, undefined);

    for (let row = 0; row < definition.rows; row += 1) {
      for (let column = 0; column < definition.columns; column += 1) {
        const bounds = getProceduralFramePixelBounds(type, row, column);
        assert.ok(bounds.pixels > 0, `${type} ${row}:${column} must contain visible pixels`);
        assert.ok(bounds.left > 0, `${type} ${row}:${column} touches the left edge`);
        assert.ok(bounds.right < 31, `${type} ${row}:${column} touches the right edge`);
        assert.ok(bounds.top > 0, `${type} ${row}:${column} touches the top edge`);
        assert.ok(bounds.bottom < 31, `${type} ${row}:${column} touches the bottom edge`);
      }
    }
  }
});

test('every enemy AI state resolves to a semantic visual clip', () => {
  assert.equal(getEnemyClipForState('come', 'PATROL'), 'walk');
  assert.equal(getEnemyClipForState('come', 'WINDUP'), 'windup');
  assert.equal(getEnemyClipForState('come', 'BITE'), 'attack');
  assert.equal(getEnemyClipForState('vuela', 'DIVE'), 'dive');
  assert.equal(getEnemyClipForState('da_vueltas', 'PATROL'), 'roll');
  assert.equal(getEnemyClipForState('da_vueltas', 'SPIN'), 'roll');
  assert.equal(getEnemyClipForState('garbanzo_loco', 'ATTACK_WINDUP'), 'windup');
  assert.equal(getEnemyClipForState('garbanzo_loco', 'SPEAR_ATTACK'), 'attack');
  assert.equal(getEnemyClipForState('arbol_pocho', 'TREE_IDLE'), 'idle');
  assert.equal(getEnemyClipForState('arbol_pocho', 'WAKE_UP'), 'wake');
  assert.equal(getEnemyClipForState('arbol_pocho', 'PUNCH_LEFT'), 'punch_left');
  assert.equal(getEnemyClipForState('arbol_pocho', 'PUNCH_RIGHT'), 'punch_right');
  assert.equal(getEnemyClipForState('sapo_pota', 'UNDERWATER'), 'underwater');
  assert.equal(getEnemyClipForState('sapo_pota', 'EMERGE'), 'emerge');
  assert.equal(getEnemyClipForState('sapo_pota', 'TOXIC_VOMIT'), 'vomit');
  assert.equal(getEnemyClipForState('sapo_pota', 'SUBMERGE'), 'submerge');
  assert.equal(getEnemyClipForState('unknown', 'UNKNOWN'), 'idle');

  for (const [type, definition] of Object.entries(gameData.enemies)) {
    for (const state of definition.states) {
      assert.ok(Object.hasOwn(ENEMY_STATE_CLIPS[type], state), `${type}.${state} needs an explicit mapping`);
      const clip = ENEMY_STATE_CLIPS[type][state];
      assert.ok(Object.hasOwn(ENEMY_ANIMATION_CLIPS[type], clip), `${type}.${state} points to ${clip}`);
    }
  }
});

test('enemy clip restarts and state telegraphs preserve their visual contracts', () => {
  assert.equal(shouldIgnoreEnemyClipIfPlaying(false), true);
  assert.equal(shouldIgnoreEnemyClipIfPlaying(true), false);
  assert.equal(getEnemyTintForState('vuela', 'WINDUP'), 0xff78da);
  assert.equal(getEnemyTintForState('come', 'WINDUP'), 0xffcf4a);
  assert.equal(getEnemyTintForState('da_vueltas', 'DIZZY'), 0x9df0ff);
  assert.equal(getEnemyTintForState('vuela', 'DIVE'), null);
  assert.equal(ENEMY_ANIMATION_CLIPS.vuela.dive.repeat, 0);
  assert.equal(ENEMY_ANIMATION_CLIPS.vuela.attack.repeat, 0);
  assert.equal(ENEMY_ANIMATION_CLIPS.vuela.hurt.repeat, 0);
  assert.equal(ENEMY_ANIMATION_CLIPS.come.hurt.repeat, 0);
  assert.equal(ENEMY_ANIMATION_CLIPS.da_vueltas.hurt.repeat, 0);
  assert.deepEqual(ENEMY_ANIMATION_CLIPS.arbol_pocho.punch_left.columns, [0]);
  assert.equal(ENEMY_ANIMATION_CLIPS.arbol_pocho.punch_left.row, 1);
  assert.deepEqual(ENEMY_ANIMATION_CLIPS.arbol_pocho.punch_right.columns, [3]);
  assert.equal(ENEMY_ANIMATION_CLIPS.arbol_pocho.punch_right.row, 0);
  assert.equal(getEnemyClipDurationMs('vuela', 'hurt'), 500);
  assert.ok(getEnemyClipDurationMs('come', 'hurt') > 500);
  assert.ok(Math.abs(getEnemyClipDurationMs('come', 'windup') - (3000 / 7)) < 0.001);
  assert.ok(Math.abs(getEnemyClipDurationMs('come', 'attack') - (4000 / 15)) < 0.001);
});

test('enemy hit reactions interrupt dangerous states and flying ignores terrain', () => {
  assert.equal(getEnemyStateAfterHit('come', 'BITE'), 'RECOVER');
  assert.equal(getEnemyStateAfterHit('come', 'PATROL'), 'PATROL');
  assert.equal(getEnemyStateAfterHit('vuela', 'DIVE'), 'RETURN');
  assert.equal(getEnemyStateAfterHit('vuela', 'WINDUP'), 'RETURN');
  assert.equal(getEnemyStateAfterHit('da_vueltas', 'DIZZY'), 'DIZZY');
  assert.equal(getEnemyStateAfterHit('garbanzo_loco', 'SPEAR_ATTACK'), 'RECOVER');
  assert.equal(getEnemyStateAfterHit('arbol_pocho', 'PUNCH_LEFT'), 'RECOVER');
  assert.equal(getEnemyStateAfterHit('arbol_pocho', 'PUNCH_RIGHT'), 'RECOVER');
  assert.equal(getEnemyStateAfterHit('sapo_pota', 'TOXIC_VOMIT'), 'RECOVER');
  assert.equal(enemyUsesPlatformCollision('vuela'), false);
  assert.equal(enemyUsesPlatformCollision('come'), true);
  assert.equal(enemyUsesPlatformCollision('da_vueltas'), true);
  assert.equal(enemyUsesPlatformCollision('garbanzo_loco'), true);
  assert.equal(enemyUsesPlatformCollision('arbol_pocho'), false);
  assert.equal(enemyUsesPlatformCollision('sapo_pota'), false);
});

test('enemy QA presentation resolves every state and authored clip', () => {
  for (const [type, states] of Object.entries(ENEMY_STATE_CLIPS)) {
    for (const [state, clip] of Object.entries(states)) {
      assert.deepEqual(resolveEnemyQaPresentation(type, state), { state, clip });
    }
    for (const clip of Object.keys(ENEMY_ANIMATION_CLIPS[type])) {
      const presentation = resolveEnemyQaPresentation(type, clip);
      assert.equal(presentation.clip, clip);
      assert.ok(
        presentation.state == null || ENEMY_STATE_CLIPS[type][presentation.state] === clip,
        `${type}.${clip} must resolve to the clip or its same-named AI state`,
      );
    }
  }
  assert.equal(resolveEnemyQaPresentation('vuela', 'not-a-state'), null);
  assert.equal(resolveEnemyQaPresentation('unknown', 'idle'), null);
});

test('patrol and wall directions point inward without frame-to-frame inversion', () => {
  assert.equal(getEnemyPatrolDirection(181, 0, 180, 1), -1);
  assert.equal(getEnemyPatrolDirection(181, 0, 180, -1), -1);
  assert.equal(getEnemyPatrolDirection(-181, 0, 180, -1), 1);
  assert.equal(getEnemyPatrolDirection(20, 0, 180, -1), -1);
  assert.equal(getEnemyWallDirection({ right: true, left: false }, 1), -1);
  assert.equal(getEnemyWallDirection({ right: true, left: false }, -1), -1);
  assert.equal(getEnemyWallDirection({ right: false, left: true }, -1), 1);
});

test('VUELA production atlas has 36 opaque, padded 256px cells', () => {
  const atlasPath = path.resolve(TEST_DIR, '../public/assets/characters/enemy-vuela-sheet-v4.png');
  const atlas = decodeRgbaPng(atlasPath);
  assert.deepEqual([atlas.width, atlas.height], [1536, 1536]);

  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      let visiblePixels = 0;
      let touchesEdge = false;
      for (let y = 0; y < 256; y += 1) {
        for (let x = 0; x < 256; x += 1) {
          const alpha = atlas.pixels[
            (((row * 256 + y) * atlas.width) + column * 256 + x) * 4 + 3
          ];
          assert.ok(alpha === 0 || alpha === 255, `unexpected alpha ${alpha}`);
          if (alpha === 0) continue;
          visiblePixels += 1;
          if (x === 0 || x === 255 || y === 0 || y === 255) touchesEdge = true;
        }
      }
      assert.ok(visiblePixels > 5000, `VUELA ${row}:${column} is empty`);
      assert.equal(touchesEdge, false, `VUELA ${row}:${column} touches a cell edge`);
    }
  }
});

const JUNGLE_SHEETS = Object.freeze([
  { type: 'garbanzo_loco', file: 'enemy-garbanzo-loco-sheet-v2.png', cell: 352, baseline: 244 },
  { type: 'arbol_pocho', file: 'enemy-arbol-pocho-sheet-v2.png', cell: 288, baseline: 248 },
  { type: 'sapo_pota', file: 'enemy-sapo-pota-sheet-v2.png', cell: 400, baseline: 244 },
]);

function readJungleCell(atlas, cellWidth, row, column) {
  const opaque = [];
  for (let y = 0; y < 256; y += 1) {
    for (let x = 0; x < cellWidth; x += 1) {
      const alpha = atlas.pixels[(((row * 256 + y) * atlas.width) + column * cellWidth + x) * 4 + 3];
      assert.ok(alpha === 0 || alpha === 255, `unexpected alpha ${alpha}`);
      if (alpha) opaque.push([x, y]);
    }
  }
  return opaque;
}

test('Jungle enemy v2 sheets keep eight complete, padded poses on one baseline', () => {
  for (const { type, file, cell, baseline } of JUNGLE_SHEETS) {
    const atlas = decodeRgbaPng(path.resolve(TEST_DIR, `../public/assets/characters/${file}`));
    assert.deepEqual([atlas.width, atlas.height], [cell * 4, 512], file);
    assert.deepEqual(ENEMY_SHEET_ASSETS[type].xBounds, [0, cell, cell * 2, cell * 3, cell * 4]);
    assert.deepEqual(ENEMY_SHEET_ASSETS[type].yBounds, [0, 256, 512]);
    assert.match(ENEMY_SHEET_ASSETS[type].url, /-sheet-v2\.png$/);
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const opaque = readJungleCell(atlas, cell, row, column);
        assert.ok(opaque.length > 500, `${file} ${row}:${column} is empty`);
        const xs = opaque.map(([x]) => x);
        const ys = opaque.map(([, y]) => y);
        // v1 sliced poses at fixed 256px edges, leaving fragments near the
        // gutter of the neighbouring cell. Every v2 pose keeps a 4px margin.
        assert.ok(Math.min(...xs) >= 4 && Math.max(...xs) <= cell - 5, `${file} ${row}:${column} touches its gutter`);
        assert.ok(Math.min(...ys) >= 4, `${file} ${row}:${column} touches the top edge`);
        assert.equal(Math.max(...ys), baseline, `${file} ${row}:${column} leaves the shared baseline`);
      }
    }
  }
});

test('Jungle poses stay complete: planted Árbol roots, whole spear and a seated Sapo', () => {
  const footCentre = (opaque) => {
    const feet = opaque.filter(([, y]) => y >= 220);
    return feet.reduce((sum, [x]) => sum + x, 0) / feet.length;
  };
  const arbol = JUNGLE_SHEETS[1];
  const arbolAtlas = decodeRgbaPng(path.resolve(TEST_DIR, `../public/assets/characters/${arbol.file}`));
  // idle, wake, angry, punchRight, punchLeft, recover, hurt (defeat lies down).
  for (const [row, column] of [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2]]) {
    const centre = footCentre(readJungleCell(arbolAtlas, arbol.cell, row, column));
    assert.ok(Math.abs(centre - arbol.cell / 2) <= 6, `Árbol ${row}:${column} roots drift to ${centre}`);
  }
  const garbanzo = JUNGLE_SHEETS[0];
  const garbanzoAtlas = decodeRgbaPng(path.resolve(TEST_DIR, `../public/assets/characters/${garbanzo.file}`));
  const attack = readJungleCell(garbanzoAtlas, garbanzo.cell, 1, 0).map(([x]) => x);
  // The complete spear tip (82 world px at 1/2 scale) is part of `attack`.
  assert.ok(Math.max(...attack) - garbanzo.cell / 2 >= 160, 'Garbanzo attack lost its spear tip');
  const sapo = JUNGLE_SHEETS[2];
  const sapoAtlas = decodeRgbaPng(path.resolve(TEST_DIR, `../public/assets/characters/${sapo.file}`));
  // The vomit pose used to sit ~100px away from idle.
  for (const [row, column] of [[0, 2], [0, 3], [1, 0]]) {
    const centre = footCentre(readJungleCell(sapoAtlas, sapo.cell, row, column));
    assert.ok(Math.abs(centre - sapo.cell / 2) <= 16, `Sapo ${row}:${column} seat drifts to ${centre}`);
  }
});

test('enemy defeat presentation clears transient squash, alpha and tint', () => {
  const calls = [];
  const visual = {
    active: true,
    setScale(x, y) { calls.push(['scale', x, y]); return this; },
    setRotation(rotation) { calls.push(['rotation', rotation]); return this; },
    setAlpha(alpha) { calls.push(['alpha', alpha]); return this; },
    clearTint() { calls.push(['tint']); return this; },
  };

  assert.equal(resetEnemyVisualForDefeat(visual, { x: 0.5, y: 0.75 }), true);
  assert.deepEqual(calls, [
    ['scale', 0.5, 0.75],
    ['rotation', 0],
    ['alpha', 1],
    ['tint'],
  ]);
  assert.equal(resetEnemyVisualForDefeat({ active: false }), false);
});

test('COME stays foot-anchored to terrain at every squash height', () => {
  const anchor = getEnemyVisualAnchor('come', { y: 446, body: { bottom: 480 } });
  assert.deepEqual(anchor, { originY: 1, y: 480 });
  for (const displayHeight of [118, 118 * 0.94, 118 * 0.9]) {
    const top = getEnemyVisualTop(anchor.y, displayHeight, anchor.originY);
    assert.equal(top + displayHeight, 480);
  }

  assert.deepEqual(
    getEnemyVisualAnchor('vuela', { y: 270, body: { bottom: 286 } }),
    { originY: 0.5, y: 270 },
  );
  assert.deepEqual(
    getEnemyVisualAnchor('garbanzo_loco', { y: 442, body: { bottom: 480 } }),
    { originY: 1, y: 486 },
  );
  assert.deepEqual(
    getEnemyVisualAnchor('arbol_pocho', { y: 405, body: { bottom: 480 } }),
    { originY: 1, y: 485 },
  );
  assert.equal(shouldFlipEnemyVisual('sapo_pota', -1), false);
  assert.equal(shouldFlipEnemyVisual('sapo_pota', 1), true);
  assert.equal(shouldFlipEnemyVisual('arbol_pocho', -1), false);
});

test('boss animation samples stepped poses and loops each combat state', () => {
  for (const [state, clip] of Object.entries(BOSS_POSE_CLIPS)) {
    assert.ok(clip.length >= 4, `${state} needs multiple readable poses`);
    const duration = clip.reduce((total, pose) => total + pose.duration, 0);
    assert.strictEqual(sampleBossPose(state, 0), clip[0]);
    assert.strictEqual(sampleBossPose(state, duration), clip[0]);
    assert.notStrictEqual(sampleBossPose(state, clip[0].duration), clip[0]);
  }
});
