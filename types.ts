export interface Note {
  key: string; // e.g., "c/4"
  duration: string; // e.g., "q", "h", "w"
  clef: 'treble' | 'bass';
}

export interface Measure {
  trebleNotes: Note[];
  bassNotes: Note[];
}

export interface TranscriptionData {
  title: string;
  artist: string;
  bpm: number;
  timeSignature: string;
  measures: Measure[];
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
