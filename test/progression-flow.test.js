import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  SAVE_KEY,
  SaveStore,
  createMemoryStorage,
} from '../src/state/SaveStore.js';
import {
  enterWorldMap,
  replayPhaseOne,
  resolveComingSoonRequest,
  startPhaseTwo,
} from '../src/state/progressionFlow.js';

function createCompletedPhaseOneStore() {
  const storage = createMemoryStorage();
  const store = new SaveStore({ storage });

  store.setSelectedPower('fire');
  store.setProgress({
    scene: 'shop',
    checkpoint: 'boss_gate',
    boss1Defeated: true,
    phase1Complete: true,
  });
  store.claimReward('boss1_reward', 30);

  return { storage, store };
}

test('completed Phase 1 remains replayable after moving from the shop through the map', () => {
  const { storage, store } = createCompletedPhaseOneStore();
  const completed = store.getState();

  const mapProgress = enterWorldMap(store);
  assert.equal(mapProgress.scene, 'map');
  assert.equal(mapProgress.checkpoint, 'boss_gate');
  assert.equal(mapProgress.boss1Defeated, true);
  assert.equal(mapProgress.phase1Complete, true);
  assert.deepEqual(mapProgress.claimedRewards, ['boss1_reward']);

  const fromMapReload = new SaveStore({ storage });
  assert.equal(fromMapReload.getState().progress.scene, 'map');

  const replayProgress = replayPhaseOne(fromMapReload);
  assert.equal(replayProgress.scene, 'babilandia');
  assert.equal(replayProgress.checkpoint, 'start');
  assert.equal(replayProgress.boss1Defeated, true);
  assert.equal(replayProgress.phase1Complete, true);
  assert.deepEqual(replayProgress.claimedRewards, ['boss1_reward']);

  const replayed = fromMapReload.getState();
  assert.equal(replayed.selectedPower, completed.selectedPower);
  assert.deepEqual(replayed.unlockedPowers, completed.unlockedPowers);
  assert.equal(replayed.coins, completed.coins);
  assert.deepEqual(replayed.appearance, completed.appearance);
  assert.deepEqual(replayed.unlockedCosmetics, completed.unlockedCosmetics);
  assert.deepEqual(replayed.purchasedCosmetics, completed.purchasedCosmetics);

  const finalReload = new SaveStore({ storage }).getState();
  assert.equal(finalReload.progress.scene, 'babilandia');
  assert.equal(finalReload.progress.checkpoint, 'start');
  assert.equal(finalReload.progress.boss1Defeated, true);
  assert.equal(finalReload.progress.phase1Complete, true);
  assert.deepEqual(finalReload.progress.claimedRewards, ['boss1_reward']);
  assert.equal(finalReload.selectedPower, 'fire');
  assert.deepEqual(finalReload.unlockedPowers, ['fire']);
  assert.equal(finalReload.coins, 30);
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), finalReload);
});

test('progression helpers require a store with setProgress()', () => {
  for (const helper of [enterWorldMap, replayPhaseOne]) {
    assert.throws(
      () => helper(null),
      { name: 'TypeError', message: 'A progress store with setProgress() is required.' },
    );
    assert.throws(
      () => helper({}),
      { name: 'TypeError', message: 'A progress store with setProgress() is required.' },
    );
  }
});

test('the retired Jungle preview redirects to playable Phase 2 and Coming Soon stays City-only', () => {
  assert.deepEqual(resolveComingSoonRequest('jungle'), {
    kind: 'redirect',
    scene: 'GameScene',
    data: { level: 'jungla' },
  });
  assert.deepEqual(resolveComingSoonRequest('JUNGLA'), {
    kind: 'redirect',
    scene: 'GameScene',
    data: { level: 'jungla' },
  });
  assert.deepEqual(resolveComingSoonRequest('city'), {
    kind: 'preview',
    world: 'city',
  });
  assert.deepEqual(resolveComingSoonRequest(undefined), {
    kind: 'preview',
    world: 'city',
  });
});

test('ComingSoonScene no longer advertises the playable Jungle as unreleased', async () => {
  const [sceneSource, bootSource] = await Promise.all([
    readFile(new URL('../src/scenes/ComingSoonScene.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/scenes/BootScene.js', import.meta.url), 'utf8'),
  ]);

  assert.match(sceneSource, /resolveComingSoonRequest\(data\.world\)/u);
  assert.match(sceneSource, /Las Fases 1 y 2 ya están disponibles/u);
  assert.doesNotMatch(sceneSource, /createJunglePreview|MUNDO 2|termina en la Fase 1/u);
  assert.match(bootSource, /requestedWorld === 'jungle'.*requestedWorld === 'jungla'.*'city'/su);
});

test('Phase 2 persists through Jungle, boss reward, shop, map and replay', () => {
  const storage = createMemoryStorage();
  const store = new SaveStore({ storage });
  store.setName('Luz');
  store.setSelectedPower('rock');
  store.setProgress({
    scene: 'map',
    checkpoint: 'boss_gate',
    boss1Defeated: true,
    phase1Complete: true,
  });

  const jungleStart = startPhaseTwo(store);
  assert.equal(jungleStart.scene, 'jungla');
  assert.equal(jungleStart.checkpoint, 'start');
  store.setProgress({ scene: 'jungla', checkpoint: 'ruinas' });

  const inJungle = new SaveStore({ storage });
  assert.equal(inJungle.getState().progress.scene, 'jungla');
  assert.equal(inJungle.getState().progress.checkpoint, 'ruinas');

  inJungle.setProgress({
    scene: 'shop',
    checkpoint: 'portal_oscuro',
    boss2Defeated: true,
    phase2Complete: true,
  });
  const firstReward = inJungle.claimReward('boss2_reward', 40);
  assert.equal(firstReward.ok, true);
  assert.equal(firstReward.claimed, true);
  assert.equal(firstReward.coins, 40);
  const repeatedReward = inJungle.claimReward('boss2_reward', 40);
  assert.equal(repeatedReward.ok, true);
  assert.equal(repeatedReward.claimed, false);
  assert.equal(repeatedReward.coins, 40);
  enterWorldMap(inJungle);

  const completed = new SaveStore({ storage });
  const completedSave = completed.getState();
  assert.equal(completedSave.name, 'Luz');
  assert.equal(completedSave.selectedPower, 'rock');
  assert.equal(completedSave.coins, 40);
  assert.equal(completedSave.progress.scene, 'map');
  assert.equal(completedSave.progress.boss2Defeated, true);
  assert.equal(completedSave.progress.phase2Complete, true);
  assert.deepEqual(completedSave.progress.claimedRewards, ['boss2_reward']);

  const replay = startPhaseTwo(completed);
  assert.equal(replay.scene, 'jungla');
  assert.equal(replay.checkpoint, 'start');
  assert.equal(replay.phase2Complete, true);
  assert.deepEqual(replay.claimedRewards, ['boss2_reward']);
  assert.equal(completed.getState().selectedPower, 'rock');
  assert.equal(completed.getState().coins, 40);
});
