/**
 * Key Detection using Krumhansl-Schmuckler Algorithm
 * 
 * Detects musical key (tonic + mode) from a 12-element chromagram
 * by correlating pitch class distribution with key profiles.
 * 
 * References:
 * - Krumhansl, C. L. (1990). Cognitive Foundations of Musical Pitch
 * - Temperley, D. (1999). What's Key for Key? The Krumhansl-Schmuckler Key-Finding Algorithm Reconsidered
 */

// Krumhansl-Schmuckler key profiles (from empirical studies)
// Values represent perceptual stability of each scale degree

// Major profile: [Tonic, m2, M2, m3, M3, P4, TT, P5, m6, M6, m7, M7]
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];

// Minor profile: [Tonic, m2, M2, m3, M3, P4, TT, P5, m6, M6, m7, M7]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// All 12 pitch classes
const PITCH_CLASSES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface KeyDetectionResult {
  key: string;
  mode: 'major' | 'minor';
  confidence: number; // 0-1, normalized correlation strength
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
function correlate(x: number[], y: number[]): number {
  if (x.length !== y.length) {
    throw new Error('Arrays must have same length');
  }

  const n = x.length;
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate correlation
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }
  
  const denominator = Math.sqrt(sumSqX * sumSqY);
  
  // Handle edge case: zero variance
  if (denominator === 0) {
    return 0;
  }
  
  return numerator / denominator;
}

/**
 * Rotate array by offset positions
 */
function rotateArray(arr: number[], offset: number): number[] {
  const n = arr.length;
  const normalizedOffset = ((offset % n) + n) % n;
  return arr.slice(normalizedOffset).concat(arr.slice(0, normalizedOffset));
}

/**
 * Detect musical key from chromagram using Krumhansl-Schmuckler algorithm
 * 
 * @param chromagram - 12-element array of pitch class energies (C, C#, D, ..., B)
 * @returns Key detection result with tonic, mode, and confidence
 */
export function detectKey(chromagram: number[]): KeyDetectionResult {
  if (chromagram.length !== 12) {
    throw new Error('Chromagram must have exactly 12 elements');
  }

  let bestKey = 'C';
  let bestMode: 'major' | 'minor' = 'major';
  let bestCorrelation = -Infinity;

  // Test all 24 keys (12 major + 12 minor)
  for (let offset = 0; offset < 12; offset++) {
    const pitchClass = PITCH_CLASSES[offset];
    
    // Rotate chromagram to align with current tonic
    const rotatedChromagram = rotateArray(chromagram, offset);
    
    // Test major mode
    const majorCorrelation = correlate(rotatedChromagram, MAJOR_PROFILE);
    if (majorCorrelation > bestCorrelation) {
      bestCorrelation = majorCorrelation;
      bestKey = pitchClass;
      bestMode = 'major';
    }
    
    // Test minor mode
    const minorCorrelation = correlate(rotatedChromagram, MINOR_PROFILE);
    if (minorCorrelation > bestCorrelation) {
      bestCorrelation = minorCorrelation;
      bestKey = pitchClass;
      bestMode = 'minor';
    }
  }

  // Normalize confidence to 0-1 range
  // Correlation ranges from -1 to 1, so map to 0-1
  const confidence = Math.max(0, Math.min(1, (bestCorrelation + 1) / 2));

  return {
    key: bestKey,
    mode: bestMode,
    confidence
  };
}
