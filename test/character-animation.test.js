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
import { getEnemyVisualAnchor, getEnemyVisualTop } from '../src/game/EnemyPresentation.js';
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
  assert.equal(enemyUsesPlatformCollision('vuela'), false);
  assert.equal(enemyUsesPlatformCollision('come'), true);
  assert.equal(enemyUsesPlatformCollision('da_vueltas'), true);
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
