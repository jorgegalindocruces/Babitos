import test from 'node:test';
import assert from 'node:assert/strict';
import gameData from '../src/data/game-data.json' with { type: 'json' };
import cosmetics from '../src/data/cosmetics.json' with { type: 'json' };

test('creator keeps eyes and mouth as independent complete categories', () => {
  assert.ok(gameData.creatorCategories.includes('eyes'));
  assert.ok(gameData.creatorCategories.includes('mouth'));
  assert.notEqual(gameData.creatorCategories.indexOf('eyes'), gameData.creatorCategories.indexOf('mouth'));
  assert.ok(cosmetics.eyes.length >= 4);
  assert.ok(cosmetics.mouth.length >= 4);
});

test('small, normal and large change render scale but share one hitbox contract', () => {
  assert.deepEqual(Object.keys(gameData.bodySizes), ['small', 'normal', 'large']);
  const hitboxes = new Set(Object.values(gameData.bodySizes).map((size) => size.hitbox));
  const scales = new Set(Object.values(gameData.bodySizes).map((size) => size.renderScale));
  assert.deepEqual([...hitboxes], ['standard']);
  assert.equal(scales.size, 3);
});

test('the three initial powers preserve their canonical behavior', () => {
  const powers = Object.fromEntries(gameData.powers.map((power) => [power.id, power]));
  assert.deepEqual(Object.keys(powers), ['fire', 'lightning', 'rock']);
  assert.equal(powers.fire.kind, 'linear');
  assert.ok(powers.lightning.speed > powers.fire.speed);
  assert.ok(powers.lightning.lifetimeMs < powers.fire.lifetimeMs);
  assert.equal(powers.rock.kind, 'arc');
  assert.ok(powers.rock.gravityY > 0);
  assert.ok(powers.rock.damage > powers.fire.damage);
});

test('only the three canonical normal-enemy definitions exist', () => {
  assert.deepEqual(Object.keys(gameData.enemies), ['come', 'vuela', 'da_vueltas']);
  assert.deepEqual(gameData.enemies.come.states, ['PATROL', 'CHASE', 'WINDUP', 'BITE', 'RECOVER']);
  assert.deepEqual(gameData.enemies.vuela.states, ['AIR_PATROL', 'TARGET', 'WINDUP', 'DIVE', 'RETURN']);
  assert.deepEqual(gameData.enemies.da_vueltas.states, ['PATROL', 'WINDUP', 'SPIN', 'DIZZY']);
  for (const enemy of Object.values(gameData.enemies)) {
    assert.deepEqual(enemy.coinDrop, [0, 1, 2]);
  }
  assert.deepEqual(gameData.enemies.vuela.groupSize, [1, 2]);
});

test('Babito Corrupto has the required patterns and guaranteed shop reward', () => {
  const boss = gameData.bossData.babito_corrupto;
  assert.equal(boss.name, 'BABITO CORRUPTO');
  assert.deepEqual(boss.patterns, ['FIREBALL', 'FROM_ABOVE', 'FURY_CHARGE']);
  assert.ok(boss.vulnerableMs >= 1000);
  assert.ok(boss.rewardCoins >= 15);
});
