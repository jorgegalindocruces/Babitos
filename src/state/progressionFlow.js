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

/** Start a completed-phase replay at Babilandia's first checkpoint. */
export function replayPhaseOne(store) {
  return requireProgressStore(store).setProgress(PHASE_ONE_REPLAY_PROGRESS);
}

