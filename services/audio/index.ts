import { TranscriptionData, DetectedNote } from '../../types';
import { 
  FFT_SIZE, 
  HOP_SIZE, 
  MIN_FREQUENCY, 
  MAX_FREQUENCY,
  MIN_NOTE_DURATION,
  MIN_VELOCITY,
  BEATS_PER_MEASURE
} from '../../constants/audio';
import { detectPitchYIN, calculateRMS } from './pitchDetection';
import { detectBPM } from './bpmDetection';
import { frequencyToMidi, notesToMeasures } from './noteConversion';

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  return audioContext.decodeAudioData(arrayBuffer);
}

export async function analyzeAudio(
  audioBuffer: AudioBuffer,
  onProgress?: (progress: number, message: string) => void
): Promise<DetectedNote[]> {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  
  onProgress?.(10, 'Preparing audio data...');
  
  const detectedNotes: DetectedNote[] = [];
  const totalFrames = Math.floor(channelData.length / HOP_SIZE);
  
  onProgress?.(20, 'Analyzing frequencies...');
  
  let currentNote: DetectedNote | null = null;
  
  for (let frame = 0; frame < totalFrames; frame++) {
    const startSample = frame * HOP_SIZE;
    const endSample = Math.min(startSample + FFT_SIZE, channelData.length);
    const frameData = channelData.slice(startSample, endSample);
    
    const dominantFrequency = detectPitchYIN(frameData, sampleRate);
    const currentTime = startSample / sampleRate;
    
    if (dominantFrequency && dominantFrequency >= MIN_FREQUENCY && dominantFrequency <= MAX_FREQUENCY) {
      const midi = frequencyToMidi(dominantFrequency);
      const rms = calculateRMS(frameData);
      const velocity = Math.min(127, Math.floor(rms * 1000));
      
      if (velocity > MIN_VELOCITY) {
        if (currentNote && Math.abs(currentNote.pitch - midi) <= 1) {
          currentNote.duration = currentTime - currentNote.startTime;
        } else {
          if (currentNote && currentNote.duration > MIN_NOTE_DURATION) {
            detectedNotes.push(currentNote);
          }
          currentNote = {
            pitch: midi,
            frequency: dominantFrequency,
            startTime: currentTime,
            duration: HOP_SIZE / sampleRate,
            velocity
          };
        }
      } else if (currentNote) {
        if (currentNote.duration > MIN_NOTE_DURATION) {
          detectedNotes.push(currentNote);
        }
        currentNote = null;
      }
    } else if (currentNote) {
      if (currentNote.duration > MIN_NOTE_DURATION) {
        detectedNotes.push(currentNote);
      }
      currentNote = null;
    }
    
    if (frame % 100 === 0) {
      const progress = 20 + (frame / totalFrames) * 60;
      onProgress?.(progress, `Analyzing frame ${frame}/${totalFrames}...`);
    }
  }
  
  if (currentNote && currentNote.duration > MIN_NOTE_DURATION) {
    detectedNotes.push(currentNote);
  }
  
  onProgress?.(85, 'Post-processing notes...');
  
  return detectedNotes;
}

export async function transcribeAudio(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<TranscriptionData> {
  onProgress?.(5, 'Decoding audio file...');
  const audioBuffer = await decodeAudioFile(file);
  
  onProgress?.(15, 'Detecting tempo...');
  const bpm = detectBPM(audioBuffer);
  
  const detectedNotes = await analyzeAudio(audioBuffer, onProgress);
  
  onProgress?.(90, 'Generating sheet music...');
  const measures = notesToMeasures(detectedNotes, bpm, BEATS_PER_MEASURE);
  
  const fileName = file.name.replace(/\.[^/.]+$/, '');
  
  onProgress?.(100, 'Complete!');
  
  return {
    title: fileName,
    artist: 'Transcribed',
    bpm,
    timeSignature: '4/4',
    keySignature: 'C',
    measures
  };
}

export { detectBPM } from './bpmDetection';
export { detectPitchYIN, calculateRMS } from './pitchDetection';
export { frequencyToMidi, midiToNoteName, midiToClef, durationToVexflow, notesToMeasures } from './noteConversion';
