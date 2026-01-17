/**
 * Ground Truth Data for "Dream As One" by Miley Cyrus
 * from Avatar: Fire and Ash OST
 * 
 * Source: 1.pdf (피아노친당 transcription)
 * Verified against: PianoNest YouTube (Tempo: 67.75 BPM, Key: Eb minor)
 */

export interface GroundTruthNote {
  midiNumber: number;    // 0-127
  startTime: number;     // seconds
  duration: number;      // seconds
  noteName: string;      // e.g., "C4", "Eb5"
}

// Key Signature: Eb minor (6 flats: Bb, Eb, Ab, Db, Gb, Cb)
export const expectedKey = "Eb minor";

// BPM: 68 (from sheet music), verified ~67.75 from online sources
export const expectedBPM = 68;

// Time Signature: 4/4
export const expectedTimeSignature = "4/4";

/**
 * First 4 measures of "Dream As One"
 * 
 * Measure 1 (beats 0-4): Introduction pattern with right hand melody
 * Measure 2 (beats 4-8): Continuation of melodic phrase
 * Measure 3 (beats 8-12): Melodic development
 * Measure 4 (beats 12-16): Phrase completion
 * 
 * Timing calculation: 68 BPM = 0.882 seconds per beat
 * Quarter note = 0.882s, Half note = 1.765s, Whole note = 3.529s
 */
export const first4Measures: GroundTruthNote[] = [
  // Measure 1, Beat 1 (0.000s) - Rest in treble, bass chord
  { midiNumber: 51, startTime: 0.000, duration: 0.882, noteName: "Eb3" },  // Bass
  { midiNumber: 58, startTime: 0.000, duration: 0.882, noteName: "Bb3" },  // Bass
  
  // Measure 1, Beat 2 (0.882s) - Melodic pickup starts
  { midiNumber: 51, startTime: 0.882, duration: 0.882, noteName: "Eb3" },  // Bass
  { midiNumber: 58, startTime: 0.882, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 75, startTime: 0.882, duration: 0.294, noteName: "Eb5" },  // Treble melody
  { midiNumber: 75, startTime: 1.176, duration: 0.294, noteName: "Eb5" },  // Treble
  
  // Measure 1, Beat 3 (1.765s)
  { midiNumber: 63, startTime: 1.765, duration: 0.882, noteName: "Eb4" },  // Bass
  { midiNumber: 70, startTime: 1.765, duration: 0.882, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 1.765, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 2.206, duration: 0.441, noteName: "Eb5" },  // Treble
  
  // Measure 1, Beat 4 (2.647s)
  { midiNumber: 63, startTime: 2.647, duration: 0.882, noteName: "Eb4" },  // Bass
  { midiNumber: 70, startTime: 2.647, duration: 0.882, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 2.647, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 77, startTime: 3.088, duration: 0.441, noteName: "F5" },   // Treble
  
  // Measure 2, Beat 1 (3.529s)
  { midiNumber: 51, startTime: 3.529, duration: 0.882, noteName: "Eb3" },  // Bass
  { midiNumber: 58, startTime: 3.529, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 75, startTime: 3.529, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 3.971, duration: 0.441, noteName: "Eb5" },  // Treble
  
  // Measure 2, Beat 2 (4.412s)
  { midiNumber: 51, startTime: 4.412, duration: 0.882, noteName: "Eb3" },  // Bass
  { midiNumber: 58, startTime: 4.412, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 75, startTime: 4.412, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 4.853, duration: 0.441, noteName: "Eb5" },  // Treble
  
  // Measure 2, Beat 3 (5.294s)
  { midiNumber: 63, startTime: 5.294, duration: 0.882, noteName: "Eb4" },  // Bass
  { midiNumber: 70, startTime: 5.294, duration: 0.882, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 5.294, duration: 0.294, noteName: "Eb5" },  // Treble
  { midiNumber: 77, startTime: 5.588, duration: 0.294, noteName: "F5" },   // Treble
  { midiNumber: 75, startTime: 5.882, duration: 0.294, noteName: "Eb5" },  // Treble
  
  // Measure 2, Beat 4 (6.176s)
  { midiNumber: 63, startTime: 6.176, duration: 0.441, noteName: "Eb4" },  // Bass
  { midiNumber: 70, startTime: 6.176, duration: 0.441, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 6.176, duration: 0.294, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 6.471, duration: 0.294, noteName: "Eb5" },  // Treble
  { midiNumber: 63, startTime: 6.618, duration: 0.441, noteName: "Eb4" },  // Bass
  { midiNumber: 70, startTime: 6.618, duration: 0.441, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 6.765, duration: 0.294, noteName: "Eb5" },  // Treble
  
  // Measure 3, Beat 1 (7.059s)
  { midiNumber: 51, startTime: 7.059, duration: 0.882, noteName: "Eb3" },  // Bass
  { midiNumber: 58, startTime: 7.059, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 75, startTime: 7.059, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 7.500, duration: 0.441, noteName: "Eb5" },  // Treble
  
  // Measure 3, Beat 2 (7.941s)
  { midiNumber: 51, startTime: 7.941, duration: 0.882, noteName: "Eb3" },  // Bass
  { midiNumber: 58, startTime: 7.941, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 75, startTime: 7.941, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 8.382, duration: 0.441, noteName: "Eb5" },  // Treble
  
  // Measure 3, Beat 3 (8.824s)
  { midiNumber: 58, startTime: 8.824, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 65, startTime: 8.824, duration: 0.882, noteName: "F4" },   // Bass
  { midiNumber: 70, startTime: 8.824, duration: 0.882, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 8.824, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 9.265, duration: 0.441, noteName: "Eb5" },  // Treble
  
  // Measure 3, Beat 4 (9.706s)
  { midiNumber: 58, startTime: 9.706, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 65, startTime: 9.706, duration: 0.882, noteName: "F4" },   // Bass
  { midiNumber: 70, startTime: 9.706, duration: 0.882, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 9.706, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 10.147, duration: 0.441, noteName: "Eb5" }, // Treble
  
  // Measure 4, Beat 1 (10.588s)
  { midiNumber: 51, startTime: 10.588, duration: 0.882, noteName: "Eb3" },  // Bass
  { midiNumber: 58, startTime: 10.588, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 75, startTime: 10.588, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 11.029, duration: 0.441, noteName: "Eb5" },  // Treble
  
  // Measure 4, Beat 2 (11.471s)
  { midiNumber: 51, startTime: 11.471, duration: 0.882, noteName: "Eb3" },  // Bass
  { midiNumber: 58, startTime: 11.471, duration: 0.882, noteName: "Bb3" },  // Bass
  { midiNumber: 75, startTime: 11.471, duration: 0.441, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 11.912, duration: 0.441, noteName: "Eb5" },  // Treble
  
  // Measure 4, Beat 3 (12.353s)
  { midiNumber: 63, startTime: 12.353, duration: 0.882, noteName: "Eb4" },  // Bass
  { midiNumber: 70, startTime: 12.353, duration: 0.882, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 12.353, duration: 0.294, noteName: "Eb5" },  // Treble
  { midiNumber: 77, startTime: 12.647, duration: 0.294, noteName: "F5" },   // Treble
  { midiNumber: 75, startTime: 12.941, duration: 0.294, noteName: "Eb5" },  // Treble
  
  // Measure 4, Beat 4 (13.235s)
  { midiNumber: 63, startTime: 13.235, duration: 0.882, noteName: "Eb4" },  // Bass
  { midiNumber: 70, startTime: 13.235, duration: 0.882, noteName: "Bb4" },  // Bass
  { midiNumber: 75, startTime: 13.235, duration: 0.294, noteName: "Eb5" },  // Treble
  { midiNumber: 75, startTime: 13.529, duration: 0.294, noteName: "Eb5" },  // Treble
  { midiNumber: 77, startTime: 13.824, duration: 0.294, noteName: "F5" },   // Treble
];

/**
 * MIDI Number Reference (Eb minor scale):
 * Eb3 = 51, F3 = 53, Gb3 = 54, Ab3 = 56, Bb3 = 58, Cb4 = 59, Db4 = 61
 * Eb4 = 63, F4 = 65, Gb4 = 66, Ab4 = 68, Bb4 = 70, Cb5 = 71, Db5 = 73
 * Eb5 = 75, F5 = 77, Gb5 = 78, Ab5 = 80, Bb5 = 82
 */
