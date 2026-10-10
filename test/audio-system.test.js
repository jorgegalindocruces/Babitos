import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUDIO_CUES,
  MUSIC_STYLES,
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

  cancelScheduledValues(time) {
    this.events.push(['cancel', time]);
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

class FakeScheduler {
  constructor() {
    this.nextId = 1;
    this.callbacks = new Map();
  }

  setInterval(callback) {
    const id = this.nextId;
    this.nextId += 1;
    this.callbacks.set(id, callback);
    return id;
  }

  clearInterval(id) {
    this.callbacks.delete(id);
  }

  tick() {
    for (const callback of [...this.callbacks.values()]) callback();
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
  const scheduler = new FakeScheduler();
  let factoryCalls = 0;
  const audio = new AudioSystem({
    scheduler,
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
  assert.equal(audio.getState().musicStyle, 'adventure');
  assert.equal(context.oscillators.length, 4);
  assert.ok(context.oscillators.every((oscillator) => oscillator.startedAt >= 4));
  assert.ok(context.oscillators.every((oscillator) => oscillator.stoppedAt > oscillator.startedAt));
  assert.equal(scheduler.callbacks.size, 1);

  await audio.destroy();
  assert.equal(scheduler.callbacks.size, 0);
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
  const scheduler = new FakeScheduler();
  const audio = new AudioSystem({ contextFactory: () => context, scheduler });
  await audio.unlock();
  assert.equal(audio.startMusic('title'), true);

  const titleVoices = [...audio.musicVoices];
  context.throwOnOscillatorCall = context.oscillatorCalls + 2;
  assert.equal(audio.startMusic('boss'), false);

  assert.equal(audio.currentMusicTheme, 'title');
  assert.deepEqual(audio.musicVoices, titleVoices);
  assert.ok(titleVoices.every(({ stopping }) => stopping === false));
  const partialBossVoice = context.oscillators.at(-1);
  assert.ok(partialBossVoice.stoppedAt <= context.currentTime + 0.03);
  assert.equal(audio.getState().musicTheme, 'title');
  assert.equal(scheduler.callbacks.size, 1);

  await audio.destroy();
});

test('sequences new notes over time and stopMusic cancels its transport', async () => {
  const context = new FakeAudioContext('running');
  const scheduler = new FakeScheduler();
  const audio = new AudioSystem({ contextFactory: () => context, scheduler });
  await audio.unlock();
  assert.equal(audio.startMusic('jungle'), true);

  const initialOscillators = context.oscillators.length;
  context.currentTime += 0.5;
  scheduler.tick();
  assert.ok(context.oscillators.length > initialOscillators);
  assert.ok(context.oscillators.every(({ startedAt, stoppedAt }) => stoppedAt > startedAt));

  audio.stopMusic();
  const stoppedCount = context.oscillators.length;
  assert.equal(scheduler.callbacks.size, 0);
  assert.equal(audio.getState().musicTheme, null);
  context.currentTime += 8;
  scheduler.tick();
  assert.equal(context.oscillators.length, stoppedCount);

  await audio.destroy();
});

test('a partial scheduler failure advances past the beat instead of duplicating it', async () => {
  const context = new FakeAudioContext('running');
  const scheduler = new FakeScheduler();
  const audio = new AudioSystem({ contextFactory: () => context, scheduler });
  await audio.unlock();
  assert.equal(audio.startMusic('title'), true);

  const session = audio.musicSession;
  context.throwOnOscillatorCall = context.oscillatorCalls + 2;
  context.currentTime = 4.48;
  scheduler.tick();

  assert.equal(session.step, 3);
  const oscillatorCountAfterFailure = context.oscillators.length;
  const lastScheduledTime = session.nextStepTime;
  scheduler.tick();
  assert.equal(session.step, 3);
  assert.equal(session.nextStepTime, lastScheduledTime);
  assert.equal(context.oscillators.length, oscillatorCountAfterFailure);

  await audio.destroy();
});

test('changes soundtrack arrangement without duplicating transports or unmuting', async () => {
  const context = new FakeAudioContext('running');
  const scheduler = new FakeScheduler();
  const audio = new AudioSystem({
    contextFactory: () => context,
    scheduler,
    muted: true,
  });
  await audio.unlock();
  assert.equal(audio.startMusic('shop'), true);

  const adventureSession = audio.musicSession;
  assert.equal(audio.startMusic('shop'), true);
  assert.equal(audio.musicSession, adventureSession);
  assert.equal(scheduler.callbacks.size, 1);

  assert.equal(audio.setMusicStyle('calm'), 'calm');
  assert.notEqual(audio.musicSession, adventureSession);
  assert.equal(adventureSession.stopped, true);
  assert.equal(scheduler.callbacks.size, 1);
  assert.deepEqual(audio.getState(), {
    available: true,
    unlocked: true,
    muted: true,
    volume: 0.72,
    musicVolume: 0.24,
    sfxVolume: 0.72,
    musicTheme: 'shop',
    musicStyle: 'calm',
  });

  assert.equal(audio.setMusicStyle('unknown'), false);
  assert.equal(audio.cycleMusicStyle(), 'arcade');
  assert.equal(audio.getState().muted, true);
  assert.equal(scheduler.callbacks.size, 1);

  await audio.destroy();
  assert.equal(scheduler.callbacks.size, 0);
});

test('rebuilds a changed arrangement after an interrupted context resumes', async () => {
  const context = new FakeAudioContext('running');
  const scheduler = new FakeScheduler();
  const audio = new AudioSystem({ contextFactory: () => context, scheduler });
  await audio.unlock();
  audio.startMusic('babilandia');
  const adventureSession = audio.musicSession;

  context.state = 'interrupted';
  assert.equal(audio.setMusicStyle('calm'), 'calm');
  assert.equal(audio.musicSession, adventureSession);
  assert.equal(audio.pendingMusicTheme, 'babilandia');

  assert.equal(await audio.unlock(), true);
  assert.notEqual(audio.musicSession, adventureSession);
  assert.equal(audio.musicSession.style, 'calm');
  assert.equal(audio.pendingMusicTheme, null);
  assert.equal(scheduler.callbacks.size, 1);

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
  assert.deepEqual(MUSIC_STYLES, ['adventure', 'calm', 'arcade']);
});
