export interface Note {
  key: string; // e.g., "c/4" - can be comma-separated for chords: "c/4,e/4,g/4"
  duration: string; // e.g., "q", "h", "w", "8", "16"
  clef: 'treble' | 'bass';
  velocity?: number; // 0-127, for dynamics
  accidentals?: string[]; // ['#', 'b', 'n'] per note in chord
  tieStart?: boolean; // starts a tie to next note
  tieEnd?: boolean; // ends a tie from previous note
  slurStart?: boolean; // starts a slur phrase
  slurEnd?: boolean; // ends a slur phrase
  staccato?: boolean;
  accent?: boolean;
  isRest?: boolean;
  dotted?: boolean; // dotted note duration
}

export interface Chord {
  notes: Note[]; // notes played simultaneously
  startBeat: number; // beat position within measure
}

export interface Measure {
  trebleNotes: Note[];
  bassNotes: Note[];
  trebleChords?: Chord[]; // grouped notes for proper chord rendering
  bassChords?: Chord[]; // grouped notes for proper chord rendering
}

export interface TranscriptionData {
  title: string;
  artist: string;
  bpm: number;
  timeSignature: string;
  keySignature: string; // e.g., "C", "G", "F", "Bb", "D"
  measures: Measure[];
  dynamics?: DynamicMarking[];
}

export interface DynamicMarking {
  measure: number;
  beat: number;
  type: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'crescendo' | 'diminuendo';
  clef: 'treble' | 'bass';
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  VIEWING = 'VIEWING',
  ERROR = 'ERROR'
}

export interface AudioFile {
  file: File;
  name: string;
  duration?: number;
}

export interface AnalysisProgress {
  stage: 'loading' | 'decoding' | 'analyzing' | 'transcribing';
  progress: number; // 0-100
  message: string;
}

export interface DetectedNote {
  pitch: number; // MIDI note number
  frequency: number; // Hz
  startTime: number; // seconds
  duration: number; // seconds
  velocity: number; // 0-127
}
