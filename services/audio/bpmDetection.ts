import { 
  BPM_WINDOW_SIZE_SECONDS, 
  DEFAULT_BPM, 
  MIN_BPM, 
  MAX_BPM 
} from '../../constants/audio';
import { calculateRMS } from './pitchDetection';

export function detectBPM(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  const energies: number[] = [];
  const windowSize = Math.floor(sampleRate * BPM_WINDOW_SIZE_SECONDS);
  
  for (let i = 0; i < channelData.length; i += windowSize) {
    const end = Math.min(i + windowSize, channelData.length);
    const slice = channelData.slice(i, end);
    energies.push(calculateRMS(slice));
  }
  
  const peaks: number[] = [];
  const threshold = energies.reduce((a, b) => a + b, 0) / energies.length * 1.5;
  
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > threshold && 
        energies[i] > energies[i - 1] && 
        energies[i] > energies[i + 1]) {
      peaks.push(i);
    }
  }
  
  if (peaks.length < 2) return DEFAULT_BPM;
  
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }
  
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  const secondsPerBeat = (medianInterval * windowSize) / sampleRate;
  const bpm = Math.round(60 / secondsPerBeat);
  
  return Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
}
