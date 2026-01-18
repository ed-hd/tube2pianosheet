import { Note } from '../../types';
import { QuantizedNote } from './rhythmQuantizer';
import { MIDDLE_C_MIDI, NOTE_NAMES, NOTE_NAMES_FLAT } from '../../constants/audio';

/**
 * Converts MIDI note number to VexFlow notation (e.g., 60 → "c/4")
 */
function midiToNoteName(midi: number, useFlats: boolean = false): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  const noteNames = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES;
  return `${noteNames[noteIndex]}/${octave}`;
}

/**
 * Gets accidental for a MIDI note (# or undefined)
 */
function getAccidental(midi: number): string | undefined {
  const noteIndex = midi % 12;
  const sharpNotes = [1, 3, 6, 8, 10]; // c#, d#, f#, g#, a#
  if (sharpNotes.includes(noteIndex)) {
    return '#';
  }
  return undefined;
}

/**
 * Converts beat count to VexFlow duration string
 * Returns [duration, isDotted]
 */
function beatsToDuration(beats: number): [string, boolean] {
  // Check for exact matches first (with small tolerance for floating point)
  const tolerance = 0.01;
  
  if (Math.abs(beats - 4) < tolerance) return ['w', false];
  if (Math.abs(beats - 3) < tolerance) return ['h', true];  // dotted half
  if (Math.abs(beats - 2) < tolerance) return ['h', false];
  if (Math.abs(beats - 1.5) < tolerance) return ['q', true]; // dotted quarter
  if (Math.abs(beats - 1) < tolerance) return ['q', false];
  if (Math.abs(beats - 0.75) < tolerance) return ['8', true]; // dotted eighth
  if (Math.abs(beats - 0.5) < tolerance) return ['8', false];
  if (Math.abs(beats - 0.25) < tolerance) return ['16', false];
  
  // Default to quarter note for unknown values
  return ['q', false];
}

/**
 * Separates polyphonic notes into treble (right hand) and bass (left hand) voices
 * using rule-based harmonic analysis.
 * 
 * Strategy:
 * 1. Bass detection: Lowest notes at each time point (harmonic foundation)
 * 2. Melody extraction: Highest notes with melodic continuity
 * 3. Middle voices: Assigned based on pitch range and harmonic function
 * 
 * @param notes - Array of quantized notes with timing and pitch information
 * @returns Object with treble and bass note arrays
 */
export function separateVoices(notes: QuantizedNote[]): { treble: Note[]; bass: Note[] } {
  if (notes.length === 0) {
    return { treble: [], bass: [] };
  }

  // Sort notes by start time, then by pitch (low to high)
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.startBeat !== b.startBeat) {
      return a.startBeat - b.startBeat;
    }
    return a.pitchMidi - b.pitchMidi;
  });

  const trebleNotes: Note[] = [];
  const bassNotes: Note[] = [];

  // Group notes by start time (simultaneous notes = chords)
  const timeGroups = new Map<number, QuantizedNote[]>();
  
  sortedNotes.forEach(note => {
    const startBeat = note.startBeat;
    if (!timeGroups.has(startBeat)) {
      timeGroups.set(startBeat, []);
    }
    timeGroups.get(startBeat)!.push(note);
  });

  // Process each time group
  timeGroups.forEach((group, _startBeat) => {
    if (group.length === 1) {
      // Single note: assign based on pitch range
      const note = group[0];
      const vexNote = convertToVexNote(note);
      
      if (note.pitchMidi >= MIDDLE_C_MIDI) {
        vexNote.clef = 'treble';
        trebleNotes.push(vexNote);
      } else {
        vexNote.clef = 'bass';
        bassNotes.push(vexNote);
      }
    } else {
      // Multiple simultaneous notes: separate by harmonic function
      separateChord(group, trebleNotes, bassNotes);
    }
  });

  return { treble: trebleNotes, bass: bassNotes };
}

/**
 * Separates a chord into treble and bass voices based on harmonic analysis
 */
function separateChord(
  chord: QuantizedNote[],
  trebleNotes: Note[],
  bassNotes: Note[]
): void {
  // Sort chord notes by pitch (low to high)
  const sortedChord = [...chord].sort((a, b) => a.pitchMidi - b.pitchMidi);
  
  // Strategy: Bass gets lowest note(s), treble gets upper notes
  // Split point: middle C or the gap between bass and melody
  
  const lowestNote = sortedChord[0];
  const highestNote = sortedChord[sortedChord.length - 1];
  
  // If all notes are in same register (within 1 octave), use middle C as split
  const range = highestNote.pitchMidi - lowestNote.pitchMidi;
  
  if (range <= 12) {
    // Compact chord: split at middle C
    sortedChord.forEach(note => {
      const vexNote = convertToVexNote(note);
      if (note.pitchMidi >= MIDDLE_C_MIDI) {
        vexNote.clef = 'treble';
        trebleNotes.push(vexNote);
      } else {
        vexNote.clef = 'bass';
        bassNotes.push(vexNote);
      }
    });
  } else {
    // Wide-spread chord: use harmonic analysis
    // Bass: lowest 1-2 notes (root and fifth typically)
    // Treble: upper notes (melody and inner voices)
    
    // Find the largest gap in the chord (likely between bass and melody)
    let maxGap = 0;
    let splitIndex = 1; // Default: lowest note to bass, rest to treble
    
    for (let i = 0; i < sortedChord.length - 1; i++) {
      const gap = sortedChord[i + 1].pitchMidi - sortedChord[i].pitchMidi;
      if (gap > maxGap) {
        maxGap = gap;
        splitIndex = i + 1;
      }
    }
    
    // If largest gap is significant (> 5 semitones), use it as split point
    // Otherwise, use middle C as split
    if (maxGap > 5) {
      // Split at the gap
      for (let i = 0; i < sortedChord.length; i++) {
        const note = sortedChord[i];
        const vexNote = convertToVexNote(note);
        
        if (i < splitIndex) {
          vexNote.clef = 'bass';
          bassNotes.push(vexNote);
        } else {
          vexNote.clef = 'treble';
          trebleNotes.push(vexNote);
        }
      }
    } else {
      // Use middle C as split
      sortedChord.forEach(note => {
        const vexNote = convertToVexNote(note);
        if (note.pitchMidi >= MIDDLE_C_MIDI) {
          vexNote.clef = 'treble';
          trebleNotes.push(vexNote);
        } else {
          vexNote.clef = 'bass';
          bassNotes.push(vexNote);
        }
      });
    }
  }
}

/**
 * Converts QuantizedNote to VexFlow Note format
 */
function convertToVexNote(note: QuantizedNote): Note {
  const [duration, isDotted] = beatsToDuration(note.durationBeats);
  
  return {
    key: midiToNoteName(note.pitchMidi),
    duration,
    clef: note.clef,
    velocity: note.velocity,
    accidentals: getAccidental(note.pitchMidi) ? [getAccidental(note.pitchMidi)!] : undefined,
    dotted: isDotted
  };
}
