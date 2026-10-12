const WORLD_MAP_PROGRESS = Object.freeze({
  scene: 'map',
});

const PHASE_ONE_REPLAY_PROGRESS = Object.freeze({
  scene: 'babilandia',
  checkpoint: 'start',
});

function requireProgressStore(store) {
  if (!store || typeof store.setProgress !== 'function') {
    throw new TypeError('A progress store with setProgress() is required.');
  }

  return store;
}

/** Persist the stable world-map destination before changing scenes. */
export function enterWorldMap(store) {
  return requireProgressStore(store).setProgress(WORLD_MAP_PROGRESS);
}

const PHASE_TWO_START_PROGRESS = Object.freeze({
  scene: 'jungla',
  checkpoint: 'start',
});

const PHASE_THREE_START_PROGRESS = Object.freeze({
  scene: 'city',
  checkpoint: 'start',
});

const BOSS_TOTAL_PREVIEW_ROUTE = Object.freeze({
  kind: 'preview',
  world: 'boss-total',
});

const LEGACY_JUNGLE_ROUTE = Object.freeze({
  kind: 'redirect',
  scene: 'GameScene',
  data: Object.freeze({ level: 'jungla' }),
});

const CITY_ROUTE = Object.freeze({
  kind: 'redirect',
  scene: 'GameScene',
  data: Object.freeze({ level: 'city' }),
});

/** La Jungla opens once Phase 1 (Babilandia and Babito Corrupto) is done. */
export function isJungleUnlocked(progress) {
  return progress?.phase1Complete === true;
}

/** Start (or replay) La Jungla at its first checkpoint. */
export function startPhaseTwo(store) {
  return requireProgressStore(store).setProgress(PHASE_TWO_START_PROGRESS);
}

/** Ciudad Bicharraca opens once La Oscuridad has been defeated. */
export function isCityUnlocked(progress) {
  return progress?.phase2Complete === true;
}

/** Start (or replay) Ciudad Bicharraca at its safe entrance checkpoint. */
export function startPhaseThree(store) {
  return requireProgressStore(store).setProgress(PHASE_THREE_START_PROGRESS);
}

/**
 * Preserve old Jungle/City preview links by redirecting to their playable
 * levels. ComingSoonScene is reserved for the unimplemented Boss Total.
 */
export function resolveComingSoonRequest(world) {
  const key = String(world ?? '').trim().toLowerCase();
  if (key === 'jungle' || key === 'jungla') return LEGACY_JUNGLE_ROUTE;
  if (['city', 'ciudad', 'ciudad-bicharraca'].includes(key)) return CITY_ROUTE;
  return BOSS_TOTAL_PREVIEW_ROUTE;
}

/** Start a completed-phase replay at Babilandia's first checkpoint. */
export function replayPhaseOne(store) {
  return requireProgressStore(store).setProgress(PHASE_ONE_REPLAY_PROGRESS);
}
