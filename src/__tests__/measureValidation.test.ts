import { describe, it, expect } from 'vitest';
import { validateMeasureBeats, fixMeasureBeats, calculateMeasureBeats } from '../../services/audio/rhythmQuantizer';
import { Measure, Note } from '../../types';

describe('Measure Beat Validation', () => {
  describe('calculateMeasureBeats', () => {
    it('should calculate total beats for quarter notes', () => {
      const notes: Note[] = [
        { key: 'c/4', duration: 'q', clef: 'treble' },
        { key: 'd/4', duration: 'q', clef: 'treble' },
        { key: 'e/4', duration: 'q', clef: 'treble' },
        { key: 'f/4', duration: 'q', clef: 'treble' }
      ];
      expect(calculateMeasureBeats(notes)).toBe(4);
    });

    it('should calculate total beats for mixed durations', () => {
      const notes: Note[] = [
        { key: 'c/4', duration: 'h', clef: 'treble' }, // 2 beats
        { key: 'd/4', duration: 'q', clef: 'treble' }, // 1 beat
        { key: 'e/4', duration: 'q', clef: 'treble' }  // 1 beat
      ];
      expect(calculateMeasureBeats(notes)).toBe(4);
    });

    it('should handle dotted notes', () => {
      const notes: Note[] = [
        { key: 'c/4', duration: 'q', clef: 'treble', dotted: true }, // 1.5 beats
        { key: 'd/4', duration: '8', clef: 'treble' }, // 0.5 beats
        { key: 'e/4', duration: 'h', clef: 'treble' }  // 2 beats
      ];
      expect(calculateMeasureBeats(notes)).toBe(4);
    });

    it('should handle whole notes', () => {
      const notes: Note[] = [
        { key: 'c/4', duration: 'w', clef: 'treble' }
      ];
      expect(calculateMeasureBeats(notes)).toBe(4);
    });

    it('should handle rests', () => {
      const notes: Note[] = [
        { key: 'c/4', duration: 'q', clef: 'treble' },
        { key: 'b/4', duration: 'qr', clef: 'treble', isRest: true },
        { key: 'd/4', duration: 'h', clef: 'treble' }
      ];
      expect(calculateMeasureBeats(notes)).toBe(4);
    });

    it('should return 0 for empty note array', () => {
      expect(calculateMeasureBeats([])).toBe(0);
    });
  });

  describe('validateMeasureBeats', () => {
    it('should validate correct 4-beat measure', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'q', clef: 'treble' },
          { key: 'd/4', duration: 'q', clef: 'treble' },
          { key: 'e/4', duration: 'q', clef: 'treble' },
          { key: 'f/4', duration: 'q', clef: 'treble' }
        ],
        bassNotes: [
          { key: 'c/3', duration: 'h', clef: 'bass' },
          { key: 'g/2', duration: 'h', clef: 'bass' }
        ]
      };
      expect(validateMeasureBeats(measure)).toBe(true);
    });

    it('should reject measure with too many beats in treble', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'w', clef: 'treble' },
          { key: 'd/4', duration: 'q', clef: 'treble' } // 5 beats total
        ],
        bassNotes: [
          { key: 'c/3', duration: 'w', clef: 'bass' }
        ]
      };
      expect(validateMeasureBeats(measure)).toBe(false);
    });

    it('should reject measure with too few beats in bass', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'w', clef: 'treble' }
        ],
        bassNotes: [
          { key: 'c/3', duration: 'h', clef: 'bass' } // 2 beats only
        ]
      };
      expect(validateMeasureBeats(measure)).toBe(false);
    });

    it('should validate measure with whole rest', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'w', clef: 'treble' }
        ],
        bassNotes: [
          { key: 'b/4', duration: 'wr', clef: 'bass', isRest: true }
        ]
      };
      expect(validateMeasureBeats(measure)).toBe(true);
    });
  });

  describe('fixMeasureBeats', () => {
    it('should not modify valid measure', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'q', clef: 'treble' },
          { key: 'd/4', duration: 'q', clef: 'treble' },
          { key: 'e/4', duration: 'q', clef: 'treble' },
          { key: 'f/4', duration: 'q', clef: 'treble' }
        ],
        bassNotes: [
          { key: 'c/3', duration: 'w', clef: 'bass' }
        ]
      };
      const fixed = fixMeasureBeats(measure);
      expect(fixed.trebleNotes).toHaveLength(4);
      expect(fixed.bassNotes).toHaveLength(1);
      expect(validateMeasureBeats(fixed)).toBe(true);
    });

    it('should add rest when measure has too few beats', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'h', clef: 'treble' } // 2 beats
        ],
        bassNotes: [
          { key: 'c/3', duration: 'w', clef: 'bass' }
        ]
      };
      const fixed = fixMeasureBeats(measure);
      expect(calculateMeasureBeats(fixed.trebleNotes)).toBe(4);
      expect(fixed.trebleNotes.some(n => n.isRest)).toBe(true);
      expect(validateMeasureBeats(fixed)).toBe(true);
    });

    it('should split note with tie when measure has too many beats', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'h', clef: 'treble' }, // 2 beats
          { key: 'd/4', duration: 'q', clef: 'treble' }, // 1 beat
          { key: 'e/4', duration: 'h', clef: 'treble' }  // 2 beats, total 5 (1 beat overflow)
        ],
        bassNotes: [
          { key: 'c/3', duration: 'w', clef: 'bass' }
        ]
      };
      const fixed = fixMeasureBeats(measure);
      expect(calculateMeasureBeats(fixed.trebleNotes)).toBe(4);
      
      // Should have tie marker on split note (last note split to fit 1 beat)
      const tieStartNote = fixed.trebleNotes.find(n => n.tieStart);
      expect(tieStartNote).toBeDefined();
      expect(tieStartNote?.key).toBe('e/4');
      expect(tieStartNote?.duration).toBe('q'); // Split to quarter note (1 beat)
      expect(validateMeasureBeats(fixed)).toBe(true);
    });

    it('should handle multiple notes exceeding measure', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'q', clef: 'treble' },
          { key: 'd/4', duration: 'q', clef: 'treble' },
          { key: 'e/4', duration: 'q', clef: 'treble' },
          { key: 'f/4', duration: 'q', clef: 'treble' },
          { key: 'g/4', duration: 'q', clef: 'treble' } // 5 beats total
        ],
        bassNotes: [
          { key: 'c/3', duration: 'w', clef: 'bass' }
        ]
      };
      const fixed = fixMeasureBeats(measure);
      expect(calculateMeasureBeats(fixed.trebleNotes)).toBe(4);
      expect(validateMeasureBeats(fixed)).toBe(true);
    });

    it('should fix both treble and bass clefs independently', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'h', clef: 'treble' } // 2 beats
        ],
        bassNotes: [
          { key: 'c/3', duration: 'w', clef: 'bass' },
          { key: 'g/2', duration: 'q', clef: 'bass' } // 5 beats
        ]
      };
      const fixed = fixMeasureBeats(measure);
      expect(calculateMeasureBeats(fixed.trebleNotes)).toBe(4);
      expect(calculateMeasureBeats(fixed.bassNotes)).toBe(4);
      expect(validateMeasureBeats(fixed)).toBe(true);
    });

    it('should handle dotted notes in overflow', () => {
      const measure: Measure = {
        trebleNotes: [
          { key: 'c/4', duration: 'h', clef: 'treble', dotted: true }, // 3 beats
          { key: 'd/4', duration: 'h', clef: 'treble' } // 2 beats, total 5
        ],
        bassNotes: [
          { key: 'c/3', duration: 'w', clef: 'bass' }
        ]
      };
      const fixed = fixMeasureBeats(measure);
      expect(calculateMeasureBeats(fixed.trebleNotes)).toBe(4);
      expect(validateMeasureBeats(fixed)).toBe(true);
    });
  });
});
