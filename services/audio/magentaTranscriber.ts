import * as mm from '@magenta/music';
import { TranscriptionData, Measure, Note, Chord, DynamicMarking, DetectedNote } from '../../types';
import {
  MAX_MEASURES,
  BEATS_PER_MEASURE,
  NOTE_NAMES,
  NOTE_NAMES_FLAT,
  MIDDLE_C_MIDI,
  CHORD_TIME_THRESHOLD,
  TIE_GAP_THRESHOLD,
  DYNAMICS,
  KEY_SIGNATURES
} from '../../constants/audio';

const MAGENTA_CHECKPOINT_URL = 'https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni';

const MIN_NOTE_DURATION_SEC = 0.03;
const QUANTIZATION_GRID = 16;
const MAX_NOTES_PER_CHORD = 8;

function midiToNoteName(midi: number, useFlats: boolean = false): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  const noteNames = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES;
  return `${noteNames[noteIndex]}/${octave}`;
}

function midiToClef(midi: number): 'treble' | 'bass' {
  return midi >= MIDDLE_C_MIDI ? 'treble' : 'bass';
}

function getAccidental(midi: number): string | undefined {
  const noteIndex = midi % 12;
  const sharpNotes = [1, 3, 6, 8, 10];
  if (sharpNotes.includes(noteIndex)) {
    return '#';
  }
  return undefined;
}

function beatsToVexflowDuration(beats: number, dotted: boolean = false): string {
  if (dotted) {
    if (beats >= 5.5) return 'wd';
    if (beats >= 2.75) return 'hd';
    if (beats >= 1.375) return 'qd';
    if (beats >= 0.6875) return '8d';
    return '16d';
  }

  if (beats >= 3.5) return 'w';
  if (beats >= 1.5) return 'h';
  if (beats >= 0.75) return 'q';
  if (beats >= 0.375) return '8';
  return '16';
}

function velocityToDynamic(velocity: number): 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' {
  if (velocity <= DYNAMICS.pp.max) return 'pp';
  if (velocity <= DYNAMICS.p.max) return 'p';
  if (velocity <= DYNAMICS.mp.max) return 'mp';
  if (velocity <= DYNAMICS.mf.max) return 'mf';
  if (velocity <= DYNAMICS.f.max) return 'f';
  return 'ff';
}

function estimateBPM(notes: mm.NoteSequence.INote[]): number {
  if (notes.length < 4) return 120;

  const onsets = notes.map(n => n.startTime || 0).sort((a, b) => a - b);
  const intervals: number[] = [];

  for (let i = 1; i < onsets.length; i++) {
    const interval = onsets[i] - onsets[i - 1];
    if (interval > 0.05 && interval < 2.0) {
      intervals.push(interval);
    }
  }

  if (intervals.length < 3) return 120;

  const histogramBins: Map<number, number> = new Map();
  const binSize = 0.02;

  intervals.forEach(interval => {
    const bin = Math.round(interval / binSize) * binSize;
    histogramBins.set(bin, (histogramBins.get(bin) || 0) + 1);
  });

  let maxCount = 0;
  let mostCommonInterval = 0.5;

  histogramBins.forEach((count, interval) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonInterval = interval;
    }
  });

  let bpm = Math.round(60 / mostCommonInterval);

  if (bpm < 50) bpm *= 2;
  if (bpm > 200) bpm = Math.round(bpm / 2);

  const commonBPMs = [60, 66, 72, 80, 88, 92, 100, 108, 112, 120, 126, 132, 138, 144, 152, 160, 168, 176];
  bpm = commonBPMs.reduce((prev, curr) =>
    Math.abs(curr - bpm) < Math.abs(prev - bpm) ? curr : prev
  );

  return Math.max(60, Math.min(180, bpm));
}

function detectKeySignature(notes: mm.NoteSequence.INote[]): string {
  const noteCount: number[] = new Array(12).fill(0);

  notes.forEach(note => {
    const noteIndex = (note.pitch || 0) % 12;
    const duration = (note.endTime || 0) - (note.startTime || 0);
    noteCount[noteIndex] += duration;
  });

  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];

  let bestKey = 'C';
  let bestCorrelation = -Infinity;

  const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab'];
  const keyOffsets: Record<string, number> = {
    'C': 0, 'G': 7, 'D': 2, 'A': 9, 'E': 4, 'B': 11,
    'F': 5, 'Bb': 10, 'Eb': 3, 'Ab': 8
  };

  for (const key of keys) {
    const offset = keyOffsets[key];
    let correlation = 0;

    for (let i = 0; i < 12; i++) {
      const rotatedIndex = (i - offset + 12) % 12;
      correlation += noteCount[i] * majorProfile[rotatedIndex];
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestKey = key;
    }
  }

  return bestKey;
}

interface QuantizedNote {
  pitchMidi: number;
  startBeat: number;
  durationBeats: number;
  clef: 'treble' | 'bass';
  velocity: number;
}

function quantizeNotes(notes: mm.NoteSequence.INote[], bpm: number): QuantizedNote[] {
  const beatsPerSecond = bpm / 60;
  const quantizedNotes: QuantizedNote[] = [];

  notes.forEach(note => {
    const startTime = note.startTime || 0;
    const endTime = note.endTime || 0;
    const duration = endTime - startTime;

    if (duration < MIN_NOTE_DURATION_SEC) return;
    if (!note.pitch || note.pitch < 21 || note.pitch > 108) return;

    const startBeat = startTime * beatsPerSecond;
    const durationBeats = duration * beatsPerSecond;

    const quantizedStartBeat = Math.round(startBeat * QUANTIZATION_GRID / 4) / (QUANTIZATION_GRID / 4);

    let quantizedDuration: number;
    if (durationBeats >= 5.5) quantizedDuration = 6;
    else if (durationBeats >= 3.5) quantizedDuration = 4;
    else if (durationBeats >= 2.75) quantizedDuration = 3;
    else if (durationBeats >= 1.5) quantizedDuration = 2;
    else if (durationBeats >= 1.25) quantizedDuration = 1.5;
    else if (durationBeats >= 0.75) quantizedDuration = 1;
    else if (durationBeats >= 0.625) quantizedDuration = 0.75;
    else if (durationBeats >= 0.375) quantizedDuration = 0.5;
    else quantizedDuration = 0.25;

    const velocity = note.velocity || 64;

    quantizedNotes.push({
      pitchMidi: note.pitch,
      startBeat: quantizedStartBeat,
      durationBeats: quantizedDuration,
      clef: midiToClef(note.pitch),
      velocity
    });
  });

  return quantizedNotes;
}

interface ChordGroup {
  notes: QuantizedNote[];
  startBeat: number;
}

function groupNotesIntoChords(notes: QuantizedNote[], bpm: number): ChordGroup[] {
  const beatsPerSecond = bpm / 60;
  const chordThresholdBeats = CHORD_TIME_THRESHOLD * beatsPerSecond;

  const groups: ChordGroup[] = [];
  const sortedNotes = [...notes].sort((a, b) => a.startBeat - b.startBeat);

  let currentGroup: QuantizedNote[] = [];
  let groupStartBeat = 0;

  sortedNotes.forEach((note, index) => {
    if (currentGroup.length === 0) {
      currentGroup.push(note);
      groupStartBeat = note.startBeat;
    } else {
      if (Math.abs(note.startBeat - groupStartBeat) <= chordThresholdBeats) {
        if (currentGroup.length < MAX_NOTES_PER_CHORD) {
          currentGroup.push(note);
        }
      } else {
        groups.push({ notes: [...currentGroup], startBeat: groupStartBeat });
        currentGroup = [note];
        groupStartBeat = note.startBeat;
      }
    }

    if (index === sortedNotes.length - 1 && currentGroup.length > 0) {
      groups.push({ notes: [...currentGroup], startBeat: groupStartBeat });
    }
  });

  groups.forEach(group => {
    group.notes.sort((a, b) => a.pitchMidi - b.pitchMidi);
  });

  return groups;
}

function detectTiesAndSlurs(
  chordGroups: ChordGroup[],
  bpm: number
): Map<string, { tieEnd: boolean; slurStart: boolean; slurEnd: boolean }> {
  const beatsPerSecond = bpm / 60;
  const tieThresholdBeats = TIE_GAP_THRESHOLD * beatsPerSecond;

  const noteMarkers = new Map<string, { tieEnd: boolean; slurStart: boolean; slurEnd: boolean }>();

  for (let i = 0; i < chordGroups.length - 1; i++) {
    const currentGroup = chordGroups[i];
    const nextGroup = chordGroups[i + 1];

    const gap = nextGroup.startBeat - (currentGroup.startBeat + currentGroup.notes[0].durationBeats);

    currentGroup.notes.forEach(currentNote => {
      const key = `${i}-${currentNote.pitchMidi}`;

      const tiedNote = nextGroup.notes.find(n =>
        n.pitchMidi === currentNote.pitchMidi && gap < tieThresholdBeats && gap >= 0
      );

      if (tiedNote) {
        noteMarkers.set(key, { tieEnd: false, slurStart: false, slurEnd: false });
        const nextKey = `${i + 1}-${tiedNote.pitchMidi}`;
        noteMarkers.set(nextKey, { tieEnd: true, slurStart: false, slurEnd: false });
      }

      if (gap >= 0 && gap < tieThresholdBeats * 2 && !tiedNote) {
        if (!noteMarkers.has(key)) {
          noteMarkers.set(key, { tieEnd: false, slurStart: true, slurEnd: false });
        }
      }
    });
  }

  return noteMarkers;
}

function extractDynamics(chordGroups: ChordGroup[], bpm: number): DynamicMarking[] {
  const dynamics: DynamicMarking[] = [];
  let lastDynamic: string | null = null;

  chordGroups.forEach((group, index) => {
    if (group.notes.length === 0) return;

    const avgVelocity = group.notes.reduce((sum, n) => sum + n.velocity, 0) / group.notes.length;
    const currentDynamic = velocityToDynamic(avgVelocity);

    if (lastDynamic !== currentDynamic) {
      const measureIndex = Math.floor(group.startBeat / BEATS_PER_MEASURE);
      const beatInMeasure = group.startBeat % BEATS_PER_MEASURE;

      dynamics.push({
        measure: measureIndex,
        beat: beatInMeasure,
        type: currentDynamic,
        clef: group.notes[0].clef
      });

      lastDynamic = currentDynamic;
    }
  });

  const filteredDynamics: DynamicMarking[] = [];
  for (let i = 0; i < dynamics.length; i++) {
    if (i === 0 || dynamics[i].measure - dynamics[i - 1].measure >= 4) {
      filteredDynamics.push(dynamics[i]);
    }
  }

  return filteredDynamics;
}

function isDottedDuration(beats: number): boolean {
  const dottedDurations = [6, 3, 1.5, 0.75, 0.375];
  return dottedDurations.some(d => Math.abs(beats - d) < 0.1);
}

function notesToMeasures(
  notes: mm.NoteSequence.INote[],
  bpm: number,
  keySignature: string,
  beatsPerMeasure: number = BEATS_PER_MEASURE
): { measures: Measure[]; dynamics: DynamicMarking[] } {
  if (notes.length === 0) return { measures: [], dynamics: [] };

  const quantizedNotes = quantizeNotes(notes, bpm);
  if (quantizedNotes.length === 0) return { measures: [], dynamics: [] };

  const chordGroups = groupNotesIntoChords(quantizedNotes, bpm);
  const noteMarkers = detectTiesAndSlurs(chordGroups, bpm);
  const dynamics = extractDynamics(chordGroups, bpm);

  const useFlats = KEY_SIGNATURES[keySignature] < 0;

  const measures: Measure[] = [];
  const sortedNotes = [...notes].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
  const totalDuration = (sortedNotes[sortedNotes.length - 1].endTime || 0);
  const totalBeats = totalDuration * (bpm / 60);
  const measureCount = Math.min(Math.ceil(totalBeats / beatsPerMeasure), MAX_MEASURES);

  for (let i = 0; i < measureCount; i++) {
    const measureStartBeat = i * beatsPerMeasure;
    const measureEndBeat = (i + 1) * beatsPerMeasure;

    const trebleNotes: Note[] = [];
    const bassNotes: Note[] = [];
    const trebleChords: Chord[] = [];
    const bassChords: Chord[] = [];

    chordGroups.forEach((group, groupIndex) => {
      if (group.startBeat >= measureStartBeat && group.startBeat < measureEndBeat) {
        const trebleChordNotes: Note[] = [];
        const bassChordNotes: Note[] = [];

        group.notes.forEach(note => {
          const markerKey = `${groupIndex}-${note.pitchMidi}`;
          const markers = noteMarkers.get(markerKey);
          const isDotted = isDottedDuration(note.durationBeats);

          const vexNote: Note = {
            key: midiToNoteName(note.pitchMidi, useFlats),
            duration: beatsToVexflowDuration(note.durationBeats, isDotted),
            clef: note.clef,
            velocity: note.velocity,
            accidentals: getAccidental(note.pitchMidi) ? [getAccidental(note.pitchMidi)!] : undefined,
            tieStart: markers?.tieEnd === false && markers?.slurStart === false ? undefined : undefined,
            tieEnd: markers?.tieEnd,
            slurStart: markers?.slurStart,
            slurEnd: markers?.slurEnd,
            dotted: isDotted
          };

          if (note.clef === 'treble') {
            trebleNotes.push(vexNote);
            trebleChordNotes.push(vexNote);
          } else {
            bassNotes.push(vexNote);
            bassChordNotes.push(vexNote);
          }
        });

        if (trebleChordNotes.length > 0) {
          trebleChords.push({
            notes: trebleChordNotes,
            startBeat: group.startBeat - measureStartBeat
          });
        }
        if (bassChordNotes.length > 0) {
          bassChords.push({
            notes: bassChordNotes,
            startBeat: group.startBeat - measureStartBeat
          });
        }
      }
    });

    if (trebleNotes.length === 0) {
      trebleNotes.push({ key: 'b/4', duration: 'wr', clef: 'treble', isRest: true });
    }
    if (bassNotes.length === 0) {
      bassNotes.push({ key: 'd/3', duration: 'wr', clef: 'bass', isRest: true });
    }

    measures.push({
      trebleNotes,
      bassNotes,
      trebleChords: trebleChords.length > 0 ? trebleChords : undefined,
      bassChords: bassChords.length > 0 ? bassChords : undefined
    });
  }

  return { measures, dynamics };
}

export async function transcribeAudioWithMagenta(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<TranscriptionData> {
  onProgress?.(5, 'Loading Magenta Onsets and Frames model...');

  const model = new mm.OnsetsAndFrames(MAGENTA_CHECKPOINT_URL);

  onProgress?.(10, 'Initializing model...');

  await model.initialize();

  onProgress?.(20, 'Decoding audio file...');

  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  onProgress?.(30, 'Transcribing with AI model...');

  const noteSequence = await model.transcribeFromAudioBuffer(audioBuffer);

  onProgress?.(70, 'Extracting notes...');

  const notes = noteSequence.notes || [];

  onProgress?.(80, 'Detecting tempo and key...');

  const bpm = estimateBPM(notes);
  const keySignature = detectKeySignature(notes);

  onProgress?.(90, 'Generating sheet music...');

  const { measures, dynamics } = notesToMeasures(notes, bpm, keySignature, BEATS_PER_MEASURE);

  const fileName = file.name.replace(/\.[^/.]+$/, '');

  onProgress?.(100, 'Complete!');

  await audioContext.close();
  model.dispose();

  return {
    title: fileName,
    artist: 'Transcribed by Magenta AI',
    bpm,
    timeSignature: '4/4',
    keySignature,
    measures,
    dynamics
  };
}
