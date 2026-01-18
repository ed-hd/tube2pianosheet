import { describe, it, expect } from 'vitest';
import { separateVoices } from '../../services/audio/voiceSeparation';
import { QuantizedNote } from '../../services/audio/rhythmQuantizer';

describe('Voice Separation', () => {
  describe('separateVoices', () => {
    it('should separate melody (highest) to treble and bass to bass', () => {
      const notes: QuantizedNote[] = [
        // Melody line (high)
        { pitchMidi: 72, startBeat: 0, durationBeats: 1, clef: 'treble', velocity: 80 },
        { pitchMidi: 74, startBeat: 1, durationBeats: 1, clef: 'treble', velocity: 80 },
        // Bass line (low)
        { pitchMidi: 48, startBeat: 0, durationBeats: 2, clef: 'bass', velocity: 70 },
        { pitchMidi: 50, startBeat: 2, durationBeats: 2, clef: 'bass', velocity: 70 }
      ];

      const result = separateVoices(notes);

      expect(result.treble).toHaveLength(2);
      expect(result.bass).toHaveLength(2);
      
      // Melody notes should be in treble
      expect(result.treble[0].key).toContain('c/5');
      expect(result.treble[1].key).toContain('d/5');
      
      // Bass notes should be in bass
      expect(result.bass[0].key).toContain('c/3');
      expect(result.bass[1].key).toContain('d/3');
    });

    it('should detect bass notes as lowest pitch in chord', () => {
      const notes: QuantizedNote[] = [
        // Chord at beat 0: C major (C3, E4, G4)
        { pitchMidi: 48, startBeat: 0, durationBeats: 4, clef: 'bass', velocity: 80 },
        { pitchMidi: 64, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 75 },
        { pitchMidi: 67, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 75 }
      ];

      const result = separateVoices(notes);

      // Lowest note (C3) should be in bass
      expect(result.bass).toHaveLength(1);
      expect(result.bass[0].key).toContain('c/3');
      
      // Upper notes should be in treble
      expect(result.treble).toHaveLength(2);
    });

    it('should assign melody line to treble based on highest pitch', () => {
      const notes: QuantizedNote[] = [
        // Melody ascending
        { pitchMidi: 60, startBeat: 0, durationBeats: 1, clef: 'treble', velocity: 85 },
        { pitchMidi: 62, startBeat: 1, durationBeats: 1, clef: 'treble', velocity: 85 },
        { pitchMidi: 64, startBeat: 2, durationBeats: 1, clef: 'treble', velocity: 85 },
        { pitchMidi: 65, startBeat: 3, durationBeats: 1, clef: 'treble', velocity: 85 },
        // Accompaniment (lower)
        { pitchMidi: 48, startBeat: 0, durationBeats: 4, clef: 'bass', velocity: 70 }
      ];

      const result = separateVoices(notes);

      // Melody should be in treble
      expect(result.treble).toHaveLength(4);
      expect(result.treble[0].key).toContain('c/4');
      expect(result.treble[3].key).toContain('f/4');
      
      // Bass should have accompaniment
      expect(result.bass).toHaveLength(1);
      expect(result.bass[0].key).toContain('c/3');
    });

    it('should handle middle register notes (around middle C)', () => {
      const notes: QuantizedNote[] = [
        // Notes around middle C (MIDI 60)
        { pitchMidi: 59, startBeat: 0, durationBeats: 1, clef: 'bass', velocity: 80 },
        { pitchMidi: 60, startBeat: 1, durationBeats: 1, clef: 'treble', velocity: 80 },
        { pitchMidi: 61, startBeat: 2, durationBeats: 1, clef: 'treble', velocity: 80 }
      ];

      const result = separateVoices(notes);

      // Below middle C → bass
      expect(result.bass).toHaveLength(1);
      expect(result.bass[0].key).toContain('b/3');
      
      // Middle C and above → treble
      expect(result.treble).toHaveLength(2);
      expect(result.treble[0].key).toContain('c/4');
      expect(result.treble[1].key).toContain('c#/4');
    });

    it('should recognize alberti bass pattern in left hand', () => {
      const notes: QuantizedNote[] = [
        // Alberti bass: C-G-E-G pattern (broken chord)
        { pitchMidi: 48, startBeat: 0, durationBeats: 0.5, clef: 'bass', velocity: 70 },
        { pitchMidi: 55, startBeat: 0.5, durationBeats: 0.5, clef: 'bass', velocity: 70 },
        { pitchMidi: 52, startBeat: 1, durationBeats: 0.5, clef: 'bass', velocity: 70 },
        { pitchMidi: 55, startBeat: 1.5, durationBeats: 0.5, clef: 'bass', velocity: 70 },
        // Melody
        { pitchMidi: 72, startBeat: 0, durationBeats: 2, clef: 'treble', velocity: 85 }
      ];

      const result = separateVoices(notes);

      // Alberti bass should be in bass clef
      expect(result.bass).toHaveLength(4);
      expect(result.bass[0].key).toContain('c/3');
      
      // Melody in treble
      expect(result.treble).toHaveLength(1);
      expect(result.treble[0].key).toContain('c/5');
    });

    it('should handle chords in both hands', () => {
      const notes: QuantizedNote[] = [
        // Left hand chord (C major)
        { pitchMidi: 48, startBeat: 0, durationBeats: 4, clef: 'bass', velocity: 75 },
        { pitchMidi: 52, startBeat: 0, durationBeats: 4, clef: 'bass', velocity: 75 },
        { pitchMidi: 55, startBeat: 0, durationBeats: 4, clef: 'bass', velocity: 75 },
        // Right hand chord (E minor)
        { pitchMidi: 64, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 80 },
        { pitchMidi: 67, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 80 },
        { pitchMidi: 71, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 80 }
      ];

      const result = separateVoices(notes);

      // Bass clef should have lower chord
      expect(result.bass).toHaveLength(3);
      expect(result.bass.every(n => n.clef === 'bass')).toBe(true);
      
      // Treble clef should have upper chord
      expect(result.treble).toHaveLength(3);
      expect(result.treble.every(n => n.clef === 'treble')).toBe(true);
    });

    it('should handle empty input', () => {
      const result = separateVoices([]);
      
      expect(result.treble).toHaveLength(0);
      expect(result.bass).toHaveLength(0);
    });

    it('should handle single note', () => {
      const notes: QuantizedNote[] = [
        { pitchMidi: 60, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 80 }
      ];

      const result = separateVoices(notes);

      // Middle C should go to treble
      expect(result.treble).toHaveLength(1);
      expect(result.treble[0].key).toContain('c/4');
      expect(result.bass).toHaveLength(0);
    });

    it('should preserve note properties (velocity, duration)', () => {
      const notes: QuantizedNote[] = [
        { pitchMidi: 72, startBeat: 0, durationBeats: 1.5, clef: 'treble', velocity: 100 },
        { pitchMidi: 48, startBeat: 0, durationBeats: 2, clef: 'bass', velocity: 50 }
      ];

      const result = separateVoices(notes);

      // Check treble note properties
      expect(result.treble[0].velocity).toBe(100);
      expect(result.treble[0].duration).toBe('q'); // quarter note (dotted flag separate)
      expect(result.treble[0].dotted).toBe(true);
      
      // Check bass note properties
      expect(result.bass[0].velocity).toBe(50);
      expect(result.bass[0].duration).toBe('h'); // half note
    });

    it('should assign correct clef based on pitch range', () => {
      const notes: QuantizedNote[] = [
        { pitchMidi: 36, startBeat: 0, durationBeats: 1, clef: 'bass', velocity: 80 }, // C2
        { pitchMidi: 48, startBeat: 1, durationBeats: 1, clef: 'bass', velocity: 80 }, // C3
        { pitchMidi: 60, startBeat: 2, durationBeats: 1, clef: 'treble', velocity: 80 }, // C4 (middle C)
        { pitchMidi: 72, startBeat: 3, durationBeats: 1, clef: 'treble', velocity: 80 }, // C5
        { pitchMidi: 84, startBeat: 4, durationBeats: 1, clef: 'treble', velocity: 80 }  // C6
      ];

      const result = separateVoices(notes);

      // Low notes → bass
      expect(result.bass).toHaveLength(2);
      expect(result.bass.every(n => n.clef === 'bass')).toBe(true);
      
      // Middle C and above → treble
      expect(result.treble).toHaveLength(3);
      expect(result.treble.every(n => n.clef === 'treble')).toBe(true);
    });

    it('should handle simultaneous notes at same start time', () => {
      const notes: QuantizedNote[] = [
        // Three notes starting at beat 0 (chord)
        { pitchMidi: 48, startBeat: 0, durationBeats: 4, clef: 'bass', velocity: 80 },
        { pitchMidi: 60, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 80 },
        { pitchMidi: 67, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 80 }
      ];

      const result = separateVoices(notes);

      // Lowest note → bass
      expect(result.bass).toHaveLength(1);
      expect(result.bass[0].key).toContain('c/3');
      
      // Upper notes → treble
      expect(result.treble).toHaveLength(2);
    });

    it('should detect walking bass line in bass clef', () => {
      const notes: QuantizedNote[] = [
        // Walking bass (stepwise motion in low register)
        { pitchMidi: 48, startBeat: 0, durationBeats: 1, clef: 'bass', velocity: 75 },
        { pitchMidi: 50, startBeat: 1, durationBeats: 1, clef: 'bass', velocity: 75 },
        { pitchMidi: 52, startBeat: 2, durationBeats: 1, clef: 'bass', velocity: 75 },
        { pitchMidi: 53, startBeat: 3, durationBeats: 1, clef: 'bass', velocity: 75 },
        // Melody
        { pitchMidi: 72, startBeat: 0, durationBeats: 4, clef: 'treble', velocity: 85 }
      ];

      const result = separateVoices(notes);

      // Walking bass → bass clef
      expect(result.bass).toHaveLength(4);
      expect(result.bass.every(n => n.clef === 'bass')).toBe(true);
      
      // Melody → treble
      expect(result.treble).toHaveLength(1);
      expect(result.treble[0].clef).toBe('treble');
    });
  });
});
