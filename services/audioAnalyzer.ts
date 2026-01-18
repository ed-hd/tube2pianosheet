// Use Basic Pitch for polyphonic transcription (Magenta models no longer available - 404)
export { transcribeAudioWithBasicPitch as transcribeAudio } from './audio/legacy/basicPitchAnalyzer';

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
