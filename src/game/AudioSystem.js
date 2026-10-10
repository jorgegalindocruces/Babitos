/**
 * Procedural chiptune audio for BABITOS.
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
 * continuous across Phaser scene transitions. Each theme is a composed
 * 32-step loop; its global arrangement can be changed at any time.
 */

import {
  DEFAULT_MUSIC_STYLE,
  MUSIC_STYLES,
  MUSIC_STYLE_PRESETS,
  MUSIC_THEMES,
  MUSIC_TRACKS,
  midiToFrequency,
} from './musicTracks.js';

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

export const AUDIO_CUES = Object.freeze(Object.keys(SOUND_PRESETS));
export { MUSIC_STYLES, MUSIC_THEMES };

const MUSIC_LOOKAHEAD_SECONDS = 0.16;
const MUSIC_START_DELAY_SECONDS = 0.035;
const MUSIC_SCHEDULER_INTERVAL_MS = 40;
const MAX_MUSIC_VOICES = 20;

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

function cancelParamAutomation(param, time) {
  try {
    param?.cancelScheduledValues?.(time);
  } catch {
    // A missing/closed Web Audio parameter needs no further cleanup.
  }
}

function normalizeMusicStyle(style) {
  return MUSIC_STYLES.includes(style) ? style : DEFAULT_MUSIC_STYLE;
}

export class AudioSystem {
  constructor(options = {}) {
    const hasFactoryOption = Object.hasOwn(options, 'contextFactory');
    const scheduler = options.scheduler ?? globalThis;

    this.contextFactory = hasFactoryOption ? options.contextFactory : defaultContextFactory();
    this.setIntervalFn = typeof scheduler?.setInterval === 'function'
      ? scheduler.setInterval.bind(scheduler)
      : null;
    this.clearIntervalFn = typeof scheduler?.clearInterval === 'function'
      ? scheduler.clearInterval.bind(scheduler)
      : null;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.musicFilter = null;
    this.sfxGain = null;

    this.volume = clamp(options.volume ?? 0.72);
    this.musicVolume = clamp(options.musicVolume ?? 0.24);
    this.sfxVolume = clamp(options.sfxVolume ?? 0.72);
    this.muted = options.muted === true;

    this.musicStyle = normalizeMusicStyle(options.musicStyle);
    this.currentMusicTheme = null;
    this.pendingMusicTheme = null;
    this.musicSession = null;
    this.musicVoices = [];
    this.musicGeneration = 0;

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
      musicStyle: this.musicStyle,
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

    if (typeof this.context.createBiquadFilter === 'function') {
      this.musicFilter = this.context.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      setParamValue(this.musicFilter.frequency, 5200, this.context.currentTime ?? 0);
      setParamValue(this.musicFilter.Q, 0.45, this.context.currentTime ?? 0);
      this.musicGain.connect(this.musicFilter);
      this.musicFilter.connect(this.masterGain);
    } else {
      this.musicGain.connect(this.masterGain);
    }
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    this.applyVolumes();
    this.applyMusicTone();
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

  applyMusicTone() {
    if (!this.musicFilter || !this.context) return;
    const cutoff = {
      adventure: 5200,
      calm: 3800,
      arcade: 6800,
    }[this.musicStyle] ?? 5200;
    setParamValue(this.musicFilter.frequency, cutoff, this.context.currentTime ?? 0);
  }

  setMusicStyle(style) {
    if (!MUSIC_STYLES.includes(style) || this.destroyed) return false;
    if (style === this.musicStyle) return style;

    const previousStyle = this.musicStyle;
    this.musicStyle = style;
    this.applyMusicTone();

    const theme = this.currentMusicTheme ?? this.pendingMusicTheme;
    if (theme) {
      if (!this.isReady()) {
        // Rebuild the current theme in the new arrangement after a suspended
        // or interrupted context resumes.
        this.pendingMusicTheme = theme;
      } else if (!this.beginMusic(theme, true)) {
        this.musicStyle = previousStyle;
        this.applyMusicTone();
        return false;
      }
    }
    return style;
  }

  cycleMusicStyle() {
    const currentIndex = MUSIC_STYLES.indexOf(this.musicStyle);
    const nextStyle = MUSIC_STYLES[(currentIndex + 1) % MUSIC_STYLES.length];
    return this.setMusicStyle(nextStyle);
  }

  /**
   * Starts (or changes) a composed procedural loop. If Web Audio is still
   * locked, the requested theme starts immediately after unlock().
   */
  startMusic(theme = 'babilandia') {
    if (!Object.hasOwn(MUSIC_TRACKS, theme) || this.destroyed) return false;
    this.pendingMusicTheme = theme;
    if (!this.isReady()) return false;
    return this.beginMusic(theme);
  }

  createMusicSession(theme) {
    const track = MUSIC_TRACKS[theme];
    const arrangement = MUSIC_STYLE_PRESETS[this.musicStyle];
    const bpm = track.bpm * arrangement.tempoScale;
    return {
      generation: this.musicGeneration + 1,
      theme,
      style: this.musicStyle,
      track,
      arrangement,
      baseStepDuration: 60 / bpm / 2,
      nextStepTime: (this.context.currentTime ?? 0) + MUSIC_START_DELAY_SECONDS,
      step: 0,
      timerId: null,
      voices: [],
      stopped: false,
    };
  }

  beginMusic(theme, force = false) {
    if (
      !force
      && this.musicSession
      && !this.musicSession.stopped
      && this.musicSession.theme === theme
      && this.musicSession.style === this.musicStyle
    ) {
      this.pendingMusicTheme = null;
      return true;
    }

    const nextSession = this.createMusicSession(theme);
    try {
      this.scheduleMusicSession(nextSession);
      if (this.setIntervalFn) {
        nextSession.timerId = this.setIntervalFn(() => {
          if (
            nextSession.stopped
            || this.musicSession !== nextSession
            || !this.isReady()
          ) return;
          try {
            this.scheduleMusicSession(nextSession);
          } catch {
            // A transient oscillator allocation failure should not stop gameplay.
          }
        }, MUSIC_SCHEDULER_INTERVAL_MS);
        nextSession.timerId?.unref?.();
      }
    } catch {
      this.stopMusicSession(nextSession, 0);
      this.pendingMusicTheme = this.currentMusicTheme ? null : theme;
      return false;
    }

    const previousSession = this.musicSession;
    this.musicGeneration = nextSession.generation;
    this.musicSession = nextSession;
    this.musicVoices = nextSession.voices;
    this.currentMusicTheme = theme;
    this.pendingMusicTheme = null;
    this.stopMusicSession(previousSession, 0.12);
    return true;
  }

  scheduleMusicSession(session) {
    const now = this.context.currentTime ?? 0;
    const loopLength = session.track.melody.length;

    if (session.nextStepTime < now - session.baseStepDuration) {
      const skippedSteps = Math.max(
        1,
        Math.floor((now - session.nextStepTime) / session.baseStepDuration),
      );
      session.step = (session.step + skippedSteps) % loopLength;
      session.nextStepTime = now + MUSIC_START_DELAY_SECONDS;
    }

    let scheduledSteps = 0;
    while (
      session.nextStepTime < now + MUSIC_LOOKAHEAD_SECONDS
      && scheduledSteps < 12
    ) {
      const swing = clamp(
        session.track.swing * session.arrangement.swingScale,
        0,
        0.35,
      );
      const stepDuration = session.baseStepDuration
        * (session.step % 2 === 0 ? 1 + swing : 1 - swing);
      let schedulingError = null;
      try {
        this.scheduleMusicStep(session, session.step, session.nextStepTime, stepDuration);
      } catch (error) {
        schedulingError = error;
      } finally {
        // Never retry the same musical instant: a partial Web Audio failure
        // may omit one layer, but it must not duplicate layers already queued.
        session.nextStepTime += stepDuration;
        session.step = (session.step + 1) % loopLength;
        scheduledSteps += 1;
      }
      if (schedulingError) throw schedulingError;
    }
  }

  scheduleMusicStep(session, step, startsAt, stepDuration) {
    const { arrangement, track } = session;
    const chord = track.chords[Math.floor(step / 8) % track.chords.length];
    const melodyOffset = track.melody[step];

    if (melodyOffset !== null && step % arrangement.lead.density === 0) {
      this.scheduleMusicNote(session, {
        layer: 'lead',
        midi: track.tonicMidi + melodyOffset + arrangement.lead.octave * 12,
        startsAt,
        duration: stepDuration * arrangement.lead.gate,
        gain: arrangement.lead.gain,
        type: arrangement.lead.wave,
      });
    }

    if (step % arrangement.arp.density === 0) {
      const chordOffset = chord[(step / arrangement.arp.density) % chord.length | 0];
      this.scheduleMusicNote(session, {
        layer: 'arp',
        midi: track.tonicMidi + chordOffset + arrangement.arp.octave * 12,
        startsAt,
        duration: stepDuration * arrangement.arp.gate,
        gain: arrangement.arp.gain,
        type: arrangement.arp.wave,
      });
    }

    if (step % arrangement.bass.density === 0) {
      this.scheduleMusicNote(session, {
        layer: 'bass',
        midi: track.tonicMidi + chord[0] + arrangement.bass.octave * 12,
        startsAt,
        duration: stepDuration * arrangement.bass.density * arrangement.bass.gate,
        gain: arrangement.bass.gain,
        type: arrangement.bass.wave,
      });
    }

    this.scheduleRhythm(session, step, startsAt, stepDuration);
  }

  scheduleRhythm(session, step, startsAt, stepDuration) {
    const rhythm = session.arrangement.rhythm;
    const arcadeHat = session.style === 'arcade' && step % 2 === 1;
    if (arcadeHat) {
      this.scheduleMusicNote(session, {
        layer: 'rhythm',
        frequency: 1850,
        endFrequency: 1150,
        startsAt,
        duration: 0.032,
        gain: rhythm.gain * 0.42,
        type: 'square',
      });
      return;
    }
    if (step % rhythm.density !== 0) return;

    this.scheduleMusicNote(session, {
      layer: 'rhythm',
      frequency: session.style === 'calm' ? 72 : 92,
      endFrequency: 44,
      startsAt,
      duration: Math.max(0.045, Math.min(0.11, stepDuration * (0.25 + rhythm.gate))),
      gain: rhythm.gain,
      type: rhythm.wave,
    });
  }

  scheduleMusicNote(session, note) {
    if (session.voices.length >= MAX_MUSIC_VOICES) return false;

    const voice = {
      oscillator: null,
      gain: null,
      started: false,
      stopping: false,
      startsAt: note.startsAt,
      layer: note.layer,
      cleanup: null,
    };
    try {
      voice.oscillator = this.context.createOscillator();
      voice.gain = this.context.createGain();
      voice.oscillator.type = note.type;

      const frequency = note.frequency ?? midiToFrequency(note.midi);
      const endFrequency = note.endFrequency ?? frequency;
      const endsAt = note.startsAt + Math.max(0.025, note.duration);
      const attackEndsAt = note.startsAt + Math.min(0.018, note.duration * 0.22);
      const releaseStartsAt = Math.max(attackEndsAt, endsAt - Math.min(0.065, note.duration * 0.38));

      setParamValue(voice.oscillator.frequency, frequency, note.startsAt);
      rampFrequency(voice.oscillator.frequency, endFrequency, endsAt);
      setParamValue(voice.oscillator.detune, 0, note.startsAt);

      setParamValue(voice.gain.gain, 0.0001, note.startsAt);
      rampParam(voice.gain.gain, Math.max(0.0001, note.gain), attackEndsAt);
      setParamValue(voice.gain.gain, Math.max(0.0001, note.gain), releaseStartsAt);
      rampParam(voice.gain.gain, 0.0001, endsAt);

      voice.cleanup = () => {
        voice.oscillator?.disconnect?.();
        voice.gain?.disconnect?.();
        const voiceIndex = session.voices.indexOf(voice);
        if (voiceIndex >= 0) session.voices.splice(voiceIndex, 1);
      };
      voice.oscillator.onended = voice.cleanup;
      voice.oscillator.connect(voice.gain);
      voice.gain.connect(this.musicGain);
      voice.oscillator.start(note.startsAt);
      voice.started = true;
      voice.oscillator.stop(endsAt + 0.015);
      session.voices.push(voice);
      return true;
    } catch (error) {
      this.stopVoice(voice, 0);
      throw error;
    }
  }

  stopVoice(voice, fadeSeconds = 0.12) {
    const { oscillator, gain, started = true } = voice ?? {};
    const disconnect = voice?.cleanup ?? (() => {
      oscillator?.disconnect?.();
      gain?.disconnect?.();
    });

    if (!oscillator || !gain || !started || voice.stopping) {
      disconnect();
      return;
    }

    voice.stopping = true;
    const time = this.context?.currentTime ?? 0;
    const fade = clamp(fadeSeconds, 0, 2);

    try {
      cancelParamAutomation(gain.gain, time);
      setParamValue(gain.gain, Math.max(0.0001, gain.gain?.value ?? 0.0001), time);
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

  stopMusicSession(session, fadeSeconds = 0.12) {
    if (!session || session.stopped) return;
    session.stopped = true;
    if (session.timerId !== null) {
      this.clearIntervalFn?.(session.timerId);
      session.timerId = null;
    }
    const voices = session.voices.splice(0);
    this.stopVoices(voices, fadeSeconds);
  }

  stopMusic(fadeSeconds = 0.12) {
    const session = this.musicSession;
    this.musicSession = null;
    this.musicVoices = [];
    this.stopMusicSession(session, fadeSeconds);
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
    this.musicFilter = null;
    this.sfxGain = null;

    try {
      await context?.close?.();
    } catch {
      // A previously closed or platform-owned context needs no further work.
    }
  }
}
