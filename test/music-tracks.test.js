import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MUSIC_STYLE,
  MUSIC_STYLES,
  MUSIC_STYLE_LABELS,
  MUSIC_STYLE_PRESETS,
  MUSIC_TRACKS,
  MUSIC_THEMES,
  midiToFrequency,
} from '../src/game/musicTracks.js';

const EXPECTED_THEMES = [
  'title',
  'babilandia',
  'boss',
  'shop',
  'jungle',
  'darkness',
  'ending',
];

const OSCILLATOR_WAVES = new Set(['sine', 'square', 'sawtooth', 'triangle']);
const LAYERS = ['lead', 'arp', 'bass', 'rhythm'];

function assertDeeplyFrozen(value, path = 'catalog') {
  assert.equal(Object.isFrozen(value), true, `${path} should be frozen`);
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') {
      assertDeeplyFrozen(child, `${path}.${key}`);
    }
  }
}

test('exports the stable theme and arrangement catalogs', () => {
  assert.equal(DEFAULT_MUSIC_STYLE, 'adventure');
  assert.deepEqual(MUSIC_STYLES, ['adventure', 'calm', 'arcade']);
  assert.deepEqual(MUSIC_STYLE_LABELS, {
    adventure: 'AVENTURA',
    calm: 'CALMA',
    arcade: 'ARCADE',
  });
  assert.deepEqual(MUSIC_THEMES, EXPECTED_THEMES);
  assert.deepEqual(Object.keys(MUSIC_TRACKS), EXPECTED_THEMES);
});

test('every composition has a varied 32-step melody and four relative triads', () => {
  for (const theme of MUSIC_THEMES) {
    const track = MUSIC_TRACKS[theme];

    assert.ok(Number.isFinite(track.bpm) && track.bpm >= 60 && track.bpm <= 180, theme);
    assert.ok(Number.isFinite(track.swing) && track.swing >= 0 && track.swing < 0.5, theme);
    assert.ok(Number.isInteger(track.tonicMidi), theme);
    assert.equal(track.melody.length, 32, theme);
    assert.ok(track.melody.includes(null), `${theme} needs an intentional rest`);

    const notes = track.melody.filter((note) => note !== null);
    assert.ok(notes.every(Number.isInteger), `${theme} melody offsets must be integers`);
    assert.ok(new Set(notes).size >= 4, `${theme} melody needs at least four pitches`);

    assert.equal(track.chords.length, 4, theme);
    for (const chord of track.chords) {
      assert.equal(chord.length, 3, `${theme} chords must be triads`);
      assert.ok(chord.every(Number.isInteger), `${theme} chord offsets must be integers`);
      assert.equal(new Set(chord).size, 3, `${theme} triad pitches must be distinct`);
    }
  }
});

test('tracks and styles have distinct deterministic musical signatures', () => {
  const trackSignatures = MUSIC_THEMES.map((theme) => {
    const { bpm, swing, tonicMidi, melody, chords } = MUSIC_TRACKS[theme];
    return JSON.stringify({ bpm, swing, tonicMidi, melody, chords });
  });
  assert.equal(new Set(trackSignatures).size, MUSIC_THEMES.length);

  const styleSignatures = MUSIC_STYLES.map((style) => JSON.stringify(MUSIC_STYLE_PRESETS[style]));
  assert.equal(new Set(styleSignatures).size, MUSIC_STYLES.length);
});

test('style presets define safe scheduler values for every musical layer', () => {
  for (const style of MUSIC_STYLES) {
    const preset = MUSIC_STYLE_PRESETS[style];
    assert.ok(Number.isFinite(preset.tempoScale) && preset.tempoScale > 0, style);
    assert.ok(Number.isFinite(preset.swingScale) && preset.swingScale >= 0, style);

    for (const layerName of LAYERS) {
      const layer = preset[layerName];
      assert.ok(OSCILLATOR_WAVES.has(layer.wave), `${style}.${layerName}.wave`);
      assert.ok(layer.gain > 0 && layer.gain <= 1, `${style}.${layerName}.gain`);
      assert.ok(layer.gate > 0 && layer.gate <= 1, `${style}.${layerName}.gate`);
      assert.ok(Number.isInteger(layer.octave), `${style}.${layerName}.octave`);
      assert.ok(
        Number.isInteger(layer.density) && layer.density >= 1,
        `${style}.${layerName}.density`,
      );
    }
  }

  assert.ok(MUSIC_STYLE_PRESETS.calm.tempoScale < MUSIC_STYLE_PRESETS.adventure.tempoScale);
  assert.ok(MUSIC_STYLE_PRESETS.arcade.tempoScale > MUSIC_STYLE_PRESETS.adventure.tempoScale);
});

test('all catalog pitches convert to finite audible frequencies', () => {
  assert.equal(midiToFrequency(69), 440);
  assert.ok(Math.abs(midiToFrequency(60) - 261.625565) < 0.00001);
  assert.equal(midiToFrequency(Number.NaN), 0);
  assert.equal(midiToFrequency('not-a-note'), 0);

  for (const track of Object.values(MUSIC_TRACKS)) {
    const offsets = [
      ...track.melody.filter((note) => note !== null),
      ...track.chords.flat(),
    ];
    for (const offset of offsets) {
      const frequency = midiToFrequency(track.tonicMidi + offset);
      assert.ok(Number.isFinite(frequency) && frequency > 20 && frequency < 20_000);
    }
  }
});

test('music catalogs and every nested sequence are immutable', () => {
  assertDeeplyFrozen(MUSIC_STYLES, 'MUSIC_STYLES');
  assertDeeplyFrozen(MUSIC_STYLE_LABELS, 'MUSIC_STYLE_LABELS');
  assertDeeplyFrozen(MUSIC_STYLE_PRESETS, 'MUSIC_STYLE_PRESETS');
  assertDeeplyFrozen(MUSIC_TRACKS, 'MUSIC_TRACKS');
  assertDeeplyFrozen(MUSIC_THEMES, 'MUSIC_THEMES');
});
