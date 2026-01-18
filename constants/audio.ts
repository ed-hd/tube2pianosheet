export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;
export const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
export const NOTE_NAMES_FLAT = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];
export const MIN_FREQUENCY = 65; // C2
export const MAX_FREQUENCY = 2093; // C7
export const MIDDLE_C_MIDI = 60;

export const FFT_SIZE = 4096;
export const HOP_SIZE = 2048;
export const YIN_THRESHOLD = 0.15;
export const MIN_NOTE_DURATION = 0.05;
export const MIN_VELOCITY = 10;

export const BPM_WINDOW_SIZE_SECONDS = 0.01;
export const DEFAULT_BPM = 120;
export const MIN_BPM = 60;
export const MAX_BPM = 200;

export const MAX_MEASURES = 200; // Support up to ~6 minutes at 120 BPM
export const BEATS_PER_MEASURE = 4;

// Key signature definitions
// Maps key name to number of sharps (positive) or flats (negative)
export const KEY_SIGNATURES: Record<string, number> = {
  'C': 0,
  'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
  'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6, 'Cb': -7
};

// Sharps order: F C G D A E B
export const SHARP_ORDER = ['f', 'c', 'g', 'd', 'a', 'e', 'b'];
// Flats order: B E A D G C F
export const FLAT_ORDER = ['b', 'e', 'a', 'd', 'g', 'c', 'f'];

// Dynamics velocity ranges (MIDI 0-127)
export const DYNAMICS = {
  pp: { min: 0, max: 31, label: 'pp' },
  p: { min: 32, max: 55, label: 'p' },
  mp: { min: 56, max: 70, label: 'mp' },
  mf: { min: 71, max: 85, label: 'mf' },
  f: { min: 86, max: 110, label: 'f' },
  ff: { min: 111, max: 127, label: 'ff' }
};

// Chord detection threshold - notes within this many seconds are considered simultaneous
export const CHORD_TIME_THRESHOLD = 0.05;

// Tie detection - same pitch notes within this gap are tied
export const TIE_GAP_THRESHOLD = 0.1;

// Slur detection - legato notes with minimal gap
export const SLUR_GAP_THRESHOLD = 0.08;
