/**
 * Original procedural compositions used by the BABITOS music sequencer.
 *
 * Notes and chords are semitone offsets from `tonicMidi`. A `null` melody
 * step is an intentional rest. Layer `density` is an integer cadence: a layer
 * plays when `step % density === 0` (1 = every step, 4 = every fourth step).
 * The data is deliberately independent from Web Audio so arrangements can be
 * inspected and tested deterministically.
 */

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const DEFAULT_MUSIC_STYLE = 'adventure';

export const MUSIC_STYLES = deepFreeze([
  'adventure',
  'calm',
  'arcade',
]);

export const MUSIC_STYLE_LABELS = deepFreeze({
  adventure: 'AVENTURA',
  calm: 'CALMA',
  arcade: 'ARCADE',
});

export const MUSIC_STYLE_PRESETS = deepFreeze({
  adventure: {
    tempoScale: 1,
    swingScale: 1,
    lead: {
      wave: 'triangle',
      gain: 0.2,
      gate: 0.82,
      octave: 0,
      density: 1,
    },
    arp: {
      wave: 'sine',
      gain: 0.085,
      gate: 0.56,
      octave: 1,
      density: 2,
    },
    bass: {
      wave: 'triangle',
      gain: 0.14,
      gate: 0.76,
      octave: -1,
      density: 4,
    },
    rhythm: {
      wave: 'square',
      gain: 0.022,
      gate: 0.12,
      octave: -2,
      density: 2,
    },
  },
  calm: {
    tempoScale: 0.78,
    swingScale: 0.65,
    lead: {
      wave: 'sine',
      gain: 0.18,
      gate: 0.94,
      octave: 0,
      density: 2,
    },
    arp: {
      wave: 'sine',
      gain: 0.06,
      gate: 0.82,
      octave: 1,
      density: 4,
    },
    bass: {
      wave: 'sine',
      gain: 0.11,
      gate: 0.9,
      octave: -1,
      density: 8,
    },
    rhythm: {
      wave: 'triangle',
      gain: 0.012,
      gate: 0.2,
      octave: -2,
      density: 8,
    },
  },
  arcade: {
    tempoScale: 1.2,
    swingScale: 0.25,
    lead: {
      wave: 'square',
      gain: 0.13,
      gate: 0.56,
      octave: 0,
      density: 1,
    },
    arp: {
      wave: 'square',
      gain: 0.06,
      gate: 0.36,
      octave: 1,
      density: 1,
    },
    bass: {
      wave: 'triangle',
      gain: 0.13,
      gate: 0.46,
      octave: -1,
      density: 2,
    },
    rhythm: {
      wave: 'square',
      gain: 0.03,
      gate: 0.1,
      octave: -2,
      density: 1,
    },
  },
});

export const MUSIC_TRACKS = deepFreeze({
  title: {
    title: 'Un mundo pequeñito',
    bpm: 108,
    swing: 0.08,
    tonicMidi: 55,
    melody: [
      0, null, 4, 7, 9, 7, 4, null,
      2, null, 4, 7, 11, 9, 7, null,
      0, 4, 7, 12, 11, 9, 7, 4,
      2, 4, 7, 9, 7, 4, 2, null,
    ],
    chords: [
      [0, 4, 7],
      [5, 9, 12],
      [9, 12, 16],
      [7, 11, 14],
    ],
  },
  babilandia: {
    title: 'Paseo por Babilandia',
    bpm: 118,
    swing: 0.11,
    tonicMidi: 60,
    melody: [
      0, 2, 4, null, 7, 4, 2, null,
      0, 4, 5, 7, 9, 7, 5, null,
      4, 7, 9, 12, 9, 7, 4, 2,
      5, 4, 2, 0, 2, 4, 0, null,
    ],
    chords: [
      [0, 4, 7],
      [5, 9, 12],
      [2, 5, 9],
      [7, 11, 14],
    ],
  },
  boss: {
    title: 'Se acerca algo grande',
    bpm: 132,
    swing: 0.03,
    tonicMidi: 38,
    melody: [
      0, null, 0, 3, 7, null, 6, 3,
      0, 3, 8, 7, 3, null, 1, null,
      0, 7, 10, 7, 6, 3, 1, 0,
      3, null, 6, 7, 10, 7, 3, null,
    ],
    chords: [
      [0, 3, 7],
      [1, 5, 8],
      [8, 12, 15],
      [7, 10, 14],
    ],
  },
  shop: {
    title: 'Trastos y tesoros',
    bpm: 104,
    swing: 0.18,
    tonicMidi: 62,
    melody: [
      0, 4, 7, null, 11, 9, 7, 4,
      5, null, 9, 12, 9, 7, 5, null,
      2, 5, 9, 7, 5, 2, 4, null,
      7, 11, 14, 11, 9, 7, 4, null,
    ],
    chords: [
      [0, 4, 7],
      [5, 9, 12],
      [2, 5, 9],
      [7, 11, 14],
    ],
  },
  jungle: {
    title: 'Corazón de la jungla',
    bpm: 124,
    swing: 0.14,
    tonicMidi: 50,
    melody: [
      0, null, 3, 5, 7, 5, 3, null,
      0, 3, 5, 10, 7, 5, 3, null,
      12, 10, 7, 5, 3, 5, 7, null,
      10, 7, 5, 3, 0, 3, 0, null,
    ],
    chords: [
      [0, 3, 7],
      [5, 8, 12],
      [3, 7, 10],
      [10, 14, 17],
    ],
  },
  darkness: {
    title: 'Luces en la sombra',
    bpm: 86,
    swing: 0.05,
    tonicMidi: 43,
    melody: [
      0, null, 3, null, 6, 5, 3, null,
      0, 1, 5, 6, 10, 6, 5, null,
      3, null, 6, 10, 8, 6, 5, 3,
      1, 3, 5, null, 6, 5, 1, null,
    ],
    chords: [
      [0, 3, 7],
      [1, 5, 8],
      [8, 12, 15],
      [5, 8, 12],
    ],
  },
  ending: {
    title: 'Pequeños héroes',
    bpm: 112,
    swing: 0.1,
    tonicMidi: 60,
    melody: [
      0, 4, 7, 9, 12, null, 9, 7,
      5, 9, 12, 14, 12, 9, 7, null,
      4, 7, 12, 16, 14, 12, 9, 7,
      5, 7, 9, 12, 11, 7, 12, null,
    ],
    chords: [
      [0, 4, 7],
      [5, 9, 12],
      [9, 12, 16],
      [7, 11, 14],
    ],
  },
});

export const MUSIC_THEMES = deepFreeze(Object.keys(MUSIC_TRACKS));

/** Convert a MIDI note number to frequency in Hz (A4 / MIDI 69 = 440 Hz). */
export function midiToFrequency(note) {
  const midiNote = Number(note);
  if (!Number.isFinite(midiNote)) return 0;
  return 440 * (2 ** ((midiNote - 69) / 12));
}
