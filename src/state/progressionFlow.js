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

const CITY_PREVIEW_ROUTE = Object.freeze({
  kind: 'preview',
  world: 'city',
});

const LEGACY_JUNGLE_ROUTE = Object.freeze({
  kind: 'redirect',
  scene: 'GameScene',
  data: Object.freeze({ level: 'jungla' }),
});

/** La Jungla opens once Phase 1 (Babilandia and Babito Corrupto) is done. */
export function isJungleUnlocked(progress) {
  return progress?.phase1Complete === true;
}

/** Start (or replay) La Jungla at its first checkpoint. */
export function startPhaseTwo(store) {
  return requireProgressStore(store).setProgress(PHASE_TWO_START_PROGRESS);
}

/**
 * ComingSoonScene is now City-only. Preserve old links and saved callers that
 * still request the retired Jungle preview by sending them to playable Phase 2.
 */
export function resolveComingSoonRequest(world) {
  const key = String(world ?? '').trim().toLowerCase();
  return key === 'jungle' || key === 'jungla'
    ? LEGACY_JUNGLE_ROUTE
    : CITY_PREVIEW_ROUTE;
}

/** Start a completed-phase replay at Babilandia's first checkpoint. */
export function replayPhaseOne(store) {
  return requireProgressStore(store).setProgress(PHASE_ONE_REPLAY_PROGRESS);
}
