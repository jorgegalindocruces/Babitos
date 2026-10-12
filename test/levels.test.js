import assert from 'node:assert/strict';
import test from 'node:test';

import gameData from '../src/data/game-data.json' with { type: 'json' };
import city from '../src/data/levels/city.json' with { type: 'json' };
import jungla from '../src/data/levels/jungla.json' with { type: 'json' };
import {
  getGroundSpans,
  getLevel,
  LEVELS,
  resolveLevelId,
} from '../src/data/levels/index.js';
import { SaveStore, createMemoryStorage } from '../src/state/SaveStore.js';
import {
  isCityUnlocked,
  isJungleUnlocked,
  startPhaseThree,
  startPhaseTwo,
} from '../src/state/progressionFlow.js';

// The authored contract keeps every unsupported hop at or below 160 px.
const MAX_FAIR_PIT = 160;

function spanAt(spans, x) {
  return spans.find((span) => x >= span.left && x <= span.right);
}

test('saved progress scenes resume the matching level', () => {
  assert.equal(resolveLevelId('jungla'), 'jungla');
  assert.equal(resolveLevelId('jungle'), 'jungla');
  assert.equal(resolveLevelId('babilandia'), 'babilandia');
  assert.equal(resolveLevelId('city'), 'city');
  assert.equal(resolveLevelId('ciudad'), 'city');
  assert.equal(resolveLevelId(undefined), 'babilandia');
  assert.equal(getLevel('jungla').boss.scene, 'DarknessBossScene');
  assert.equal(getLevel('jungla').backgroundAsset, 'jungleV1');
  assert.equal(getLevel('babilandia').boss.scene, 'BossScene');
  assert.equal(getLevel('city').boss.scene, 'ComingSoonScene');
  assert.equal(getLevel('city').boss.progress.phase3Complete, true);
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

test('La Jungla checkpoints, grounded enemies, springs and portal stand on solid ground', () => {
  const spans = getGroundSpans(jungla.platforms);
  for (const checkpoint of jungla.checkpoints) {
    const span = spanAt(spans, checkpoint.x);
    assert.ok(span && checkpoint.x - span.left >= 40 && span.right - checkpoint.x >= 40, checkpoint.id);
  }
  for (const enemy of jungla.enemies.filter((entry) => entry.type !== 'sapo_pota')) {
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
  assert.equal(jungla.enemies.length, 10);
  assert.equal(jungla.coins.length, 30);
  assert.equal(jungla.springs.length, 2);
  assert.equal(jungla.tutorialSigns.length, 7);
  assert.deepEqual(jungla.darkness, { startX: 4000, endX: 6000, maxAlpha: 0.42 });
  assert.deepEqual(jungla.bossPortal, { x: 6230, y: 480 });
});

test('La Jungla replaces Phase 1 enemies with its six authored encounter beats', () => {
  const phaseOneTypes = new Set(LEVELS.babilandia.data.enemies.map(({ type }) => type));
  const jungleTypes = new Set(jungla.enemies.map(({ type }) => type));

  assert.deepEqual(phaseOneTypes, new Set(['come', 'vuela', 'da_vueltas']));
  assert.deepEqual(jungleTypes, new Set(['garbanzo_loco', 'arbol_pocho', 'sapo_pota']));
  assert.equal(
    jungla.enemies.some(({ type }) => phaseOneTypes.has(type)),
    false,
    'Phase 1 enemies must remain in Babilandia instead of being reused in La Jungla',
  );

  const byId = Object.fromEntries(jungla.enemies.map((enemy) => [enemy.id, enemy]));
  assert.equal(byId.garbanzo_inicio.type, 'garbanzo_loco');
  assert.equal(byId.arbol_vegetacion.type, 'arbol_pocho');
  assert.equal(byId.sapo_laguna.type, 'sapo_pota');
  assert.deepEqual(
    [byId.garbanzo_ruinas.type, byId.arbol_ruinas.type],
    ['garbanzo_loco', 'arbol_pocho'],
  );
  assert.deepEqual(
    [byId.sapo_penumbra.type, byId.garbanzo_penumbra.type],
    ['sapo_pota', 'garbanzo_loco'],
  );
  assert.deepEqual(
    [byId.sapo_final.type, byId.garbanzo_final.type, byId.arbol_final.type],
    ['sapo_pota', 'garbanzo_loco', 'arbol_pocho'],
  );

  const sapos = jungla.enemies
    .filter(({ type }) => type === 'sapo_pota')
    .sort((first, second) => first.x - second.x);
  assert.deepEqual(sapos.map(({ volleyCount }) => volleyCount), [1, 2, 3]);
  assert.ok(sapos.every(({ waterlineY }) => Number.isFinite(waterlineY)));
  assert.ok(
    sapos.every(({ x }) => !spanAt(getGroundSpans(jungla.platforms), x)),
    'every Sapo stays in water',
  );
});

test('La Oscuridad is a light-vulnerable boss with a one-time reward', () => {
  const boss = gameData.bossData.la_oscuridad;
  assert.equal(boss.name, 'LA OSCURIDAD');
  assert.deepEqual(boss.patterns, ['SHADOW_GLIDE', 'SHADOW_RAIN', 'DARK_WAVE']);
  assert.ok(boss.exposedMs >= 2000 && boss.lanternLitMs > boss.exposedMs);
  assert.ok(boss.rewardCoins > gameData.bossData.babito_corrupto.rewardCoins);
});

test('Ciudad keeps its complete authored Phase 3 composition and safe route', () => {
  assert.equal(city.worldWidth, 7200);
  assert.deepEqual(city.zones.map(({ id }) => id), ['entrada', 'fabricas', 'fortaleza']);
  assert.deepEqual(city.checkpoints.map(({ id }) => id), [
    'start',
    'factory_gate',
    'assembly_line',
    'fortress_gate',
  ]);
  assert.equal(city.enemies.length, 11);
  assert.equal(city.coins.length, 36);
  assert.equal(city.movingPlatforms.length, 3);
  assert.equal(city.hazards.length, 5);
  assert.equal(city.tutorialSigns.length, 7);
  assert.deepEqual(city.bossPortal, { x: 7040, y: 480 });
  assert.deepEqual(new Set(city.enemies.map(({ type }) => type)), new Set([
    'drone_bot',
    'robot_elice',
    'ive_robot',
  ]));
  assert.equal(city.enemies.at(-1).doubleScythe, true);

  const spans = getGroundSpans(city.platforms);
  assert.equal(spans[0].left, 0);
  assert.equal(spans.at(-1).right, city.worldWidth);
  for (let index = 1; index < spans.length; index += 1) {
    assert.ok(spans[index].left - spans[index - 1].right <= 160, 'every City gap must be jumpable');
  }
  for (const checkpoint of city.checkpoints) assert.ok(spanAt(spans, checkpoint.x), checkpoint.id);
  for (const enemy of city.enemies.filter(({ type }) => type !== 'drone_bot')) {
    assert.ok(spanAt(spans, enemy.x), `${enemy.id} must be grounded`);
  }
  assert.ok(spanAt(spans, city.bossPortal.x), 'City portal');
});

test('Ciudad unlocks after Phase 2 and starts at its first checkpoint', () => {
  const store = new SaveStore({ storage: createMemoryStorage() });
  assert.equal(isCityUnlocked(store.getState().progress), false);
  store.setProgress({ boss2Defeated: true, phase2Complete: true, scene: 'map' });
  assert.equal(isCityUnlocked(store.getState().progress), true);
  const progress = startPhaseThree(store);
  assert.equal(progress.scene, 'city');
  assert.equal(progress.checkpoint, 'start');
  assert.equal(progress.phase2Complete, true);
  assert.equal(progress.phase3Complete, false);
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
