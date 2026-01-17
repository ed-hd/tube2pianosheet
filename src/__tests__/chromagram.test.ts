import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractChromagram } from '../../services/audio/chromagram';

// Mock AudioContext for Node.js test environment
class MockAudioContext {
  sampleRate = 44100;
  
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    // Create channel data arrays that persist
    const channelDataArrays: Float32Array[] = [];
    for (let i = 0; i < channels; i++) {
      channelDataArrays.push(new Float32Array(length));
    }
    
    const buffer = {
      length,
      sampleRate,
      numberOfChannels: channels,
      duration: length / sampleRate,
      getChannelData: (channel: number) => channelDataArrays[channel],
      copyFromChannel: () => {},
      copyToChannel: () => {}
    };
    return buffer as AudioBuffer;
  }
}

// Mock OfflineAudioContext
class MockOfflineAudioContext {
  sampleRate = 44100;
  destination = {};
  
  constructor(channels: number, length: number, sampleRate: number) {
    this.sampleRate = sampleRate;
  }
  
  createAnalyser() {
    return {
      fftSize: 4096,
      frequencyBinCount: 2048,
      connect: () => {}
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {}
    };
  }
}

// @ts-ignore - Mock global AudioContext
global.AudioContext = MockAudioContext as any;
// @ts-ignore - Mock global OfflineAudioContext
global.OfflineAudioContext = MockOfflineAudioContext as any;

describe('Chromagram Extraction', () => {
  let audioContext: MockAudioContext;

  beforeEach(() => {
    audioContext = new MockAudioContext();
  });

  it('should return an array with 12 elements', () => {
    const audioBuffer = audioContext.createBuffer(1, 44100, 44100);
    const chromagram = extractChromagram(audioBuffer);
    
    expect(chromagram).toHaveLength(12);
  });

  it('should return all non-negative values', () => {
    const audioBuffer = audioContext.createBuffer(1, 44100, 44100);
    const chromagram = extractChromagram(audioBuffer);
    
    chromagram.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  it('should return normalized values (sum equals 1)', () => {
    const audioBuffer = audioContext.createBuffer(1, 44100, 44100);
    const channelData = audioBuffer.getChannelData(0);
    
    // Generate a simple sine wave at A4 (440 Hz)
    const frequency = 440;
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / audioBuffer.sampleRate);
    }
    
    const chromagram = extractChromagram(audioBuffer);
    const sum = chromagram.reduce((acc, val) => acc + val, 0);
    
    expect(sum).toBeCloseTo(1, 5);
  });

  it('should detect dominant pitch class for pure tone', () => {
    const audioBuffer = audioContext.createBuffer(1, 44100, 44100);
    const channelData = audioBuffer.getChannelData(0);
    
    // Generate A4 (440 Hz) - should map to pitch class A (index 9)
    const frequency = 440;
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / audioBuffer.sampleRate);
    }
    
    const chromagram = extractChromagram(audioBuffer);
    const maxIndex = chromagram.indexOf(Math.max(...chromagram));
    
    // A is at index 9 in chromatic scale (C=0, C#=1, ..., A=9, A#=10, B=11)
    expect(maxIndex).toBe(9);
  });

  it('should handle silent audio buffer', () => {
    const audioBuffer = audioContext.createBuffer(1, 44100, 44100);
    // Channel data is already zeros by default
    
    const chromagram = extractChromagram(audioBuffer);
    
    expect(chromagram).toHaveLength(12);
    chromagram.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle multi-channel audio (use first channel)', () => {
    const audioBuffer = audioContext.createBuffer(2, 44100, 44100);
    const channelData = audioBuffer.getChannelData(0);
    
    // Add signal to first channel only
    const frequency = 440;
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / audioBuffer.sampleRate);
    }
    
    const chromagram = extractChromagram(audioBuffer);
    
    expect(chromagram).toHaveLength(12);
    const sum = chromagram.reduce((acc, val) => acc + val, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});
