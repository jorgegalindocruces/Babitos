/**
 * Lightweight procedural audio for BABITOS.
 *
 * The class deliberately has no Phaser dependency, so scenes can share one
 * instance through the registry without coupling sound to scene lifecycles.
 * It is also safe during SSR/tests and in browsers without Web Audio.
 *
 * Typical integration:
 *
 *   const audio = new AudioSystem();
 *   audio.bindUnlock();                 // initial unlock + interruption recovery
 *   audio.startMusic('babilandia');     // remembered until audio is unlocked
 *   audio.play('coin');
 *   audio.toggleMuted();
 *   audio.setVolume(0.7);
 *
 * Call destroy() when the game itself is disposed. Music is intentionally
 * continuous across Phaser scene transitions; scenes should call startMusic()
 * only when their theme changes.
 */

const SOUND_PRESETS = Object.freeze({
  ui: [
    { frequency: 420, endFrequency: 520, duration: 0.045, gain: 0.07, type: 'square' },
  ],
  jump: [
    { frequency: 270, endFrequency: 570, duration: 0.13, gain: 0.12, type: 'triangle' },
  ],
  attack: [
    { frequency: 210, endFrequency: 95, duration: 0.09, gain: 0.1, type: 'sawtooth' },
    { frequency: 620, endFrequency: 360, duration: 0.055, gain: 0.045, offset: 0.025, type: 'square' },
  ],
  hit: [
    { frequency: 145, endFrequency: 58, duration: 0.16, gain: 0.14, type: 'square' },
  ],
  coin: [
    { frequency: 740, endFrequency: 820, duration: 0.07, gain: 0.1, type: 'sine' },
    { frequency: 988, endFrequency: 1120, duration: 0.1, gain: 0.09, offset: 0.055, type: 'sine' },
  ],
  checkpoint: [
    { frequency: 392, endFrequency: 440, duration: 0.15, gain: 0.075, type: 'triangle' },
    { frequency: 523.25, endFrequency: 587.33, duration: 0.18, gain: 0.07, offset: 0.1, type: 'triangle' },
    { frequency: 659.25, endFrequency: 783.99, duration: 0.24, gain: 0.065, offset: 0.2, type: 'triangle' },
  ],
  boss: [
    { frequency: 92.5, endFrequency: 55, duration: 0.42, gain: 0.14, type: 'sawtooth' },
    { frequency: 185, endFrequency: 73.42, duration: 0.35, gain: 0.075, offset: 0.08, type: 'triangle' },
  ],
  purchase: [
    { frequency: 523.25, endFrequency: 587.33, duration: 0.11, gain: 0.08, type: 'triangle' },
    { frequency: 659.25, endFrequency: 698.46, duration: 0.12, gain: 0.075, offset: 0.09, type: 'triangle' },
    { frequency: 783.99, endFrequency: 880, duration: 0.18, gain: 0.07, offset: 0.18, type: 'triangle' },
  ],
});

const MUSIC_PRESETS = Object.freeze({
  title: Object.freeze({
    frequencies: Object.freeze([196, 246.94, 293.66]),
    detunes: Object.freeze([-7, 2, 8]),
    type: 'sine',
  }),
  babilandia: Object.freeze({
    frequencies: Object.freeze([261.63, 329.63, 392]),
    detunes: Object.freeze([-5, 3, 9]),
    type: 'sine',
  }),
  boss: Object.freeze({
    frequencies: Object.freeze([110, 130.81, 164.81]),
    detunes: Object.freeze([-9, 0, 6]),
    type: 'triangle',
  }),
  shop: Object.freeze({
    frequencies: Object.freeze([293.66, 369.99, 440]),
    detunes: Object.freeze([-4, 4, 10]),
    type: 'sine',
  }),
  jungle: Object.freeze({
    frequencies: Object.freeze([146.83, 220, 261.63, 329.63]),
    detunes: Object.freeze([-6, 2, 5, 9]),
    type: 'triangle',
  }),
  darkness: Object.freeze({
    frequencies: Object.freeze([98, 116.54, 146.83]),
    detunes: Object.freeze([-11, 0, 7]),
    type: 'triangle',
  }),
  ending: Object.freeze({
    frequencies: Object.freeze([220, 277.18, 329.63, 440]),
    detunes: Object.freeze([-6, 1, 6, 11]),
    type: 'sine',
  }),
});

export const AUDIO_CUES = Object.freeze(Object.keys(SOUND_PRESETS));
export const MUSIC_THEMES = Object.freeze(Object.keys(MUSIC_PRESETS));

function clamp(value, minimum = 0, maximum = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, number));
}

function defaultContextFactory() {
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return typeof AudioContextClass === 'function'
    ? () => new AudioContextClass()
    : null;
}

function setParamValue(param, value, time = 0) {
  if (!param) return;
  if (typeof param.setValueAtTime === 'function') {
    param.setValueAtTime(value, time);
  } else {
    param.value = value;
  }
}

function rampParam(param, value, time) {
  if (typeof param?.linearRampToValueAtTime === 'function') {
    param.linearRampToValueAtTime(value, time);
  } else {
    setParamValue(param, value, time);
  }
}

function rampFrequency(param, value, time) {
  if (typeof param?.exponentialRampToValueAtTime === 'function' && value > 0) {
    param.exponentialRampToValueAtTime(value, time);
  } else {
    rampParam(param, value, time);
  }
}

export class AudioSystem {
  constructor(options = {}) {
    const hasFactoryOption = Object.hasOwn(options, 'contextFactory');

    this.contextFactory = hasFactoryOption ? options.contextFactory : defaultContextFactory();
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.volume = clamp(options.volume ?? 0.72);
    this.musicVolume = clamp(options.musicVolume ?? 0.18);
    this.sfxVolume = clamp(options.sfxVolume ?? 0.72);
    this.muted = options.muted === true;

    this.currentMusicTheme = null;
    this.pendingMusicTheme = null;
    this.musicVoices = [];

    this.destroyed = false;
    this.unlockPromise = null;
    this.unlockTarget = null;
    this.unlockHandler = null;
  }

  get available() {
    return typeof this.contextFactory === 'function';
  }

  get unlocked() {
    return this.isReady();
  }

  getState() {
    return Object.freeze({
      available: this.available,
      unlocked: this.unlocked,
      muted: this.muted,
      volume: this.volume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      musicTheme: this.currentMusicTheme ?? this.pendingMusicTheme,
    });
  }

  isReady() {
    if (!this.context || !this.masterGain || this.destroyed) return false;
    return this.context.state === undefined || this.context.state === 'running';
  }

  createGraph() {
    if (this.masterGain || !this.context) return;

    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    this.applyVolumes();
  }

  async unlock() {
    if (this.destroyed || !this.available) return false;
    if (this.unlockPromise) return this.unlockPromise;
    if (this.isReady()) return true;

    this.unlockPromise = this.performUnlock();
    try {
      return await this.unlockPromise;
    } finally {
      this.unlockPromise = null;
    }
  }

  async performUnlock() {
    try {
      if (!this.context) this.context = this.contextFactory();
      if (!this.context) return false;

      this.createGraph();
      if (this.context.state === 'suspended' || this.context.state === 'interrupted') {
        await this.context.resume?.();
      }

      const ready = this.isReady();
      if (ready && this.pendingMusicTheme) this.beginMusic(this.pendingMusicTheme);
      return ready;
    } catch {
      return false;
    }
  }

  /**
   * Keeps a lightweight gesture listener for both the initial Web Audio
   * unlock and later browser/OS interruptions. The handler is a no-op while
   * the context is running. Calling it again replaces the previous target.
   * Returns false in DOM-less environments.
   */
  bindUnlock(target = globalThis.document) {
    if (this.destroyed || !target?.addEventListener) return false;
    this.unbindUnlock();

    this.unlockTarget = target;
    this.unlockHandler = () => {
      if (!this.isReady()) void this.unlock();
    };

    for (const eventName of ['pointerdown', 'keydown', 'touchend']) {
      target.addEventListener(eventName, this.unlockHandler, { capture: true, passive: true });
    }
    return true;
  }

  unbindUnlock() {
    if (!this.unlockTarget || !this.unlockHandler) return;

    for (const eventName of ['pointerdown', 'keydown', 'touchend']) {
      this.unlockTarget.removeEventListener(eventName, this.unlockHandler, true);
    }
    this.unlockTarget = null;
    this.unlockHandler = null;
  }

  applyVolumes() {
    if (!this.context) return;
    const time = this.context.currentTime ?? 0;
    const masterLevel = this.muted ? 0 : this.volume ** 2;
    setParamValue(this.masterGain?.gain, masterLevel, time);
    setParamValue(this.musicGain?.gain, this.musicVolume, time);
    setParamValue(this.sfxGain?.gain, this.sfxVolume, time);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.applyVolumes();
    return this.muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  setVolume(volume) {
    this.volume = clamp(volume);
    this.applyVolumes();
    return this.volume;
  }

  setMusicVolume(volume) {
    this.musicVolume = clamp(volume);
    this.applyVolumes();
    return this.musicVolume;
  }

  setSfxVolume(volume) {
    this.sfxVolume = clamp(volume);
    this.applyVolumes();
    return this.sfxVolume;
  }

  /**
   * Starts (or changes) a very quiet procedural ambient pad. If Web Audio is
   * still locked, the requested theme starts immediately after unlock().
   */
  startMusic(theme = 'babilandia') {
    if (!Object.hasOwn(MUSIC_PRESETS, theme) || this.destroyed) return false;
    this.pendingMusicTheme = theme;
    if (!this.isReady()) return false;
    return this.beginMusic(theme);
  }

  beginMusic(theme) {
    if (this.currentMusicTheme === theme && this.musicVoices.length > 0) {
      this.pendingMusicTheme = null;
      return true;
    }

    const preset = MUSIC_PRESETS[theme];
    const time = this.context.currentTime ?? 0;
    const voiceLevel = 0.78 / preset.frequencies.length;
    const nextVoices = [];

    for (let index = 0; index < preset.frequencies.length; index += 1) {
      const voice = { oscillator: null, gain: null, started: false };
      try {
        voice.oscillator = this.context.createOscillator();
        voice.gain = this.context.createGain();

        voice.oscillator.type = preset.type;
        setParamValue(voice.oscillator.frequency, preset.frequencies[index], time);
        setParamValue(voice.oscillator.detune, preset.detunes[index] ?? 0, time);
        setParamValue(voice.gain.gain, 0.0001, time);
        rampParam(voice.gain.gain, voiceLevel, time + 0.7 + index * 0.08);

        voice.oscillator.connect(voice.gain);
        voice.gain.connect(this.musicGain);
        voice.oscillator.start(time);
        voice.started = true;
        nextVoices.push(voice);
      } catch {
        this.stopVoices([voice, ...nextVoices], 0);
        this.pendingMusicTheme = theme;
        return false;
      }
    }

    const previousVoices = this.musicVoices.splice(0);
    this.musicVoices = nextVoices;
    this.stopVoices(previousVoices, 0.08);
    this.currentMusicTheme = theme;
    this.pendingMusicTheme = null;
    return true;
  }

  stopVoice(voice, fadeSeconds = 0.12) {
    const { oscillator, gain, started = true } = voice ?? {};
    const disconnect = () => {
      oscillator?.disconnect?.();
      gain?.disconnect?.();
    };

    if (!oscillator || !gain || !started) {
      disconnect();
      return;
    }

    const time = this.context?.currentTime ?? 0;
    const fade = clamp(fadeSeconds, 0, 2);

    try {
      setParamValue(gain.gain, gain.gain?.value ?? 0.0001, time);
      rampParam(gain.gain, 0.0001, time + fade);
      oscillator.onended = disconnect;
      oscillator.stop(time + fade + 0.02);
    } catch {
      disconnect();
    }
  }

  stopVoices(voices, fadeSeconds = 0.12) {
    for (const voice of voices) this.stopVoice(voice, fadeSeconds);
  }

  stopMusic(fadeSeconds = 0.12) {
    const voices = this.musicVoices.splice(0);
    this.stopVoices(voices, fadeSeconds);

    this.currentMusicTheme = null;
    this.pendingMusicTheme = null;
  }

  /**
   * Plays one semantic cue. Unknown cues and locked/unavailable audio are
   * harmless no-ops. `detune` is measured in cents and `gain` is 0..1.
   */
  play(cue, options = {}) {
    const preset = SOUND_PRESETS[cue];
    if (!preset || !this.isReady()) return false;

    const detune = clamp(options.detune ?? 0, -1200, 1200);
    const gainScale = clamp(options.gain ?? 1);
    const time = this.context.currentTime ?? 0;

    try {
      for (const step of preset) {
        this.playTone(step, time, detune, gainScale);
      }
      return true;
    } catch {
      return false;
    }
  }

  playSfx(cue, options = {}) {
    return this.play(cue, options);
  }

  playTone(step, time, detune, gainScale) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const startsAt = time + (step.offset ?? 0);
    const attackEndsAt = startsAt + Math.min(0.012, step.duration / 3);
    const endsAt = startsAt + step.duration;

    oscillator.type = step.type;
    setParamValue(oscillator.frequency, step.frequency, startsAt);
    rampFrequency(oscillator.frequency, step.endFrequency ?? step.frequency, endsAt);
    setParamValue(oscillator.detune, detune, startsAt);

    setParamValue(gain.gain, 0.0001, startsAt);
    rampParam(gain.gain, Math.max(0.0001, step.gain * gainScale), attackEndsAt);
    rampParam(gain.gain, 0.0001, endsAt);

    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start(startsAt);
    oscillator.stop(endsAt + 0.015);
    oscillator.onended = () => {
      oscillator.disconnect?.();
      gain.disconnect?.();
    };
  }

  async destroy() {
    if (this.destroyed) return;
    this.stopMusic(0);
    this.unbindUnlock();
    this.destroyed = true;

    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    try {
      await context?.close?.();
    } catch {
      // A previously closed or platform-owned context needs no further work.
    }
  }
}
