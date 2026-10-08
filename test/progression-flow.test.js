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
