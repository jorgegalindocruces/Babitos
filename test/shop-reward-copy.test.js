import assert from 'node:assert/strict';
import test from 'node:test';

import gameData from '../src/data/game-data.json' with { type: 'json' };
import { getShopBossRewardCopy } from '../src/ui/shopRewardCopy.js';

test('shop reward copy names both one-time rewards with their configured amounts', () => {
  assert.equal(gameData.bossData.babito_corrupto.rewardCoins, 30);
  assert.equal(gameData.bossData.la_oscuridad.rewardCoins, 40);
  assert.equal(
    getShopBossRewardCopy({}, gameData.bossData),
    [
      'BABITO CORRUPTO +30 · PENDIENTE',
      'LA OSCURIDAD +40 · PENDIENTE',
    ].join('\n'),
  );
});

test('shop reward copy follows claimed rewards after either boss and from the world map', () => {
  assert.equal(
    getShopBossRewardCopy(
      { scene: 'shop', claimedRewards: ['boss1_reward'] },
      gameData.bossData,
    ),
    [
      'BABITO CORRUPTO +30 · COBRADA',
      'LA OSCURIDAD +40 · PENDIENTE',
    ].join('\n'),
  );

  const mapCopy = getShopBossRewardCopy(
    { scene: 'map', claimedRewards: ['boss1_reward', 'boss2_reward'] },
    gameData.bossData,
  );
  assert.equal(
    mapCopy,
    [
      'BABITO CORRUPTO +30 · COBRADA',
      'LA OSCURIDAD +40 · COBRADA',
    ].join('\n'),
  );
  assert.doesNotMatch(mapCopy, /DERROTA AL BOSS|cada vez|repetible/iu);
});

test('shop reward copy reads reward tuning instead of baking one shared amount', () => {
  const tunedBosses = {
    babito_corrupto: { rewardCoins: 31 },
    la_oscuridad: { rewardCoins: 47 },
  };

  assert.match(getShopBossRewardCopy({}, tunedBosses), /BABITO CORRUPTO \+31/u);
  assert.match(getShopBossRewardCopy({}, tunedBosses), /LA OSCURIDAD \+47/u);
});
