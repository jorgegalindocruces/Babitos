import assert from 'node:assert/strict';
import test from 'node:test';

import gameData from '../src/data/game-data.json' with { type: 'json' };
import jungla from '../src/data/levels/jungla.json' with { type: 'json' };
import {
  getGroundSpans,
  getLevel,
  LEVELS,
  resolveLevelId,
} from '../src/data/levels/index.js';
import { SaveStore, createMemoryStorage } from '../src/state/SaveStore.js';
import { isJungleUnlocked, startPhaseTwo } from '../src/state/progressionFlow.js';

// The authored contract keeps every unsupported hop at or below 160 px.
const MAX_FAIR_PIT = 160;

function spanAt(spans, x) {
  return spans.find((span) => x >= span.left && x <= span.right);
}

test('saved progress scenes resume the matching level', () => {
  assert.equal(resolveLevelId('jungla'), 'jungla');
  assert.equal(resolveLevelId('jungle'), 'jungla');
  assert.equal(resolveLevelId('babilandia'), 'babilandia');
  assert.equal(resolveLevelId(undefined), 'babilandia');
  assert.equal(getLevel('jungla').boss.scene, 'DarknessBossScene');
  assert.equal(getLevel('babilandia').boss.scene, 'BossScene');
  const prefixes = Object.values(LEVELS).map((level) => level.coinRewardPrefix);
  assert.equal(new Set(prefixes).size, prefixes.length, 'coin rewards must not collide between levels');
});

test('touching ground segments merge, so Babilandia stays one walkable span', () => {
  assert.equal(getGroundSpans(LEVELS.babilandia.data.platforms).length, 1);
  assert.deepEqual(
    getGroundSpans([
      { x: 50, width: 100, kind: 'ground' },
      { x: 150, width: 100, kind: 'ground' },
      { x: 400, width: 100, kind: 'ground' },
      { x: 400, width: 40, kind: 'ground', style: 'ruin' },
    ]),
    [{ left: 0, right: 200 }, { left: 350, right: 450 }],
  );
});

test('every pit in La Jungla can be jumped or crossed on bridges', () => {
  const spans = getGroundSpans(jungla.platforms);
  assert.ok(spans.length > 1, 'La Jungla must have pits');
  assert.equal(spans[0].left, 0);
  assert.equal(spans.at(-1).right, jungla.worldWidth);
  for (let index = 0; index < spans.length - 1; index += 1) {
    const gapLeft = spans[index].right;
    const gapRight = spans[index + 1].left;
    // Low one-way platforms inside the pit act as stepping stones.
    const steps = jungla.platforms
      .filter((platform) => platform.kind === 'platform' && platform.y >= 400)
      .map((platform) => ({ left: platform.x - platform.width / 2, right: platform.x + platform.width / 2 }))
      .filter((step) => step.right > gapLeft && step.left < gapRight)
      .sort((first, second) => first.left - second.left);
    let edge = gapLeft;
    for (const step of steps) {
      assert.ok(step.left - edge <= MAX_FAIR_PIT, `hop of ${step.left - edge}px at x=${edge}`);
      edge = Math.max(edge, step.right);
    }
    assert.ok(gapRight - edge <= MAX_FAIR_PIT, `pit of ${gapRight - edge}px at x=${edge}`);
  }
});

test('La Jungla checkpoints, walkers, springs and portal stand on solid ground', () => {
  const spans = getGroundSpans(jungla.platforms);
  for (const checkpoint of jungla.checkpoints) {
    const span = spanAt(spans, checkpoint.x);
    assert.ok(span && checkpoint.x - span.left >= 40 && span.right - checkpoint.x >= 40, checkpoint.id);
  }
  for (const enemy of jungla.enemies.filter((entry) => entry.type !== 'vuela')) {
    assert.ok(spanAt(spans, enemy.x), `${enemy.id} would spawn over a pit`);
  }
  for (const spring of jungla.springs) assert.ok(spanAt(spans, spring.x), spring.id);
  assert.ok(spanAt(spans, jungla.bossPortal.x), 'portal');
  assert.ok(jungla.enemies.length > LEVELS.babilandia.data.enemies.length, 'world 2 adds encounters');
});

test('La Jungla keeps its complete authored Phase 2 composition', () => {
  assert.equal(jungla.worldWidth, 6400);
  assert.equal(jungla.checkpoints.length, 4);
  assert.deepEqual(jungla.checkpoints.map(({ id }) => id), ['start', 'lianas', 'ruinas', 'penumbra']);
  assert.equal(jungla.enemies.length, 8);
  assert.equal(jungla.coins.length, 30);
  assert.equal(jungla.springs.length, 2);
  assert.equal(jungla.tutorialSigns.length, 7);
  assert.deepEqual(jungla.darkness, { startX: 4000, endX: 6000, maxAlpha: 0.42 });
  assert.deepEqual(jungla.bossPortal, { x: 6230, y: 480 });
});

test('La Oscuridad is a light-vulnerable boss with a one-time reward', () => {
  const boss = gameData.bossData.la_oscuridad;
  assert.equal(boss.name, 'LA OSCURIDAD');
  assert.deepEqual(boss.patterns, ['SHADOW_GLIDE', 'SHADOW_RAIN', 'DARK_WAVE']);
  assert.ok(boss.exposedMs >= 2000 && boss.lanternLitMs > boss.exposedMs);
  assert.ok(boss.rewardCoins > gameData.bossData.babito_corrupto.rewardCoins);
});

test('La Jungla unlocks after Phase 1 and starts at its first checkpoint', () => {
  const store = new SaveStore({ storage: createMemoryStorage() });
  assert.equal(isJungleUnlocked(store.getState().progress), false);
  store.setProgress({ boss1Defeated: true, phase1Complete: true, scene: 'map' });
  assert.equal(isJungleUnlocked(store.getState().progress), true);
  const progress = startPhaseTwo(store);
  assert.equal(progress.scene, 'jungla');
  assert.equal(progress.checkpoint, 'start');
  assert.equal(progress.phase1Complete, true);
  assert.equal(progress.phase2Complete, false);
  store.setProgress({ boss2Defeated: true, phase2Complete: true, scene: 'shop' });
  const reloaded = store.getState().progress;
  assert.equal(reloaded.phase2Complete, true);
  assert.equal(reloaded.boss2Defeated, true);
});
