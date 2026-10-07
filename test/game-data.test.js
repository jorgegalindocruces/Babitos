import test from 'node:test';
import assert from 'node:assert/strict';
import gameData from '../src/data/game-data.json' with { type: 'json' };
import cosmetics from '../src/data/cosmetics.json' with { type: 'json' };
import babilandia from '../src/data/levels/babilandia.json' with { type: 'json' };

test('creator keeps eyes and mouth as independent complete categories', () => {
  assert.ok(gameData.creatorCategories.includes('eyes'));
  assert.ok(gameData.creatorCategories.includes('mouth'));
  assert.notEqual(gameData.creatorCategories.indexOf('eyes'), gameData.creatorCategories.indexOf('mouth'));
  assert.ok(cosmetics.eyes.length >= 4);
  assert.ok(cosmetics.mouth.length >= 4);
});

test('creator exposes the canonical body palette only through real renderable texture keys', () => {
  const bodyIds = cosmetics.body.map((item) => item.id);
  const canonicalPalette = [
    'body_cyan',
    'body_pink',
    'body_lime',
    'body_yellow',
    'body_purple',
    'body_cream',
    'body_orange',
    'body_red',
    'body_teal',
    'body_charcoal',
  ];

  for (const id of canonicalPalette) {
    assert.ok(bodyIds.includes(id), `missing canonical body palette option ${id}`);
  }
  for (const item of cosmetics.body) {
    assert.equal(item.assetKey, item.id);
  }
});

test('every creator control offers a real choice before reaching the shop', () => {
  for (const category of gameData.creatorCategories) {
    const freeChoices = cosmetics[category].filter((item) => item.unlocked);
    assert.ok(
      freeChoices.length >= 2,
      `${category} must expose at least two implemented choices in the creator`,
    );
    for (const item of freeChoices) {
      assert.equal(item.price, 0, `${category}:${item.id} is free but has a non-zero price`);
      assert.ok(item.assetKey, `${category}:${item.id} has no renderable asset key`);
    }
  }
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

test('Babilandia has an unbroken ground route across the playable world', () => {
  const ground = babilandia.platforms
    .filter((platform) => platform.kind === 'ground')
    .map((platform) => ({
      left: platform.x - platform.width / 2,
      right: platform.x + platform.width / 2,
    }))
    .sort((a, b) => a.left - b.left);

  assert.ok(ground.length > 0);
  let coveredUntil = 0;
  for (const segment of ground) {
    assert.ok(
      segment.left <= coveredUntil,
      `unexpected ground gap from ${coveredUntil} to ${segment.left}`,
    );
    coveredUntil = Math.max(coveredUntil, segment.right);
  }
  assert.ok(coveredUntil >= babilandia.worldWidth);
});

test('every Babilandia checkpoint has safe ground underneath', () => {
  const ground = babilandia.platforms.filter((platform) => platform.kind === 'ground');
  for (const checkpoint of babilandia.checkpoints) {
    const supportingGround = ground.find((platform) => (
      checkpoint.x >= platform.x - platform.width / 2 + 24
      && checkpoint.x <= platform.x + platform.width / 2 - 24
    ));
    assert.ok(supportingGround, `checkpoint ${checkpoint.id} is not over safe ground`);
    assert.equal(
      checkpoint.y,
      supportingGround.y - supportingGround.height / 2,
      `checkpoint ${checkpoint.id} does not sit on the ground surface`,
    );
  }
});

test('the Babilandia boss portal sits on safe ground', () => {
  const portal = babilandia.bossPortal;
  const supportingGround = babilandia.platforms
    .filter((platform) => platform.kind === 'ground')
    .find((platform) => (
      portal.x >= platform.x - platform.width / 2 + 32
      && portal.x <= platform.x + platform.width / 2 - 32
    ));

  assert.ok(supportingGround, 'boss portal is not over safe ground');
  assert.equal(portal.y, supportingGround.y - supportingGround.height / 2);
});
