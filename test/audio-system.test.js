import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUDIO_CUES,
  MUSIC_THEMES,
  AudioSystem,
} from '../src/game/AudioSystem.js';

class FakeParam {
  constructor(value = 0) {
    this.value = value;
    this.events = [];
  }

  setValueAtTime(value, time) {
    this.value = value;
    this.events.push(['set', value, time]);
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(['linear', value, time]);
  }

  exponentialRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(['exponential', value, time]);
  }
}

class FakeNode {
  constructor() {
    this.connections = [];
    this.disconnected = false;
  }

  connect(target) {
    this.connections.push(target);
    return target;
  }

  disconnect() {
    this.disconnected = true;
  }
}

class FakeGain extends FakeNode {
  constructor() {
    super();
    this.gain = new FakeParam(1);
  }
}

class FakeOscillator extends FakeNode {
  constructor() {
    super();
    this.frequency = new FakeParam();
    this.detune = new FakeParam();
    this.startedAt = null;
    this.stoppedAt = null;
    this.type = 'sine';
    this.onended = null;
  }

  start(time) {
    this.startedAt = time;
  }

  stop(time) {
    this.stoppedAt = time;
  }
}

class FakeAudioContext {
  constructor(state = 'suspended') {
    this.currentTime = 4;
    this.destination = new FakeNode();
    this.state = state;
    this.gains = [];
    this.oscillators = [];
    this.resumeCalls = 0;
    this.closeCalls = 0;
    this.oscillatorCalls = 0;
    this.throwOnOscillatorCall = null;
    this.resumeGate = null;
  }

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  createOscillator() {
    this.oscillatorCalls += 1;
    if (this.oscillatorCalls === this.throwOnOscillatorCall) {
      throw new Error('synthetic oscillator failure');
    }
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  async resume() {
    this.resumeCalls += 1;
    if (this.resumeGate) await this.resumeGate;
    this.state = 'running';
  }

  async close() {
    this.closeCalls += 1;
    this.state = 'closed';
  }
}

test('is a safe no-op when Web Audio is unavailable', async () => {
  const audio = new AudioSystem({ contextFactory: null });

  assert.equal(audio.available, false);
  assert.equal(await audio.unlock(), false);
  assert.equal(audio.play('coin'), false);
  assert.equal(audio.startMusic('babilandia'), false);
  assert.equal(audio.setVolume(2), 1);
  assert.equal(audio.setVolume(-4), 0);
  assert.equal(audio.toggleMuted(), true);
  assert.equal(audio.getState().muted, true);

  await audio.destroy();
});

test('unlocks once and starts music that was requested before the gesture', async () => {
  const context = new FakeAudioContext();
  let factoryCalls = 0;
  const audio = new AudioSystem({
    contextFactory: () => {
      factoryCalls += 1;
      return context;
    },
  });

  assert.equal(audio.startMusic('babilandia'), false);
  assert.equal(audio.getState().musicTheme, 'babilandia');
  assert.equal(await audio.unlock(), true);
  assert.equal(await audio.unlock(), true);

  assert.equal(factoryCalls, 1);
  assert.equal(context.resumeCalls, 1);
  assert.equal(audio.unlocked, true);
  assert.equal(audio.getState().musicTheme, 'babilandia');
  assert.equal(context.oscillators.length, 3);
  assert.ok(context.oscillators.every((oscillator) => oscillator.startedAt === 4));

  await audio.destroy();
  assert.equal(context.closeCalls, 1);
});

test('plays every semantic cue and safely ignores unknown cues', async () => {
  const context = new FakeAudioContext('running');
  const audio = new AudioSystem({ contextFactory: () => context });
  await audio.unlock();

  for (const cue of AUDIO_CUES) {
    assert.equal(audio.playSfx(cue, { gain: 0.5, detune: 40 }), true, cue);
  }
  assert.equal(audio.play('not-a-cue'), false);

  const soundOscillators = context.oscillators;
  assert.ok(soundOscillators.length > AUDIO_CUES.length);
  assert.ok(soundOscillators.every((oscillator) => oscillator.stoppedAt > oscillator.startedAt));
  assert.ok(soundOscillators.every((oscillator) => oscillator.detune.value === 40));

  await audio.destroy();
});

test('clamps mix controls and mute changes the master gain', async () => {
  const context = new FakeAudioContext('running');
  const audio = new AudioSystem({ contextFactory: () => context, volume: 0.5 });
  await audio.unlock();

  assert.equal(audio.masterGain.gain.value, 0.25);
  assert.equal(audio.setMusicVolume(5), 1);
  assert.equal(audio.setSfxVolume(-1), 0);
  assert.equal(audio.setMuted(true), true);
  assert.equal(audio.masterGain.gain.value, 0);
  assert.equal(audio.setMuted(false), false);
  assert.equal(audio.masterGain.gain.value, 0.25);

  await audio.destroy();
});

test('bindUnlock keeps recovery gestures, deduplicates resume, and cleans up on destroy', async () => {
  const context = new FakeAudioContext();
  const listeners = new Map();
  const target = {
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
  };
  const audio = new AudioSystem({ contextFactory: () => context });

  assert.equal(audio.bindUnlock(target), true);
  assert.deepEqual([...listeners.keys()], ['pointerdown', 'keydown', 'touchend']);
  listeners.get('keydown')();
  await audio.unlock();
  assert.equal(audio.unlocked, true);
  assert.equal(listeners.size, 3);

  context.state = 'interrupted';
  let releaseResume;
  context.resumeGate = new Promise((resolve) => {
    releaseResume = resolve;
  });
  listeners.get('pointerdown')();
  listeners.get('touchend')();
  assert.equal(context.resumeCalls, 2);
  releaseResume();
  await audio.unlock();
  assert.equal(audio.unlocked, true);
  assert.equal(context.resumeCalls, 2);

  await audio.destroy();
  assert.equal(listeners.size, 0);
});

test('cleans partially-created voices and keeps the previous theme on failure', async () => {
  const context = new FakeAudioContext('running');
  const audio = new AudioSystem({ contextFactory: () => context });
  await audio.unlock();
  assert.equal(audio.startMusic('title'), true);

  const titleVoices = [...audio.musicVoices];
  context.throwOnOscillatorCall = context.oscillatorCalls + 2;
  assert.equal(audio.startMusic('boss'), false);

  assert.equal(audio.currentMusicTheme, 'title');
  assert.deepEqual(audio.musicVoices, titleVoices);
  assert.ok(titleVoices.every(({ oscillator }) => oscillator.stoppedAt === null));
  const partialBossVoice = context.oscillators.at(-1);
  assert.ok(partialBossVoice.stoppedAt > partialBossVoice.startedAt);
  assert.equal(audio.getState().musicTheme, 'title');

  await audio.destroy();
});

test('exports stable cue and music theme catalogs for UI wiring', () => {
  assert.deepEqual(AUDIO_CUES, [
    'ui',
    'jump',
    'attack',
    'hit',
    'coin',
    'checkpoint',
    'boss',
    'purchase',
  ]);
  assert.deepEqual(MUSIC_THEMES, ['title', 'babilandia', 'boss', 'shop', 'jungle', 'darkness', 'ending']);
});
