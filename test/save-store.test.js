import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SAVE_KEY,
  SAVE_VERSION,
  SaveStore,
  createMemoryStorage,
} from '../src/state/SaveStore.js';
import {
  CREATOR_CATEGORIES,
  getCategoryItems,
  getCosmetic,
} from '../src/state/catalog.js';

test('creates and persists a complete default save without a DOM', () => {
  const storage = createMemoryStorage();
  const store = new SaveStore({ storage });
  const state = store.getState();

  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.name, 'Babito');
  assert.equal(state.size, 'normal');
  assert.equal(state.coins, 0);
  assert.equal(state.selectedPower, null);
  assert.deepEqual(state.progress, {
    scene: 'title',
    checkpoint: 'start',
    boss1Defeated: false,
    phase1Complete: false,
    boss2Defeated: false,
    phase2Complete: false,
    claimedRewards: [],
  });

  for (const category of CREATOR_CATEGORIES) {
    assert.ok(Object.hasOwn(state.appearance, category));
    assert.ok(state.unlockedCosmetics[category].includes(state.appearance[category]));
    assert.equal(getCosmetic(category, state.appearance[category])?.unlocked, true);
  }

  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), state);
});

test('returns defensive snapshots instead of mutable internal state', () => {
  const store = new SaveStore({ storage: createMemoryStorage() });
  const snapshot = store.getState();
  snapshot.coins = 999;
  snapshot.appearance.eyes = 'eyes_crazy';

  assert.equal(store.getState().coins, 0);
  assert.equal(store.getState().appearance.eyes, 'eyes_normal');
});

test('migrates a legacy save and sanitizes invalid values', () => {
  const storage = createMemoryStorage({
    'babitos.save': JSON.stringify({
      version: 0,
      babitoName: '  Babita Valiente  ',
      bodySize: 'gigantic',
      layers: {
        body: 'body_midnight',
        eyes: 'not_an_eye',
        mouth: 'mouth_epic',
        arms: 'arms_round',
        headAccessory: 'none',
        glasses: 'none',
        neckAccessory: 'none',
      },
      power: 'lightning',
      powers: { fire: true, impossible: true },
      currency: '18.9',
      unlocks: ['eyes:eyes_cute', 'garbage', 'glasses:none'],
      purchases: {
        arms: ['arms_hero', 'missing_arms'],
      },
      gameProgress: {
        scene: 'boss',
        checkpoint: '',
        boss1Defeated: 1,
        phase1Complete: true,
        claimedRewards: ['boss-1', 'boss-1', 4],
        customFlag: 'kept',
      },
    }),
  });

  const store = new SaveStore({ storage });
  const state = store.getState();

  assert.equal(state.name, 'Babita Valiente');
  assert.equal(state.size, 'normal');
  assert.equal(state.coins, 18);
  assert.equal(state.selectedPower, 'lightning');
  assert.deepEqual(state.unlockedPowers, ['fire', 'lightning']);
  assert.equal(state.appearance.body, 'body_midnight');
  assert.equal(state.appearance.eyes, 'eyes_normal');
  assert.ok(state.unlockedCosmetics.body.includes('body_midnight'));
  assert.ok(state.unlockedCosmetics.eyes.includes('eyes_cute'));
  assert.ok(state.unlockedCosmetics.arms.includes('arms_hero'));
  assert.deepEqual(state.purchasedCosmetics.arms, ['arms_hero']);
  assert.equal(state.progress.scene, 'boss');
  assert.equal(state.progress.checkpoint, 'start');
  assert.equal(state.progress.boss1Defeated, false);
  assert.equal(state.progress.phase1Complete, true);
  assert.equal(state.progress.customFlag, 'kept');
  assert.deepEqual(state.progress.claimedRewards, ['boss-1']);
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), state);
});

test('recovers from corrupt JSON and rejects malformed catalog data in a save', () => {
  const storage = createMemoryStorage({ [SAVE_KEY]: '{broken json' });
  const store = new SaveStore({ storage });

  assert.equal(store.getState().coins, 0);

  store.save({
    name: 42,
    size: 'tiny',
    coins: -100,
    selectedPower: 'water',
    unlockedCosmetics: {
      eyes: ['fake', 'eyes_normal'],
    },
    appearance: {
      eyes: 'fake',
    },
    progress: null,
  });

  const state = store.getState();
  assert.equal(state.name, 'Babito');
  assert.equal(state.size, 'normal');
  assert.equal(state.coins, 0);
  assert.equal(state.selectedPower, null);
  assert.equal(state.appearance.eyes, 'eyes_normal');
  assert.equal(state.unlockedCosmetics.eyes.includes('fake'), false);
});

test('buys once, equips only unlocked cosmetics, and persists after reload', () => {
  const storage = createMemoryStorage();
  const store = new SaveStore({ storage });

  assert.deepEqual(store.equipCosmetic('eyes', 'eyes_cute'), {
    ok: false,
    reason: 'locked',
  });
  assert.equal(store.purchaseCosmetic('eyes', 'eyes_cute').reason, 'insufficient-coins');

  store.addCoins(30);
  const purchase = store.purchaseCosmetic('eyes', 'eyes_cute');
  assert.equal(purchase.ok, true);
  assert.equal(purchase.purchased, true);
  assert.equal(purchase.coins, 10);
  assert.equal(store.equipCosmetic('eyes', 'eyes_cute').ok, true);

  const repeated = store.purchaseCosmetic('eyes', 'eyes_cute');
  assert.equal(repeated.ok, true);
  assert.equal(repeated.purchased, false);
  assert.equal(repeated.reason, 'already-unlocked');
  assert.equal(store.getState().coins, 10);

  const reloaded = new SaveStore({ storage });
  assert.equal(reloaded.getState().coins, 10);
  assert.equal(reloaded.getState().appearance.eyes, 'eyes_cute');
  assert.ok(reloaded.getState().unlockedCosmetics.eyes.includes('eyes_cute'));
  assert.ok(reloaded.getState().purchasedCosmetics.eyes.includes('eyes_cute'));
});

test('scopes repeated cosmetic IDs by category', () => {
  const store = new SaveStore({ storage: createMemoryStorage() });

  assert.equal(store.equipCosmetic('headAccessory', 'none').ok, true);
  assert.equal(store.equipCosmetic('glasses', 'none').ok, true);
  assert.equal(store.equipCosmetic('neckAccessory', 'none').ok, true);
  assert.equal(store.getState().appearance.headAccessory, 'none');
  assert.equal(store.getState().appearance.glasses, 'none');
  assert.equal(store.getState().appearance.neckAccessory, 'none');
});

test('BABITO LOCO only chooses valid unlocked items', () => {
  const store = new SaveStore({ storage: createMemoryStorage(), random: () => 0.999 });
  store.addCoins(100);
  assert.equal(store.purchaseCosmetic('body', 'body_lime').ok, true);
  assert.equal(store.purchaseCosmetic('arms', 'arms_hero').ok, true);

  const appearance = store.randomizeAppearance();
  const state = store.getState();

  for (const category of CREATOR_CATEGORIES) {
    assert.ok(state.unlockedCosmetics[category].includes(appearance[category]));
    assert.ok(getCategoryItems(category).some((item) => item.id === appearance[category]));
  }

  assert.equal(appearance.body, 'body_lime');
  assert.equal(appearance.arms, 'arms_hero');
  assert.notEqual(appearance.eyes, 'eyes_crazy');
});

test('updates identity, power, coins and partial progress safely', () => {
  const store = new SaveStore({ storage: createMemoryStorage() });

  store.setName('  Luna  ');
  store.setSize('large');
  store.setSelectedPower('rock');
  store.addCoins(12.8);
  assert.equal(store.spendCoins(5), true);
  assert.equal(store.spendCoins(100), false);
  store.setProgress({ scene: 'babilandia', checkpoint: 'plaza-1' });
  store.setProgress('boss1Defeated', true);

  const state = store.getState();
  assert.equal(state.name, 'Luna');
  assert.equal(state.size, 'large');
  assert.equal(state.selectedPower, 'rock');
  assert.deepEqual(state.unlockedPowers, ['rock']);
  assert.equal(state.coins, 7);
  assert.equal(state.progress.scene, 'babilandia');
  assert.equal(state.progress.checkpoint, 'plaza-1');
  assert.equal(state.progress.boss1Defeated, true);
  assert.equal(state.progress.phase1Complete, false);
});

test('restarts story progress without erasing the Babito collection or repeat-proof rewards', () => {
  const store = new SaveStore({ storage: createMemoryStorage() });
  store.setName('Luna');
  store.setSize('large');
  store.addCoins(80);
  assert.equal(store.purchaseCosmetic('eyes', 'eyes_cute').ok, true);
  assert.equal(store.equipCosmetic('eyes', 'eyes_cute').ok, true);
  store.setSelectedPower('rock');
  store.setProgress({
    scene: 'shop',
    checkpoint: 'plaza-2',
    boss1Defeated: true,
    phase1Complete: true,
  });
  store.claimReward('boss-1-cleansed', 30);

  const restarted = store.restartAdventure();

  assert.equal(restarted.name, 'Luna');
  assert.equal(restarted.size, 'large');
  assert.equal(restarted.appearance.eyes, 'eyes_cute');
  assert.ok(restarted.unlockedCosmetics.eyes.includes('eyes_cute'));
  assert.equal(restarted.coins, 90);
  assert.equal(restarted.selectedPower, null);
  assert.deepEqual(restarted.unlockedPowers, []);
  assert.deepEqual(restarted.progress, {
    scene: 'creator',
    checkpoint: 'start',
    boss1Defeated: false,
    phase1Complete: false,
    boss2Defeated: false,
    phase2Complete: false,
    claimedRewards: ['boss-1-cleansed'],
  });
});

test('claims coin rewards atomically and only once', () => {
  const storage = createMemoryStorage();
  const store = new SaveStore({ storage });

  const first = store.claimReward('boss-1-cleansed', 25);
  const second = store.claimReward('boss-1-cleansed', 25);

  assert.deepEqual(first, { ok: true, claimed: true, reason: null, coins: 25 });
  assert.deepEqual(second, {
    ok: true,
    claimed: false,
    reason: 'already-claimed',
    coins: 25,
  });
  assert.deepEqual(store.getState().progress.claimedRewards, ['boss-1-cleansed']);
  assert.equal(new SaveStore({ storage }).getState().coins, 25);
});
