import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEnemyMeleeAttack,
  getArcadeBodyBounds,
  getEnemyMeleeBounds,
  isEnemyMeleeAttackActive,
  rectanglesOverlap,
  resolveToxicProjectileLane,
} from '../src/game/EnemyAttackSystem.js';

function makeEnemy() {
  return {
    dead: false,
    state: 'SPEAR_ATTACK',
    config: { damage: 1 },
    sprite: {
      active: true,
      x: 100,
      y: 200,
      body: {
        enable: true,
        width: 40,
        center: { x: 100, y: 200 },
      },
    },
  };
}

test('enemy melee windows preserve their configured reach, timing and damage', () => {
  const enemy = makeEnemy();
  const attack = createEnemyMeleeAttack(enemy, {
    kind: 'spear', direction: 1, reach: 100, height: 30, durationMs: 220, damage: 2,
  }, 1000);

  assert.equal(attack.kind, 'spear');
  assert.equal(attack.expiresAt, 1220);
  assert.equal(attack.damage, 2);
  assert.deepEqual(getEnemyMeleeBounds(attack), {
    x: 116,
    y: 181,
    width: 100,
    height: 30,
  });
});

test('left-facing attacks mirror their reach and only hit overlapping bodies', () => {
  const attack = createEnemyMeleeAttack(makeEnemy(), {
    direction: -1, reach: 80, height: 36, offsetY: 4,
  }, 0);
  const strike = getEnemyMeleeBounds(attack);
  assert.deepEqual(strike, { x: 4, y: 186, width: 80, height: 36 });

  const player = getArcadeBodyBounds({ enable: true, x: 55, y: 190, width: 28, height: 40 });
  assert.equal(rectanglesOverlap(strike, player), true);
  assert.equal(rectanglesOverlap(strike, { x: 90, y: 190, width: 28, height: 40 }), false);
  assert.equal(getArcadeBodyBounds({ enable: false }), null);
});

test('melee windows stop as soon as their authored attack state is interrupted', () => {
  const enemy = makeEnemy();
  const spear = createEnemyMeleeAttack(enemy, { kind: 'spear' });
  assert.equal(isEnemyMeleeAttackActive(spear), true);
  enemy.state = 'HURT';
  assert.equal(isEnemyMeleeAttackActive(spear), false);

  enemy.state = 'PUNCH_LEFT';
  const branch = createEnemyMeleeAttack(enemy, { kind: 'branch' });
  assert.equal(isEnemyMeleeAttackActive(branch), true);
  enemy.state = 'RECOVER';
  assert.equal(isEnemyMeleeAttackActive(branch), false);
});

test('toxic vomit leaves the mouth before settling into a bounded horizontal lane', () => {
  assert.deepEqual(resolveToxicProjectileLane(451, 408), {
    startY: 451,
    laneY: 408,
    riseMs: 120,
    velocityY: -43 / 0.12,
  });
  assert.deepEqual(resolveToxicProjectileLane(451, 202), {
    startY: 451,
    laneY: 403,
    riseMs: 120,
    velocityY: -400,
  });
  assert.deepEqual(resolveToxicProjectileLane(451, 451), {
    startY: 451,
    laneY: 451,
    riseMs: 0,
    velocityY: 0,
  });
});
