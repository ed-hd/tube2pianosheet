import { 
  A4_FREQUENCY, 
  A4_MIDI, 
  NOTE_NAMES, 
  MIDDLE_C_MIDI,
  MAX_MEASURES,
  BEATS_PER_MEASURE
} from '../../constants/audio';
import { DetectedNote, Measure, Note } from '../../types';

export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI);
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}/${octave}`;
}

export function midiToClef(midi: number): 'treble' | 'bass' {
  return midi >= MIDDLE_C_MIDI ? 'treble' : 'bass';
}

export function durationToVexflow(durationSeconds: number, bpm: number): string {
  const beatsPerSecond = bpm / 60;
  const beats = durationSeconds * beatsPerSecond;
  
  if (beats >= 3.5) return 'w';
  if (beats >= 1.75) return 'h';
  if (beats >= 0.875) return 'q';
  if (beats >= 0.4375) return '8';
  return '16';
}

export function notesToMeasures(
  notes: DetectedNote[],
  bpm: number,
  beatsPerMeasure: number = BEATS_PER_MEASURE
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
  
  return measures.slice(0, MAX_MEASURES);
}
