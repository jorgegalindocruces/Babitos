import {
  BODY_SIZES,
  CREATOR_CATEGORIES,
  getCosmetic,
  getDefaultAppearance,
  getDefaultUnlocks,
  normalizePurchases,
  normalizeUnlocks,
  randomUnlockedAppearance,
  sanitizeAppearance,
} from './catalog.js';

export const SAVE_KEY = 'babitos.save.v1';
export const SAVE_VERSION = 1;
export const POWER_IDS = Object.freeze(['fire', 'lightning', 'rock']);

const LEGACY_SAVE_KEYS = Object.freeze(['babitos.save', 'babitos.save.v0']);
const DEFAULT_PROGRESS = Object.freeze({
  scene: 'title',
  checkpoint: 'start',
  boss1Defeated: false,
  phase1Complete: false,
  boss2Defeated: false,
  phase2Complete: false,
  claimedRewards: Object.freeze([]),
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toSafeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(number)));
}

function sanitizeText(value, fallback, maxLength = 64) {
  if (typeof value !== 'string') return fallback;
  const clean = value.trim().slice(0, maxLength);
  return clean || fallback;
}

function sanitizeJsonValue(value, depth = 0) {
  if (depth > 8 || value === undefined || typeof value === 'function') return undefined;
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  if (Array.isArray(value)) {
    return value
      .slice(0, 200)
      .map((entry) => sanitizeJsonValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  if (!isRecord(value)) return undefined;

  const result = {};
  for (const [key, entry] of Object.entries(value).slice(0, 200)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    const sanitized = sanitizeJsonValue(entry, depth + 1);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

function sanitizeProgress(value) {
  const safe = sanitizeJsonValue(value);
  const progress = isRecord(safe) ? safe : {};
  const rewards = Array.isArray(progress.claimedRewards) ? progress.claimedRewards : [];

  return {
    ...progress,
    scene: sanitizeText(progress.scene, DEFAULT_PROGRESS.scene),
    checkpoint: sanitizeText(progress.checkpoint, DEFAULT_PROGRESS.checkpoint),
    boss1Defeated: progress.boss1Defeated === true,
    phase1Complete: progress.phase1Complete === true,
    boss2Defeated: progress.boss2Defeated === true,
    phase2Complete: progress.phase2Complete === true,
    claimedRewards: [...new Set(
      rewards
        .filter((reward) => typeof reward === 'string')
        .map((reward) => reward.trim().slice(0, 96))
        .filter(Boolean),
    )],
  };
}

function normalizePowerList(value) {
  const values = value instanceof Set
    ? [...value]
    : Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? [value]
        : isRecord(value)
          ? Object.entries(value).filter(([, enabled]) => enabled).map(([id]) => id)
          : [];

  const selected = new Set(values.filter((id) => POWER_IDS.includes(id)));
  return POWER_IDS.filter((id) => selected.has(id));
}

function mergeCosmeticMaps(...maps) {
  const merged = Object.fromEntries(CREATOR_CATEGORIES.map((category) => [category, []]));

  for (const map of maps) {
    if (!isRecord(map)) continue;
    for (const category of CREATOR_CATEGORIES) {
      const ids = Array.isArray(map[category]) ? map[category] : [];
      for (const id of ids) {
        if (!merged[category].includes(id)) merged[category].push(id);
      }
    }
  }

  return normalizeUnlocks(merged);
}

function unlockEquippedItems(unlocks, appearance) {
  const result = clone(unlocks);

  for (const category of CREATOR_CATEGORIES) {
    const id = appearance?.[category];
    if (getCosmetic(category, id) && !result[category].includes(id)) {
      result[category].push(id);
    }
  }

  return normalizeUnlocks(result);
}

function migrateSave(raw) {
  const source = isRecord(raw) ? raw : {};
  const babito = isRecord(source.babito) ? source.babito : {};

  return {
    version: SAVE_VERSION,
    name: source.name ?? source.babitoName ?? babito.name,
    size: source.size ?? source.bodySize ?? babito.size,
    appearance:
      source.appearance
      ?? source.layers
      ?? source.equipment
      ?? source.equippedCosmetics
      ?? babito.appearance
      ?? babito.layers,
    selectedPower: source.selectedPower ?? source.power ?? babito.power,
    unlockedPowers: source.unlockedPowers ?? source.powers ?? source.powerUnlocks,
    coins: source.coins ?? source.currency,
    unlockedCosmetics:
      source.unlockedCosmetics
      ?? source.unlocks
      ?? source.cosmeticsUnlocked,
    purchasedCosmetics:
      source.purchasedCosmetics
      ?? source.purchases
      ?? source.cosmeticsPurchased,
    progress: source.progress ?? source.gameProgress,
  };
}

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    name: 'Babito',
    size: 'normal',
    appearance: getDefaultAppearance(),
    selectedPower: null,
    unlockedPowers: [],
    coins: 0,
    unlockedCosmetics: getDefaultUnlocks(),
    purchasedCosmetics: Object.fromEntries(
      CREATOR_CATEGORIES.map((category) => [category, []]),
    ),
    progress: clone(DEFAULT_PROGRESS),
  };
}

export function sanitizeSave(raw) {
  const migrated = migrateSave(raw);
  const defaults = createDefaultSave();
  const purchases = normalizePurchases(migrated.purchasedCosmetics);
  let unlocks = mergeCosmeticMaps(
    normalizeUnlocks(migrated.unlockedCosmetics),
    purchases,
  );

  unlocks = unlockEquippedItems(unlocks, migrated.appearance);

  const selectedPower = POWER_IDS.includes(migrated.selectedPower)
    ? migrated.selectedPower
    : null;
  const unlockedPowers = normalizePowerList(migrated.unlockedPowers);
  if (selectedPower && !unlockedPowers.includes(selectedPower)) {
    unlockedPowers.push(selectedPower);
    unlockedPowers.sort((a, b) => POWER_IDS.indexOf(a) - POWER_IDS.indexOf(b));
  }

  return {
    version: SAVE_VERSION,
    name: sanitizeText(migrated.name, defaults.name, 24),
    size: BODY_SIZES.includes(migrated.size) ? migrated.size : defaults.size,
    appearance: sanitizeAppearance(migrated.appearance, unlocks),
    selectedPower,
    unlockedPowers,
    coins: toSafeInteger(migrated.coins, defaults.coins),
    unlockedCosmetics: unlocks,
    purchasedCosmetics: purchases,
    progress: sanitizeProgress(migrated.progress),
  };
}

export function createMemoryStorage(initial = {}) {
  const data = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)]),
  );

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.has(String(key)) ? data.get(String(key)) : null;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key) {
      data.delete(String(key));
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
  };
}

function isStorageLike(value) {
  return value
    && typeof value.getItem === 'function'
    && typeof value.setItem === 'function';
}

function browserStorage() {
  try {
    return isStorageLike(globalThis.localStorage) ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

export class SaveStore {
  constructor(options = {}) {
    const config = isStorageLike(options) ? { storage: options } : options;
    this.key = typeof config.key === 'string' && config.key ? config.key : SAVE_KEY;
    this.storage = isStorageLike(config.storage)
      ? config.storage
      : (browserStorage() ?? createMemoryStorage());
    this.random = typeof config.random === 'function' ? config.random : Math.random;
    this._state = createDefaultSave();
    this.load();
  }

  _read(key) {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }

  _write() {
    try {
      this.storage.setItem(this.key, JSON.stringify(this._state));
      return true;
    } catch {
      return false;
    }
  }

  load() {
    let raw = this._read(this.key);

    if (raw === null && this.key === SAVE_KEY) {
      for (const legacyKey of LEGACY_SAVE_KEYS) {
        raw = this._read(legacyKey);
        if (raw !== null) break;
      }
    }

    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }

    this._state = sanitizeSave(raw);
    this._write();
    return this.getState();
  }

  save(nextState = this._state) {
    this._state = sanitizeSave(nextState);
    this._write();
    return this.getState();
  }

  getState() {
    return clone(this._state);
  }

  get state() {
    return this.getState();
  }

  update(updater) {
    const draft = this.getState();
    const result = typeof updater === 'function'
      ? updater(draft)
      : { ...draft, ...(isRecord(updater) ? updater : {}) };
    return this.save(result === undefined ? draft : result);
  }

  reset() {
    this._state = createDefaultSave();
    this._write();
    return this.getState();
  }

  /**
   * Starts the story again without erasing the player's collected cosmetics.
   * Claimed reward IDs are deliberately retained so replaying the first boss
   * cannot mint the same one-off coin reward indefinitely.
   */
  restartAdventure() {
    const next = this.getState();
    next.selectedPower = null;
    next.unlockedPowers = [];
    next.progress = {
      ...clone(DEFAULT_PROGRESS),
      scene: 'creator',
      claimedRewards: [...next.progress.claimedRewards],
    };
    return this.save(next);
  }

  setName(name) {
    const next = this.getState();
    next.name = name;
    return this.save(next);
  }

  setSize(size) {
    if (!BODY_SIZES.includes(size)) return this.getState();
    const next = this.getState();
    next.size = size;
    return this.save(next);
  }

  setSelectedPower(powerId) {
    if (!POWER_IDS.includes(powerId)) return this.getState();
    const next = this.getState();
    next.selectedPower = powerId;
    if (!next.unlockedPowers.includes(powerId)) next.unlockedPowers.push(powerId);
    return this.save(next);
  }

  selectPower(powerId) {
    return this.setSelectedPower(powerId);
  }

  unlockPower(powerId) {
    if (!POWER_IDS.includes(powerId)) return false;
    if (this._state.unlockedPowers.includes(powerId)) return true;
    const next = this.getState();
    next.unlockedPowers.push(powerId);
    this.save(next);
    return true;
  }

  isPowerUnlocked(powerId) {
    return this._state.unlockedPowers.includes(powerId);
  }

  setCoins(value) {
    const next = this.getState();
    next.coins = toSafeInteger(value);
    this.save(next);
    return this._state.coins;
  }

  addCoins(amount) {
    const addition = toSafeInteger(amount);
    if (addition <= 0) return this._state.coins;
    return this.setCoins(Math.min(Number.MAX_SAFE_INTEGER, this._state.coins + addition));
  }

  spendCoins(amount) {
    const cost = toSafeInteger(amount);
    if (cost <= 0) return true;
    if (this._state.coins < cost) return false;
    this.setCoins(this._state.coins - cost);
    return true;
  }

  isUnlocked(category, id) {
    return this._state.unlockedCosmetics[category]?.includes(id) ?? false;
  }

  purchaseCosmetic(category, id) {
    const item = getCosmetic(category, id);
    if (!item) {
      return { ok: false, purchased: false, reason: 'unknown-item', coins: this._state.coins };
    }
    if (this.isUnlocked(category, id)) {
      return { ok: true, purchased: false, reason: 'already-unlocked', coins: this._state.coins };
    }
    if (this._state.coins < item.price) {
      return { ok: false, purchased: false, reason: 'insufficient-coins', coins: this._state.coins };
    }

    const next = this.getState();
    next.coins -= item.price;
    next.unlockedCosmetics[category].push(id);
    if (!next.purchasedCosmetics[category].includes(id)) {
      next.purchasedCosmetics[category].push(id);
    }
    this.save(next);

    return { ok: true, purchased: true, reason: null, coins: this._state.coins };
  }

  purchase(category, id) {
    return this.purchaseCosmetic(category, id);
  }

  equipCosmetic(category, id) {
    const item = getCosmetic(category, id);
    if (!item) return { ok: false, reason: 'unknown-item' };
    if (!this.isUnlocked(category, id)) return { ok: false, reason: 'locked' };

    const next = this.getState();
    next.appearance[category] = id;
    this.save(next);
    return { ok: true, reason: null, appearance: clone(this._state.appearance) };
  }

  equip(category, id) {
    return this.equipCosmetic(category, id);
  }

  randomizeAppearance(random = this.random) {
    const next = this.getState();
    next.appearance = randomUnlockedAppearance(next.unlockedCosmetics, random);
    this.save(next);
    return clone(this._state.appearance);
  }

  randomize(random = this.random) {
    return this.randomizeAppearance(random);
  }

  setProgress(patch, value) {
    const partial = typeof patch === 'string' ? { [patch]: value } : patch;
    if (!isRecord(partial)) return clone(this._state.progress);

    const next = this.getState();
    next.progress = {
      ...next.progress,
      ...partial,
    };
    this.save(next);
    return clone(this._state.progress);
  }

  claimReward(id, coins = 0) {
    const rewardId = sanitizeText(id, '', 96);
    if (!rewardId) {
      return { ok: false, claimed: false, reason: 'invalid-id', coins: this._state.coins };
    }
    if (this._state.progress.claimedRewards.includes(rewardId)) {
      return { ok: true, claimed: false, reason: 'already-claimed', coins: this._state.coins };
    }

    const next = this.getState();
    next.progress.claimedRewards.push(rewardId);
    next.coins = Math.min(Number.MAX_SAFE_INTEGER, next.coins + toSafeInteger(coins));
    this.save(next);

    return { ok: true, claimed: true, reason: null, coins: this._state.coins };
  }
}

export const saveStore = new SaveStore();
export const loadSave = () => saveStore.load();
export const getSave = () => saveStore.getState();
export const resetSave = () => saveStore.reset();

export default saveStore;
