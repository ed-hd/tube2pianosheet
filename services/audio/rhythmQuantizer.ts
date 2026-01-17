import { DetectedNote } from '../../types';
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
