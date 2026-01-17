import { FFT_SIZE, A4_FREQUENCY, A4_MIDI } from '../../constants/audio';

/**
 * Extracts a 12-bin chromagram from an audio buffer using FFT analysis.
 * 
 * A chromagram represents the energy distribution across the 12 pitch classes
 * of the chromatic scale (C, C#, D, D#, E, F, F#, G, G#, A, A#, B).
 * 
 * @param audioBuffer - The audio buffer to analyze
 * @returns A normalized 12-element array where index 0 = C, 1 = C#, ..., 11 = B
 */
export function extractChromagram(audioBuffer: AudioBuffer): number[] {
  const chromagram = new Array(12).fill(0);
  
  // Create offline audio context for analysis
  const offlineContext = new OfflineAudioContext(
    1,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  
  // Create analyser node
  const analyser = offlineContext.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  
  // Create buffer source
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(analyser);
  analyser.connect(offlineContext.destination);
  
  // Get frequency data
  const frequencyData = new Float32Array(analyser.frequencyBinCount);
  
  // Start playback to trigger analysis
  source.start(0);
  
  // We need to process the audio to get frequency data
  // Since we can't directly get frequency data from offline context,
  // we'll use a different approach: process the audio buffer directly with FFT
  
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Process audio in overlapping windows
  const hopSize = FFT_SIZE / 2;
  const numFrames = Math.floor((channelData.length - FFT_SIZE) / hopSize);
  
  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * hopSize;
    
    // Extract frame data as Float32Array
    const frameData = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i++) {
      frameData[i] = channelData[offset + i];
    }
    
    // Apply Hann window
    const windowedData = applyHannWindow(frameData);
    
    // Compute FFT magnitude spectrum
    const spectrum = computeFFTMagnitude(windowedData, sampleRate);
    
    // Map frequency bins to pitch classes
    for (let bin = 0; bin < spectrum.length; bin++) {
      const frequency = (bin * sampleRate) / FFT_SIZE;
      
      // Skip DC and very low frequencies
      if (frequency < 20) continue;
      
      // Convert frequency to MIDI note number
      const midiNote = frequencyToMidi(frequency);
      
      // Get pitch class (0-11)
      const pitchClass = Math.round(midiNote) % 12;
      
      // Accumulate energy for this pitch class
      chromagram[pitchClass] += spectrum[bin];
    }
  }
  
  // Normalize chromagram to sum to 1
  const sum = chromagram.reduce((acc, val) => acc + val, 0);
  
  if (sum > 0) {
    for (let i = 0; i < 12; i++) {
      chromagram[i] /= sum;
    }
  } else {
    // If silent, return uniform distribution
    chromagram.fill(1 / 12);
  }
  
  return chromagram;
}

/**
 * Applies a Hann window to the input signal
 */
function applyHannWindow(signal: Float32Array): Float32Array {
  const windowed = new Float32Array(signal.length);
  const N = signal.length;
  
  for (let i = 0; i < N; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    windowed[i] = signal[i] * window;
  }
  
  return windowed;
}

/**
 * Computes FFT magnitude spectrum using Cooley-Tukey FFT algorithm
 * O(N log N) complexity
 */
function computeFFTMagnitude(signal: Float32Array, sampleRate: number): Float32Array {
  const N = signal.length;
  
  // Ensure N is a power of 2
  if ((N & (N - 1)) !== 0) {
    throw new Error('FFT size must be a power of 2');
  }
  
  // Perform FFT
  const fft = cooleyTukeyFFT(signal);
  
  // Compute magnitude spectrum (only positive frequencies)
  const halfN = Math.floor(N / 2);
  const magnitude = new Float32Array(halfN);
  
  for (let i = 0; i < halfN; i++) {
    const real = fft[i * 2];
    const imag = fft[i * 2 + 1];
    magnitude[i] = Math.sqrt(real * real + imag * imag);
  }
  
  return magnitude;
}

/**
 * Cooley-Tukey FFT algorithm (radix-2, decimation-in-time)
 * Returns interleaved real and imaginary parts [r0, i0, r1, i1, ...]
 */
function cooleyTukeyFFT(signal: Float32Array): Float32Array {
  const N = signal.length;
  
  // Base case
  if (N === 1) {
    return new Float32Array([signal[0], 0]);
  }
  
  // Divide into even and odd indices
  const halfN = N / 2;
  const even = new Float32Array(halfN);
  const odd = new Float32Array(halfN);
  
  for (let i = 0; i < halfN; i++) {
    even[i] = signal[i * 2];
    odd[i] = signal[i * 2 + 1];
  }
  
  // Recursive FFT on even and odd parts
  const evenFFT = cooleyTukeyFFT(even);
  const oddFFT = cooleyTukeyFFT(odd);
  
  // Combine results
  const result = new Float32Array(N * 2);
  
  for (let k = 0; k < halfN; k++) {
    const angle = -2 * Math.PI * k / N;
    const twiddleReal = Math.cos(angle);
    const twiddleImag = Math.sin(angle);
    
    const oddReal = oddFFT[k * 2];
    const oddImag = oddFFT[k * 2 + 1];
    
    const tReal = twiddleReal * oddReal - twiddleImag * oddImag;
    const tImag = twiddleReal * oddImag + twiddleImag * oddReal;
    
    const evenReal = evenFFT[k * 2];
    const evenImag = evenFFT[k * 2 + 1];
    
    // First half
    result[k * 2] = evenReal + tReal;
    result[k * 2 + 1] = evenImag + tImag;
    
    // Second half
    result[(k + halfN) * 2] = evenReal - tReal;
    result[(k + halfN) * 2 + 1] = evenImag - tImag;
  }
  
  return result;
}

/**
 * Converts frequency (Hz) to MIDI note number
 */
function frequencyToMidi(frequency: number): number {
  return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
}
