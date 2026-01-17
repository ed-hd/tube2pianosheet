import { DetectedNote, Note, Measure } from '../../types';
import { BEATS_PER_MEASURE, MIDDLE_C_MIDI } from '../../constants/audio';

export interface QuantizedNote {
  pitchMidi: number;
  startBeat: number;
  durationBeats: number;
  clef: 'treble' | 'bass';
  velocity: number;
}

// Possible note durations in beats (4/4 time signature only)
// Supports: whole, dotted half, half, dotted quarter, quarter, dotted eighth, eighth, sixteenth
const NOTE_DURATIONS = [
  4.0,   // whole note
  3.0,   // dotted half
  2.0,   // half note
  1.5,   // dotted quarter
  1.0,   // quarter note
  0.75,  // dotted eighth
  0.5,   // eighth note
  0.25   // sixteenth note
];

// Grid resolution for quantization (16th notes)
const GRID_RESOLUTION = 0.25; // 16th note = 0.25 beats

interface ViterbiState {
  duration: number;
  probability: number;
  backpointer: number | null;
}

/**
 * Converts MIDI pitch to clef assignment
 * Middle C (60) and above → treble clef
 * Below Middle C → bass clef
 */
function midiToClef(midi: number): 'treble' | 'bass' {
  return midi >= MIDDLE_C_MIDI ? 'treble' : 'bass';
}

/**
 * Quantizes a time value to the nearest grid position
 */
function quantizeToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Calculates emission probability: how well does the observed duration match the state duration?
 * Uses Gaussian distribution centered on the state duration
 */
function emissionProbability(observedDuration: number, stateDuration: number): number {
  const sigma = 0.15; // Standard deviation (tolerance for duration matching)
  const diff = observedDuration - stateDuration;
  const prob = Math.exp(-(diff * diff) / (2 * sigma * sigma));
  return Math.max(prob, 1e-10); // Prevent zero probability
}

/**
 * Calculates transition probability: how likely is it to transition from one duration to another?
 * Favors common musical patterns:
 * - Same duration repetition (common in music)
 * - Transitions between related durations (e.g., quarter to eighth)
 */
function transitionProbability(fromDuration: number, toDuration: number): number {
  // Same duration: high probability (rhythmic consistency)
  if (fromDuration === toDuration) {
    return 0.4;
  }
  
  // Related durations (2:1 or 1:2 ratio): medium probability
  const ratio = fromDuration / toDuration;
  if (ratio === 2.0 || ratio === 0.5) {
    return 0.25;
  }
  
  // Dotted to non-dotted or vice versa: medium-low probability
  const isDottedFrom = fromDuration % 0.5 !== 0;
  const isDottedTo = toDuration % 0.5 !== 0;
  if (isDottedFrom !== isDottedTo) {
    return 0.15;
  }
  
  // Other transitions: low probability
  return 0.1;
}

/**
 * Viterbi algorithm for optimal rhythm quantization
 * Finds the most likely sequence of note durations given observed durations
 */
export function quantizeNotesViterbi(notes: DetectedNote[], bpm: number): QuantizedNote[] {
  if (notes.length === 0) {
    return [];
  }

  const beatsPerSecond = bpm / 60;
  const quantizedNotes: QuantizedNote[] = [];

  // Convert time to beats
  const observedNotes = notes.map(note => ({
    pitchMidi: note.pitch,
    startBeat: note.startTime * beatsPerSecond,
    durationBeats: note.duration * beatsPerSecond,
    velocity: note.velocity,
    clef: midiToClef(note.pitch)
  }));

  // Viterbi algorithm for each note
  for (let i = 0; i < observedNotes.length; i++) {
    const observed = observedNotes[i];
    
    // Initialize Viterbi states for all possible durations
    const states: ViterbiState[] = NOTE_DURATIONS.map(duration => ({
      duration,
      probability: emissionProbability(observed.durationBeats, duration),
      backpointer: null
    }));

    // If not the first note, apply transition probabilities
    if (i > 0) {
      const prevQuantizedDuration = quantizedNotes[i - 1].durationBeats;
      
      states.forEach(state => {
        const transProb = transitionProbability(prevQuantizedDuration, state.duration);
        state.probability *= transProb;
      });
    }

    // Find the best state (highest probability)
    let bestState = states[0];
    for (const state of states) {
      if (state.probability > bestState.probability) {
        bestState = state;
      }
    }

    // Quantize start time to 16th note grid
    const quantizedStartBeat = quantizeToGrid(observed.startBeat, GRID_RESOLUTION);

    // Create quantized note
    quantizedNotes.push({
      pitchMidi: observed.pitchMidi,
      startBeat: quantizedStartBeat,
      durationBeats: bestState.duration,
      clef: observed.clef,
      velocity: observed.velocity
    });
  }

  return quantizedNotes;
}

/**
 * Converts VexFlow duration string to beat count
 * Supports: w=4, h=2, q=1, 8=0.5, 16=0.25
 * Dotted notes: multiply by 1.5
 * Rests: same as notes (wr, hr, qr, etc.)
 */
function vexflowDurationToBeats(duration: string, dotted: boolean = false): number {
  // Remove 'r' suffix for rests
  const baseDuration = duration.replace(/r$/, '');
  
  let beats: number;
  switch (baseDuration) {
    case 'w':
      beats = 4;
      break;
    case 'h':
      beats = 2;
      break;
    case 'q':
      beats = 1;
      break;
    case '8':
      beats = 0.5;
      break;
    case '16':
      beats = 0.25;
      break;
    default:
      beats = 1; // Default to quarter note
  }
  
  return dotted ? beats * 1.5 : beats;
}

/**
 * Converts beat count to VexFlow duration string
 * Returns [duration, isDotted]
 */
function beatsToDuration(beats: number): [string, boolean] {
  // Check for exact matches first
  if (beats === 4) return ['w', false];
  if (beats === 3) return ['h', true];  // dotted half
  if (beats === 2) return ['h', false];
  if (beats === 1.5) return ['q', true]; // dotted quarter
  if (beats === 1) return ['q', false];
  if (beats === 0.75) return ['8', true]; // dotted eighth
  if (beats === 0.5) return ['8', false];
  if (beats === 0.25) return ['16', false];
  
  // Default to quarter note for unknown values
  return ['q', false];
}

/**
 * Calculates total beats in a note array
 */
export function calculateMeasureBeats(notes: Note[]): number {
  return notes.reduce((total, note) => {
    return total + vexflowDurationToBeats(note.duration, note.dotted);
  }, 0);
}

/**
 * Validates that a measure has exactly 4 beats in both treble and bass clefs
 */
export function validateMeasureBeats(measure: Measure): boolean {
  const trebleBeats = calculateMeasureBeats(measure.trebleNotes);
  const bassBeats = calculateMeasureBeats(measure.bassNotes);
  
  return trebleBeats === BEATS_PER_MEASURE && bassBeats === BEATS_PER_MEASURE;
}

/**
 * Inserts rests to fill remaining beats in a note array
 */
function insertRests(notes: Note[], clef: 'treble' | 'bass', beatsNeeded: number): Note[] {
  const restKey = clef === 'treble' ? 'b/4' : 'd/3';
  const rests: Note[] = [];
  
  let remaining = beatsNeeded;
  
  // Fill with largest possible rests
  while (remaining > 0) {
    if (remaining >= 4) {
      rests.push({ key: restKey, duration: 'wr', clef, isRest: true });
      remaining -= 4;
    } else if (remaining >= 2) {
      rests.push({ key: restKey, duration: 'hr', clef, isRest: true });
      remaining -= 2;
    } else if (remaining >= 1) {
      rests.push({ key: restKey, duration: 'qr', clef, isRest: true });
      remaining -= 1;
    } else if (remaining >= 0.5) {
      rests.push({ key: restKey, duration: '8r', clef, isRest: true });
      remaining -= 0.5;
    } else {
      rests.push({ key: restKey, duration: '16r', clef, isRest: true });
      remaining -= 0.25;
    }
  }
  
  return [...notes, ...rests];
}

/**
 * Splits a note at measure boundary and adds tie markers
 * Returns [noteInMeasure, overflow]
 */
function splitNoteAtBoundary(note: Note, beatsAvailable: number): [Note, Note | null] {
  const totalBeats = vexflowDurationToBeats(note.duration, note.dotted);
  
  if (totalBeats <= beatsAvailable) {
    return [note, null];
  }
  
  // Split the note
  const [firstDuration, firstDotted] = beatsToDuration(beatsAvailable);
  const overflowBeats = totalBeats - beatsAvailable;
  const [overflowDuration, overflowDotted] = beatsToDuration(overflowBeats);
  
  const firstNote: Note = {
    ...note,
    duration: firstDuration,
    dotted: firstDotted,
    tieStart: true
  };
  
  const overflowNote: Note = {
    ...note,
    duration: overflowDuration,
    dotted: overflowDotted,
    tieEnd: true
  };
  
  return [firstNote, overflowNote];
}

/**
 * Fixes measure beats to exactly 4 beats per clef
 * - Adds rests if too few beats
 * - Splits notes with ties if too many beats
 */
export function fixMeasureBeats(measure: Measure): Measure {
  const fixedMeasure: Measure = {
    trebleNotes: [],
    bassNotes: [],
    trebleChords: measure.trebleChords,
    bassChords: measure.bassChords
  };
  
  // Fix treble clef
  let trebleBeats = 0;
  for (const note of measure.trebleNotes) {
    const noteBeats = vexflowDurationToBeats(note.duration, note.dotted);
    const beatsAvailable = BEATS_PER_MEASURE - trebleBeats;
    
    if (trebleBeats + noteBeats <= BEATS_PER_MEASURE) {
      fixedMeasure.trebleNotes.push(note);
      trebleBeats += noteBeats;
    } else if (beatsAvailable > 0) {
      // Split note at boundary
      const [inMeasure, _overflow] = splitNoteAtBoundary(note, beatsAvailable);
      fixedMeasure.trebleNotes.push(inMeasure);
      trebleBeats = BEATS_PER_MEASURE;
      break; // Measure is full
    } else {
      break; // Measure is full
    }
  }
  
  // Add rests if needed
  if (trebleBeats < BEATS_PER_MEASURE) {
    fixedMeasure.trebleNotes = insertRests(
      fixedMeasure.trebleNotes,
      'treble',
      BEATS_PER_MEASURE - trebleBeats
    );
  }
  
  // Fix bass clef
  let bassBeats = 0;
  for (const note of measure.bassNotes) {
    const noteBeats = vexflowDurationToBeats(note.duration, note.dotted);
    const beatsAvailable = BEATS_PER_MEASURE - bassBeats;
    
    if (bassBeats + noteBeats <= BEATS_PER_MEASURE) {
      fixedMeasure.bassNotes.push(note);
      bassBeats += noteBeats;
    } else if (beatsAvailable > 0) {
      // Split note at boundary
      const [inMeasure, _overflow] = splitNoteAtBoundary(note, beatsAvailable);
      fixedMeasure.bassNotes.push(inMeasure);
      bassBeats = BEATS_PER_MEASURE;
      break; // Measure is full
    } else {
      break; // Measure is full
    }
  }
  
  // Add rests if needed
  if (bassBeats < BEATS_PER_MEASURE) {
    fixedMeasure.bassNotes = insertRests(
      fixedMeasure.bassNotes,
      'bass',
      BEATS_PER_MEASURE - bassBeats
    );
  }
  
  return fixedMeasure;
}
