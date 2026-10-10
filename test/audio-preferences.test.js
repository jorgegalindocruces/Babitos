import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUDIO_PREFERENCE_KEY,
  MUSIC_PREFERENCE_KEY,
  readAudioPreferences,
  saveMusicStylePreference,
  saveMutedPreference,
} from '../src/game/AudioPreferences.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    values,
  };
}

test('audio preferences preserve the legacy mute value and default music style', () => {
  const mutedStorage = createStorage({ [AUDIO_PREFERENCE_KEY]: 'muted' });
  const enabledStorage = createStorage({ [AUDIO_PREFERENCE_KEY]: 'enabled' });

  assert.deepEqual(readAudioPreferences(mutedStorage), {
    muted: true,
    musicStyle: 'adventure',
  });
  assert.deepEqual(readAudioPreferences(enabledStorage), {
    muted: false,
    musicStyle: 'adventure',
  });
});

test('audio preferences persist mute and soundtrack style independently', () => {
  const storage = createStorage();

  assert.equal(saveMutedPreference(true, storage), true);
  assert.equal(saveMusicStylePreference('calm', storage), true);
  assert.equal(storage.values.get(AUDIO_PREFERENCE_KEY), 'muted');
  assert.equal(storage.values.get(MUSIC_PREFERENCE_KEY), 'calm');
  assert.deepEqual(readAudioPreferences(storage), { muted: true, musicStyle: 'calm' });

  assert.equal(saveMutedPreference(false, storage), true);
  assert.deepEqual(readAudioPreferences(storage), { muted: false, musicStyle: 'calm' });
});

test('unknown styles and blocked storage fall back without throwing', () => {
  const invalidStorage = createStorage({ [MUSIC_PREFERENCE_KEY]: 'noise' });
  const blockedStorage = {
    getItem() {
      throw new Error('storage is blocked');
    },
    setItem() {
      throw new Error('storage is blocked');
    },
  };

  assert.deepEqual(readAudioPreferences(invalidStorage), {
    muted: false,
    musicStyle: 'adventure',
  });
  assert.deepEqual(readAudioPreferences(blockedStorage), {
    muted: false,
    musicStyle: 'adventure',
  });
  assert.equal(saveMutedPreference(true, blockedStorage), false);
  assert.equal(saveMusicStylePreference('arcade', blockedStorage), false);
  assert.equal(saveMusicStylePreference('unknown', invalidStorage), false);
});
