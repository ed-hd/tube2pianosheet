import { describe, it, expect } from 'vitest';
import { quantizeNotesViterbi } from '../../services/audio/rhythmQuantizer';
import { DetectedNote } from '../../types';

describe('Viterbi Rhythm Quantizer', () => {
  describe('quantizeNotesViterbi', () => {
    it('should quantize to 16th note grid', () => {
      const bpm = 120;
      const beatsPerSecond = bpm / 60; // 2 beats/sec
      const sixteenthNoteDuration = 0.25 / beatsPerSecond; // 0.125 sec

      const notes: DetectedNote[] = [
        {
          pitch: 60,
          frequency: 261.63,
          startTime: 0.0,
          duration: sixteenthNoteDuration,
          velocity: 80
        },
        {
          pitch: 62,
          frequency: 293.66,
          startTime: sixteenthNoteDuration + 0.01, // slightly off grid
          duration: sixteenthNoteDuration,
          velocity: 75
        }
      ];

      const result = quantizeNotesViterbi(notes, bpm);

      expect(result).toHaveLength(2);
      expect(result[0].durationBeats).toBe(0.25); // 16th note
      expect(result[1].durationBeats).toBe(0.25); // 16th note
      
      // Start times should be quantized to 16th note grid
      expect(result[0].startBeat).toBe(0);
      expect(result[1].startBeat).toBeCloseTo(0.25, 2);
    });

    it('should handle dotted quarter notes', () => {
      const bpm = 120;
      const beatsPerSecond = bpm / 60;
      const dottedQuarterDuration = 1.5 / beatsPerSecond; // 0.75 sec

      const notes: DetectedNote[] = [
        {
          pitch: 64,
          frequency: 329.63,
          startTime: 0.0,
          duration: dottedQuarterDuration,
          velocity: 90
        }
      ];

      const result = quantizeNotesViterbi(notes, bpm);

      expect(result).toHaveLength(1);
      expect(result[0].durationBeats).toBe(1.5); // dotted quarter
    });

    it('should handle dotted half notes', () => {
      const bpm = 120;
      const beatsPerSecond = bpm / 60;
      const dottedHalfDuration = 3.0 / beatsPerSecond; // 1.5 sec

      const notes: DetectedNote[] = [
        {
          pitch: 67,
          frequency: 392.0,
          startTime: 0.0,
          duration: dottedHalfDuration,
          velocity: 85
        }
      ];

      const result = quantizeNotesViterbi(notes, bpm);

      expect(result).toHaveLength(1);
      expect(result[0].durationBeats).toBe(3.0); // dotted half
    });

    it('should handle dotted eighth notes', () => {
      const bpm = 120;
      const beatsPerSecond = bpm / 60;
      const dottedEighthDuration = 0.75 / beatsPerSecond; // 0.375 sec

      const notes: DetectedNote[] = [
        {
          pitch: 69,
          frequency: 440.0,
          startTime: 0.0,
          duration: dottedEighthDuration,
          velocity: 70
        }
      ];

      const result = quantizeNotesViterbi(notes, bpm);

      expect(result).toHaveLength(1);
      expect(result[0].durationBeats).toBe(0.75); // dotted eighth
    });

    it('should convert BPM correctly for different tempos', () => {
      const notes: DetectedNote[] = [
        {
          pitch: 60,
          frequency: 261.63,
          startTime: 0.0,
          duration: 0.5, // 0.5 seconds
          velocity: 80
        }
      ];

      // At 60 BPM, 0.5 sec = 0.5 beats (eighth note)
      const result60 = quantizeNotesViterbi(notes, 60);
      expect(result60[0].durationBeats).toBe(0.5);

      // At 120 BPM, 0.5 sec = 1 beat (quarter note)
      const result120 = quantizeNotesViterbi(notes, 120);
      expect(result120[0].durationBeats).toBe(1.0);
    });

    it('should preserve velocity information', () => {
      const notes: DetectedNote[] = [
        {
          pitch: 60,
          frequency: 261.63,
          startTime: 0.0,
          duration: 0.25,
          velocity: 100
        },
        {
          pitch: 62,
          frequency: 293.66,
          startTime: 0.5,
          duration: 0.25,
          velocity: 50
        }
      ];

      const result = quantizeNotesViterbi(notes, 120);

      expect(result[0].velocity).toBe(100);
      expect(result[1].velocity).toBe(50);
    });

    it('should assign correct clef based on pitch', () => {
      const notes: DetectedNote[] = [
        {
          pitch: 48, // C3 - bass clef
          frequency: 130.81,
          startTime: 0.0,
          duration: 0.5,
          velocity: 80
        },
        {
          pitch: 72, // C5 - treble clef
          frequency: 523.25,
          startTime: 0.5,
          duration: 0.5,
          velocity: 80
        }
      ];

      const result = quantizeNotesViterbi(notes, 120);

      expect(result[0].clef).toBe('bass');
      expect(result[1].clef).toBe('treble');
    });

    it('should handle sequence of notes with Viterbi optimization', () => {
      const bpm = 120;
      const beatsPerSecond = bpm / 60;

      // Create a sequence that should be optimized by Viterbi
      // (quarter, quarter, half pattern)
      const notes: DetectedNote[] = [
        {
          pitch: 60,
          frequency: 261.63,
          startTime: 0.0,
          duration: 0.48 / beatsPerSecond, // ~quarter note with noise
          velocity: 80
        },
        {
          pitch: 62,
          frequency: 293.66,
          startTime: 0.52 / beatsPerSecond,
          duration: 0.51 / beatsPerSecond, // ~quarter note with noise
          velocity: 75
        },
        {
          pitch: 64,
          frequency: 329.63,
          startTime: 1.03 / beatsPerSecond,
          duration: 1.95 / beatsPerSecond, // ~half note with noise
          velocity: 85
        }
      ];

      const result = quantizeNotesViterbi(notes, bpm);

      expect(result).toHaveLength(3);
      // Viterbi should clean up the noisy durations
      expect(result[0].durationBeats).toBe(0.5); // eighth or quarter
      expect(result[1].durationBeats).toBe(0.5); // eighth or quarter
      expect(result[2].durationBeats).toBeGreaterThanOrEqual(1.0); // at least quarter
    });

    it('should handle empty note array', () => {
      const result = quantizeNotesViterbi([], 120);
      expect(result).toHaveLength(0);
    });

    it('should handle single note', () => {
      const notes: DetectedNote[] = [
        {
          pitch: 60,
          frequency: 261.63,
          startTime: 0.0,
          duration: 0.5,
          velocity: 80
        }
      ];

      const result = quantizeNotesViterbi(notes, 120);

      expect(result).toHaveLength(1);
      expect(result[0].pitchMidi).toBe(60);
      expect(result[0].startBeat).toBe(0);
    });
  });
});
