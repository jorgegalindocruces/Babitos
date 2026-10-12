import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import gameData from '../src/data/game-data.json' with { type: 'json' };
import jungla from '../src/data/levels/jungla.json' with { type: 'json' };
import {
  getGroundSpans,
  getWalkSpans,
  JUNGLE_WATER_SURFACE_Y,
  LEVELS,
} from '../src/data/levels/index.js';
import { TUTORIAL_SIGN_STYLE } from '../src/game/surfaceAnchoring.js';

const enemyConfig = (enemy) => ({ ...gameData.enemies[enemy.type], ...enemy });
const spanAt = (spans, x) => spans.find((span) => x >= span.left && x <= span.right) ?? null;

test('walk spans cut ground at ruin pillars so Garbanzo stays on his stretch', () => {
  assert.deepEqual(
    getWalkSpans([
      { x: 200, width: 400, kind: 'ground' },
      { x: 150, width: 40, kind: 'ground', style: 'ruin' },
    ]),
    [{ left: 0, right: 130 }, { left: 170, right: 400 }],
  );
  // Babilandia has no pillars: its walkers keep their original bounds.
  assert.deepEqual(
    getWalkSpans(LEVELS.babilandia.data.platforms),
    getGroundSpans(LEVELS.babilandia.data.platforms),
  );
  const spans = getWalkSpans(jungla.platforms);
  for (const garbanzo of jungla.enemies.filter(({ type }) => type === 'garbanzo_loco')) {
    assert.ok(spanAt(spans, garbanzo.x), `${garbanzo.id} must start on a walkable stretch`);
  }
});

test('no checkpoint respawns the Babito inside an active encounter', () => {
  const walkSpans = getWalkSpans(jungla.platforms);
  for (const checkpoint of jungla.checkpoints) {
    for (const enemy of jungla.enemies) {
      const config = enemyConfig(enemy);
      const distance = Math.abs(enemy.x - checkpoint.x);
      if (enemy.type === 'garbanzo_loco') {
        // Garbanzo only engages a Babito he can reach from his own stretch.
        const span = spanAt(walkSpans, enemy.x);
        const reachable = checkpoint.x >= span.left - config.attackRange
          && checkpoint.x <= span.right + config.attackRange;
        const patrolReach = distance - 175;
        assert.ok(!reachable || patrolReach > config.detectRange,
          `${enemy.id} would chase the Babito at checkpoint ${checkpoint.id}`);
      } else {
        assert.ok(distance > config.detectRange + 10,
          `${enemy.id} wakes up ${distance}px from checkpoint ${checkpoint.id}`);
      }
    }
  }
});

test('every Sapo attacks whenever it is exposed, from real water', () => {
  const groundSpans = getGroundSpans(jungla.platforms);
  for (const sapo of jungla.enemies.filter(({ type }) => type === 'sapo_pota')) {
    const config = enemyConfig(sapo);
    assert.equal(sapo.waterlineY, JUNGLE_WATER_SURFACE_Y, `${sapo.id} must sit on the drawn river`);
    assert.ok(!spanAt(groundSpans, sapo.x), `${sapo.id} must be in a pit`);
    // A detect ring wider than the attack ring would expose a Sapo that
    // never fights back: a free kill.
    assert.ok(config.attackRange >= config.detectRange, `${sapo.id} has a passive ring`);
  }
});

test('only La Jungla lets shots cross its thin walkways', () => {
  assert.equal(LEVELS.jungla.walkwaysStopShots, false);
  assert.equal(LEVELS.babilandia.walkwaysStopShots, undefined);
});

test('La Jungla tutorial signs never overlap each other or a spring', () => {
  const signs = [...jungla.tutorialSigns].sort((first, second) => first.x - second.x);
  for (let index = 1; index < signs.length; index += 1) {
    const gap = signs[index].x - signs[index - 1].x;
    assert.ok(gap >= TUTORIAL_SIGN_STYLE.maxBoardWidth + 8,
      `${signs[index - 1].id} and ${signs[index].id} boards overlap (${gap}px apart)`);
  }
  for (const sign of signs) {
    for (const spring of jungla.springs) {
      assert.ok(Math.abs(sign.x - spring.x) >= TUTORIAL_SIGN_STYLE.maxBoardWidth / 2 + 24,
        `${sign.id} board covers ${spring.id}`);
    }
  }
});

test('gameplay scenes clear overlays left by a previous visit', async () => {
  const sources = Object.fromEntries(await Promise.all(
    ['GameScene', 'BossScene', 'DarknessBossScene'].map(async (name) => [
      name,
      await readFile(new URL(`../src/scenes/${name}.js`, import.meta.url), 'utf8'),
    ]),
  ));
  const createBody = (source) => source.slice(source.indexOf('  create() {'), source.indexOf('\n  }\n', source.indexOf('  create() {')));
  for (const [name, source] of Object.entries(sources)) {
    const body = createBody(source);
    for (const field of ['pauseOverlay', 'gameOverContainer']) {
      assert.match(body, new RegExp(`this\\.${field} = null;`), `${name}.create() must reset ${field}`);
    }
  }
  assert.match(createBody(sources.DarknessBossScene), /this\.victoryPanel = null;/);
  // The Arcade Group resets body settings on add: bodies are configured after.
  assert.match(
    sources.GameScene,
    /this\.enemySprites\.add\(controller\.sprite\);[\s\S]{0,120}controller\.configureBody\(\);/,
  );
  // TileSprite receives an Arcade Body through `physics.add.existing`, but it
  // does not gain Sprite's convenience methods. Reversing the platform must
  // therefore target the body or the whole scene update loop throws.
  assert.match(sources.GameScene, /platform\.body\.setVelocityX\(/);
  assert.match(sources.GameScene, /platform\.body\.setVelocityY\(/);
  assert.doesNotMatch(sources.GameScene, /platform\.setVelocity[XY]\(/);
});
