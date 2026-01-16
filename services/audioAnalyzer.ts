import { TranscriptionData, DetectedNote, Measure, Note } from '../types';

const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const A4_FREQUENCY = 440;
const A4_MIDI = 69;

function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI);
}

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}/${octave}`;
}

function midiToClef(midi: number): 'treble' | 'bass' {
  return midi >= 60 ? 'treble' : 'bass';
}

function durationToVexflow(durationSeconds: number, bpm: number): string {
  const beatsPerSecond = bpm / 60;
  const beats = durationSeconds * beatsPerSecond;
  
  if (beats >= 3.5) return 'w';
  if (beats >= 1.75) return 'h';
  if (beats >= 0.875) return 'q';
  if (beats >= 0.4375) return '8';
  return '16';
}

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
  
  const fftSize = 4096;
  const hopSize = 2048;
  const detectedNotes: DetectedNote[] = [];
  
  const offlineContext = new OfflineAudioContext(1, channelData.length, sampleRate);
  const source = offlineContext.createBufferSource();
  const analyser = offlineContext.createAnalyser();
  
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0;
  
  const buffer = offlineContext.createBuffer(1, channelData.length, sampleRate);
  buffer.copyToChannel(channelData, 0);
  source.buffer = buffer;
  source.connect(analyser);
  analyser.connect(offlineContext.destination);
  
  onProgress?.(20, 'Analyzing frequencies...');
  
  const frequencyData = new Float32Array(analyser.frequencyBinCount);
  const totalFrames = Math.floor(channelData.length / hopSize);
  
  let currentNote: DetectedNote | null = null;
  const minFrequency = 65; // C2
  const maxFrequency = 2093; // C7
  
  for (let frame = 0; frame < totalFrames; frame++) {
    const startSample = frame * hopSize;
    const endSample = Math.min(startSample + fftSize, channelData.length);
    const frameData = channelData.slice(startSample, endSample);
    
    const dominantFrequency = detectPitchYIN(frameData, sampleRate);
    const currentTime = startSample / sampleRate;
    
    if (dominantFrequency && dominantFrequency >= minFrequency && dominantFrequency <= maxFrequency) {
      const midi = frequencyToMidi(dominantFrequency);
      const rms = calculateRMS(frameData);
      const velocity = Math.min(127, Math.floor(rms * 1000));
      
      if (velocity > 10) {
        if (currentNote && Math.abs(currentNote.pitch - midi) <= 1) {
          currentNote.duration = currentTime - currentNote.startTime;
        } else {
          if (currentNote && currentNote.duration > 0.05) {
            detectedNotes.push(currentNote);
          }
          currentNote = {
            pitch: midi,
            frequency: dominantFrequency,
            startTime: currentTime,
            duration: hopSize / sampleRate,
            velocity
          };
        }
      } else if (currentNote) {
        if (currentNote.duration > 0.05) {
          detectedNotes.push(currentNote);
        }
        currentNote = null;
      }
    } else if (currentNote) {
      if (currentNote.duration > 0.05) {
        detectedNotes.push(currentNote);
      }
      currentNote = null;
    }
    
    if (frame % 100 === 0) {
      const progress = 20 + (frame / totalFrames) * 60;
      onProgress?.(progress, `Analyzing frame ${frame}/${totalFrames}...`);
    }
  }
  
  if (currentNote && currentNote.duration > 0.05) {
    detectedNotes.push(currentNote);
  }
  
  onProgress?.(85, 'Post-processing notes...');
  
  return detectedNotes;
}

function detectPitchYIN(buffer: Float32Array, sampleRate: number): number | null {
  const threshold = 0.15;
  const bufferSize = buffer.length;
  const halfBufferSize = Math.floor(bufferSize / 2);
  
  const yinBuffer = new Float32Array(halfBufferSize);
  
  for (let tau = 0; tau < halfBufferSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfBufferSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }
  
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfBufferSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }
  
  let tau = 2;
  while (tau < halfBufferSize) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < halfBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      break;
    }
    tau++;
  }
  
  if (tau === halfBufferSize || yinBuffer[tau] >= threshold) {
    return null;
  }
  
  let betterTau: number;
  const x0 = tau < 1 ? tau : tau - 1;
  const x2 = tau + 1 < halfBufferSize ? tau + 1 : tau;
  
  if (x0 === tau) {
    betterTau = yinBuffer[tau] <= yinBuffer[x2] ? tau : x2;
  } else if (x2 === tau) {
    betterTau = yinBuffer[tau] <= yinBuffer[x0] ? tau : x0;
  } else {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tau];
    const s2 = yinBuffer[x2];
    betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }
  
  return sampleRate / betterTau;
}

function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

export function detectBPM(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  const energies: number[] = [];
  const windowSize = Math.floor(sampleRate * 0.01);
  
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
  
  if (peaks.length < 2) return 120;
  
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }
  
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  const secondsPerBeat = (medianInterval * windowSize) / sampleRate;
  const bpm = Math.round(60 / secondsPerBeat);
  
  return Math.max(60, Math.min(200, bpm));
}

export function notesToMeasures(
  notes: DetectedNote[],
  bpm: number,
  beatsPerMeasure: number = 4
): Measure[] {
  if (notes.length === 0) return [];
  
  const secondsPerMeasure = (60 / bpm) * beatsPerMeasure;
  const measures: Measure[] = [];
  
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
  const totalDuration = sortedNotes[sortedNotes.length - 1].startTime + 
                        sortedNotes[sortedNotes.length - 1].duration;
  const measureCount = Math.ceil(totalDuration / secondsPerMeasure);
  
  for (let i = 0; i < measureCount; i++) {
    const measureStart = i * secondsPerMeasure;
    const measureEnd = (i + 1) * secondsPerMeasure;
    
    const measureNotes = sortedNotes.filter(
      n => n.startTime >= measureStart && n.startTime < measureEnd
    );
    
    const trebleNotes: Note[] = [];
    const bassNotes: Note[] = [];
    
    measureNotes.forEach(note => {
      const vexNote: Note = {
        key: midiToNoteName(note.pitch),
        duration: durationToVexflow(note.duration, bpm),
        clef: midiToClef(note.pitch)
      };
      
      if (vexNote.clef === 'treble') {
        trebleNotes.push(vexNote);
      } else {
        bassNotes.push(vexNote);
      }
    });
    
    if (trebleNotes.length === 0) {
      trebleNotes.push({ key: 'b/4', duration: 'wr', clef: 'treble' });
    }
    if (bassNotes.length === 0) {
      bassNotes.push({ key: 'd/3', duration: 'wr', clef: 'bass' });
    }
    
    measures.push({ trebleNotes, bassNotes });
  }
  
  return measures.slice(0, 16);
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
  const measures = notesToMeasures(detectedNotes, bpm, 4);
  
  const fileName = file.name.replace(/\.[^/.]+$/, '');
  
  onProgress?.(100, 'Complete!');
  
  return {
    title: fileName,
    artist: 'Transcribed',
    bpm,
    timeSignature: '4/4',
    measures
  };
}
