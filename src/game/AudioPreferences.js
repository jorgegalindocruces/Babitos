import { DEFAULT_MUSIC_STYLE, MUSIC_STYLES } from './musicTracks.js';

export const AUDIO_PREFERENCE_KEY = 'babitos.audio.v1';
export const MUSIC_PREFERENCE_KEY = 'babitos.music.v1';

function readStorageValue(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorageValue(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
    return true;
  } catch {
    return false;
  }
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readAudioPreferences(storage) {
  const target = resolveStorage(storage);
  const storedStyle = readStorageValue(target, MUSIC_PREFERENCE_KEY);
  return Object.freeze({
    muted: readStorageValue(target, AUDIO_PREFERENCE_KEY) === 'muted',
    musicStyle: MUSIC_STYLES.includes(storedStyle) ? storedStyle : DEFAULT_MUSIC_STYLE,
  });
}

export function saveMutedPreference(muted, storage) {
  return writeStorageValue(
    resolveStorage(storage),
    AUDIO_PREFERENCE_KEY,
    muted ? 'muted' : 'enabled',
  );
}

export function saveMusicStylePreference(style, storage) {
  if (!MUSIC_STYLES.includes(style)) return false;
  return writeStorageValue(resolveStorage(storage), MUSIC_PREFERENCE_KEY, style);
}
