import { describe, it, expect } from 'vitest';
import { detectKey } from '../../services/audio/keyDetection';

describe('Key Detection (Krumhansl-Schmuckler)', () => {
  it('should return key, mode, and confidence', () => {
    const chromagram = [0.1, 0.05, 0.08, 0.15, 0.1, 0.12, 0.05, 0.1, 0.08, 0.07, 0.05, 0.05];
    const result = detectKey(chromagram);
    
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('mode');
    expect(result).toHaveProperty('confidence');
    expect(['major', 'minor']).toContain(result.mode);
  });

  it('should detect C major for C major chromagram', () => {
    // C major: strong C, E, G (indices 0, 4, 7)
    const chromagram = [0.3, 0.02, 0.1, 0.02, 0.25, 0.05, 0.02, 0.2, 0.02, 0.02, 0.02, 0.02];
    const result = detectKey(chromagram);
    
    expect(result.key).toBe('C');
    expect(result.mode).toBe('major');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect A minor for A minor chromagram', () => {
    // A minor: strong A, C, E (indices 9, 0, 4)
    const chromagram = [0.25, 0.02, 0.05, 0.02, 0.25, 0.05, 0.02, 0.05, 0.02, 0.3, 0.02, 0.02];
    const result = detectKey(chromagram);
    
    expect(result.key).toBe('A');
    expect(result.mode).toBe('minor');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect G major for G major chromagram', () => {
    // G major: strong G, B, D (indices 7, 11, 2)
    const chromagram = [0.05, 0.02, 0.25, 0.02, 0.05, 0.05, 0.02, 0.3, 0.02, 0.05, 0.02, 0.2];
    const result = detectKey(chromagram);
    
    expect(result.key).toBe('G');
    expect(result.mode).toBe('major');
  });

  it('should detect E minor for E minor chromagram', () => {
    // E minor: strong E, G, B (indices 4, 7, 11)
    const chromagram = [0.05, 0.02, 0.05, 0.02, 0.3, 0.05, 0.02, 0.25, 0.02, 0.05, 0.02, 0.25];
    const result = detectKey(chromagram);
    
    expect(result.key).toBe('E');
    expect(result.mode).toBe('minor');
  });

  it('should detect Eb minor (ground truth test)', () => {
    // Eb minor: strong Eb, Gb, Bb (indices 3, 6, 10)
    const chromagram = [0.05, 0.02, 0.05, 0.3, 0.05, 0.05, 0.25, 0.05, 0.02, 0.05, 0.2, 0.02];
    const result = detectKey(chromagram);
    
    expect(result.key).toBe('Eb');
    expect(result.mode).toBe('minor');
  });

  it('should support all 12 major keys', () => {
    const majorKeys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    majorKeys.forEach((key, offset) => {
      // Create chromagram with strong tonic, third, fifth
      const chromagram = new Array(12).fill(0.02);
      chromagram[offset] = 0.3; // Tonic
      chromagram[(offset + 4) % 12] = 0.25; // Major third
      chromagram[(offset + 7) % 12] = 0.2; // Fifth
      
      const result = detectKey(chromagram);
      expect(result.key).toBe(key);
      expect(result.mode).toBe('major');
    });
  });

  it('should support all 12 minor keys', () => {
    const minorKeys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    minorKeys.forEach((key, offset) => {
      // Create chromagram with strong tonic, minor third, fifth
      const chromagram = new Array(12).fill(0.02);
      chromagram[offset] = 0.3; // Tonic
      chromagram[(offset + 3) % 12] = 0.25; // Minor third
      chromagram[(offset + 7) % 12] = 0.2; // Fifth
      
      const result = detectKey(chromagram);
      expect(result.key).toBe(key);
      expect(result.mode).toBe('minor');
    });
  });

  it('should handle uniform chromagram', () => {
    const chromagram = new Array(12).fill(1/12);
    const result = detectKey(chromagram);
    
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('mode');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should handle zero chromagram', () => {
    const chromagram = new Array(12).fill(0);
    const result = detectKey(chromagram);
    
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('mode');
  });

  it('should return confidence between 0 and 1', () => {
    const chromagram = [0.3, 0.02, 0.1, 0.02, 0.25, 0.05, 0.02, 0.2, 0.02, 0.02, 0.02, 0.02];
    const result = detectKey(chromagram);
    
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
