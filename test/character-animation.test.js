import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENEMY_ANIMATION_CLIPS,
  ENEMY_SHEET_ASSETS,
  buildEnemyFrameRectangles,
  getEnemyClipForState,
  getEnemyTintForState,
  resetEnemyVisualForDefeat,
  shouldIgnoreEnemyClipIfPlaying,
} from '../src/game/EnemyAnimations.js';
import {
  BOSS_POSE_CLIPS,
  sampleBossPose,
} from '../src/game/BossAnimator.js';
import {
  PROCEDURAL_ENEMY_SHEETS,
  getProceduralFramePixelBounds,
} from '../src/game/ProceduralEnemySheets.js';

test('enemy sheets expose a complete frame row for every authored clip', () => {
  for (const [type, asset] of Object.entries(ENEMY_SHEET_ASSETS)) {
    const rows = asset.yBounds.length - 1;
    const columns = asset.xBounds.length - 1;
    const frames = buildEnemyFrameRectangles(type);
    assert.equal(frames.length, rows * columns);
    for (const clip of Object.values(ENEMY_ANIMATION_CLIPS[type])) {
      assert.ok(clip.row >= 0 && clip.row < rows, `${type} clip row must exist`);
      assert.ok(clip.frameRate >= 5, `${type} clip must visibly animate`);
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
  assert.equal(getEnemyClipForState('come', 'BITE'), 'attack');
  assert.equal(getEnemyClipForState('vuela', 'DIVE'), 'dive');
  assert.equal(getEnemyClipForState('da_vueltas', 'PATROL'), 'roll');
  assert.equal(getEnemyClipForState('da_vueltas', 'SPIN'), 'roll');
  assert.equal(getEnemyClipForState('unknown', 'UNKNOWN'), 'idle');
});

test('enemy clip restarts and state telegraphs preserve their visual contracts', () => {
  assert.equal(shouldIgnoreEnemyClipIfPlaying(false), true);
  assert.equal(shouldIgnoreEnemyClipIfPlaying(true), false);
  assert.equal(getEnemyTintForState('vuela', 'WINDUP'), 0xff78da);
  assert.equal(getEnemyTintForState('come', 'WINDUP'), 0xffcf4a);
  assert.equal(getEnemyTintForState('da_vueltas', 'DIZZY'), 0x9df0ff);
  assert.equal(getEnemyTintForState('vuela', 'DIVE'), null);
});

test('enemy defeat presentation clears transient squash, alpha and tint', () => {
  const calls = [];
  const visual = {
    active: true,
    setScale(x, y) { calls.push(['scale', x, y]); return this; },
    setAlpha(alpha) { calls.push(['alpha', alpha]); return this; },
    clearTint() { calls.push(['tint']); return this; },
  };

  assert.equal(resetEnemyVisualForDefeat(visual, { x: 0.5, y: 0.75 }), true);
  assert.deepEqual(calls, [
    ['scale', 0.5, 0.75],
    ['alpha', 1],
    ['tint'],
  ]);
  assert.equal(resetEnemyVisualForDefeat({ active: false }), false);
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
