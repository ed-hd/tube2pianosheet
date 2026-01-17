// Use Magenta Onsets and Frames for high-quality polyphonic transcription
export { transcribeAudioWithMagenta as transcribeAudio } from './audio/magentaTranscriber';

// Legacy exports (kept for compatibility)
export { 
  decodeAudioFile, 
  analyzeAudio,
  detectBPM,
  detectPitchYIN,
  calculateRMS,
  frequencyToMidi,
  midiToNoteName,
  midiToClef,
  durationToVexflow,
  notesToMeasures
} from './audio';
