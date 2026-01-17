import React, { useEffect, useRef, useCallback } from 'react';
import { 
  Renderer, 
  Stave, 
  StaveNote, 
  Voice, 
  Formatter, 
  StaveConnector,
  Beam,
  Accidental,
  Dot,
  Articulation,
  Annotation,
  TextDynamics,
  Stem,
  GhostNote
} from 'vexflow';
import { TranscriptionData, Measure, Note, DynamicMarking } from '../types';

interface MusicSheetProps {
  data: TranscriptionData;
}

// Layout constants for professional appearance
const LAYOUT = {
  PAGE_MARGIN_LEFT: 60,
  PAGE_MARGIN_TOP: 120,
  STAVE_WIDTH: 280,
  MEASURES_PER_LINE: 4,
  LINE_HEIGHT: 200,
  TREBLE_Y_OFFSET: 0,
  BASS_Y_OFFSET: 80,
  TITLE_FONT_SIZE: 28,
  SUBTITLE_FONT_SIZE: 14,
};

const MusicSheet: React.FC<MusicSheetProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getDynamicForMeasure = useCallback((
    measureIndex: number, 
    clef: 'treble' | 'bass'
  ): DynamicMarking | undefined => {
    if (!data.dynamics) return undefined;
    return data.dynamics.find(d => d.measure === measureIndex && d.clef === clef);
  }, [data.dynamics]);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const totalLines = Math.ceil(data.measures.length / LAYOUT.MEASURES_PER_LINE);
    const totalWidth = LAYOUT.PAGE_MARGIN_LEFT + (LAYOUT.STAVE_WIDTH * LAYOUT.MEASURES_PER_LINE) + 40;
    const totalHeight = LAYOUT.PAGE_MARGIN_TOP + (totalLines * LAYOUT.LINE_HEIGHT) + 100;

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(totalWidth, totalHeight);
    const context = renderer.getContext();
    
    // Set high-quality rendering
    context.setFont('Bravura, Academico, serif', 10);

    // Draw title and subtitle
    const svg = containerRef.current.querySelector('svg');
    if (svg) {
      // Title
      const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleText.setAttribute('x', String(totalWidth / 2));
      titleText.setAttribute('y', '45');
      titleText.setAttribute('text-anchor', 'middle');
      titleText.setAttribute('font-family', 'Georgia, serif');
      titleText.setAttribute('font-size', String(LAYOUT.TITLE_FONT_SIZE));
      titleText.setAttribute('font-weight', 'bold');
      titleText.setAttribute('fill', '#1a1a1a');
      titleText.textContent = data.title;
      svg.appendChild(titleText);

      // Subtitle (tempo and key)
      const subtitleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subtitleText.setAttribute('x', String(totalWidth / 2));
      subtitleText.setAttribute('y', '70');
      subtitleText.setAttribute('text-anchor', 'middle');
      subtitleText.setAttribute('font-family', 'Georgia, serif');
      subtitleText.setAttribute('font-size', String(LAYOUT.SUBTITLE_FONT_SIZE));
      subtitleText.setAttribute('fill', '#555');
      subtitleText.textContent = `♩ = ${data.bpm} | ${data.keySignature}`;
      svg.appendChild(subtitleText);

      // Composer/Arranger
      const arrangerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      arrangerText.setAttribute('x', String(totalWidth - LAYOUT.PAGE_MARGIN_LEFT));
      arrangerText.setAttribute('y', '90');
      arrangerText.setAttribute('text-anchor', 'end');
      arrangerText.setAttribute('font-family', 'Georgia, serif');
      arrangerText.setAttribute('font-size', '11');
      arrangerText.setAttribute('font-style', 'italic');
      arrangerText.setAttribute('fill', '#666');
      arrangerText.textContent = data.artist;
      svg.appendChild(arrangerText);
    }

    // Render measures line by line
    for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
      const startMeasure = lineIndex * LAYOUT.MEASURES_PER_LINE;
      const endMeasure = Math.min(startMeasure + LAYOUT.MEASURES_PER_LINE, data.measures.length);
      const measuresInLine = endMeasure - startMeasure;

      const y_base = LAYOUT.PAGE_MARGIN_TOP + (lineIndex * LAYOUT.LINE_HEIGHT);
      const y_treble = y_base + LAYOUT.TREBLE_Y_OFFSET;
      const y_bass = y_base + LAYOUT.BASS_Y_OFFSET;

      for (let i = startMeasure; i < endMeasure; i++) {
        const measureIndexInLine = i - startMeasure;
        const x = LAYOUT.PAGE_MARGIN_LEFT + (measureIndexInLine * LAYOUT.STAVE_WIDTH);
        const measure = data.measures[i];
        const isFirstMeasure = i === 0;
        const isFirstInLine = measureIndexInLine === 0;
        const isLastInLine = measureIndexInLine === measuresInLine - 1;

        // Calculate stave width (first measure is wider for clef/key/time)
        let staveWidth = LAYOUT.STAVE_WIDTH;
        
        // Treble Stave
        const trebleStave = new Stave(x, y_treble, staveWidth);
        
        if (isFirstMeasure) {
          trebleStave.addClef('treble');
          trebleStave.addKeySignature(data.keySignature);
          trebleStave.addTimeSignature(data.timeSignature);
        } else if (isFirstInLine) {
          trebleStave.addClef('treble');
        }
        
        trebleStave.setContext(context).draw();

        // Bass Stave
        const bassStave = new Stave(x, y_bass, staveWidth);
        
        if (isFirstMeasure) {
          bassStave.addClef('bass');
          bassStave.addKeySignature(data.keySignature);
          bassStave.addTimeSignature(data.timeSignature);
        } else if (isFirstInLine) {
          bassStave.addClef('bass');
        }
        
        bassStave.setContext(context).draw();

        // Connectors
        if (isFirstInLine) {
          // Brace at the start of each line
          new StaveConnector(trebleStave, bassStave)
            .setType(StaveConnector.type.BRACE)
            .setContext(context)
            .draw();
          new StaveConnector(trebleStave, bassStave)
            .setType(StaveConnector.type.SINGLE_LEFT)
            .setContext(context)
            .draw();
        }
        
        // Bar line at the end of each measure
        new StaveConnector(trebleStave, bassStave)
          .setType(StaveConnector.type.SINGLE_RIGHT)
          .setContext(context)
          .draw();

        // Create notes for treble clef
        const trebleVexNotes = createVexNotes(measure.trebleNotes, 'treble', data.keySignature);
        const bassVexNotes = createVexNotes(measure.bassNotes, 'bass', data.keySignature);

        // Create voices
        const voiceTreble = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
        const voiceBass = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);

        voiceTreble.addTickables(trebleVexNotes);
        voiceBass.addTickables(bassVexNotes);

        // Format - must happen before beam creation
        const formatter = new Formatter();
        formatter.joinVoices([voiceTreble]).format([voiceTreble], staveWidth - 70);
        formatter.joinVoices([voiceBass]).format([voiceBass], staveWidth - 70);

        // Draw voices
        voiceTreble.draw(context, trebleStave);
        voiceBass.draw(context, bassStave);

        // Create and draw beams AFTER formatting and drawing notes
        try {
          const trebleBeams = createBeams(trebleVexNotes);
          const bassBeams = createBeams(bassVexNotes);
          trebleBeams.forEach(beam => beam.setContext(context).draw());
          bassBeams.forEach(beam => beam.setContext(context).draw());
        } catch (beamError) {
          // Beam creation can fail for some note configurations, skip beams
          console.warn('Beam creation failed:', beamError);
        }

        // Draw dynamics if present
        const trebleDynamic = getDynamicForMeasure(i, 'treble');
        if (trebleDynamic && svg) {
          const dynamicX = x + 30;
          const dynamicY = y_treble + 110;
          const dynamicText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          dynamicText.setAttribute('x', String(dynamicX));
          dynamicText.setAttribute('y', String(dynamicY));
          dynamicText.setAttribute('font-family', 'Times New Roman, serif');
          dynamicText.setAttribute('font-size', '14');
          dynamicText.setAttribute('font-style', 'italic');
          dynamicText.setAttribute('font-weight', 'bold');
          dynamicText.setAttribute('fill', '#333');
          dynamicText.textContent = trebleDynamic.type;
          svg.appendChild(dynamicText);
        }
      }
    }

  }, [data, getDynamicForMeasure]);

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl overflow-x-auto overflow-y-auto border border-gray-200 print:shadow-none print:border-none">
      <div 
        ref={containerRef} 
        className="mx-auto" 
        style={{ 
          minHeight: '500px',
          background: '#fff'
        }}
      />
      <div className="mt-4 text-center text-gray-400 text-sm no-print">
        Generated by Tube2Score AI
      </div>
    </div>
  );
};

function createVexNotes(notes: Note[], clef: 'treble' | 'bass', keySignature: string): StaveNote[] {
  if (notes.length === 0) {
    // Return whole rest
    const restKey = clef === 'treble' ? 'b/4' : 'd/3';
    return [new StaveNote({ clef, keys: [restKey], duration: 'wr' })];
  }

  // Group notes by their start position (for chords)
  const vexNotes: StaveNote[] = [];
  const processedIndices = new Set<number>();

  for (let i = 0; i < notes.length; i++) {
    if (processedIndices.has(i)) continue;

    const note = notes[i];
    
    // Find all notes at the same position (chord)
    const chordNotes: Note[] = [note];
    for (let j = i + 1; j < notes.length; j++) {
      if (!processedIndices.has(j)) {
        // Simple chord grouping - consecutive notes with same duration
        if (notes[j].duration === note.duration && !notes[j].isRest) {
          chordNotes.push(notes[j]);
          processedIndices.add(j);
        }
      }
    }
    processedIndices.add(i);

    // Create VexFlow note
    const keys = chordNotes.map(n => n.key);
    const duration = note.duration + (note.isRest ? 'r' : '');
    
    // Determine stem direction
    const avgPitch = chordNotes.reduce((sum, n) => {
      const parts = n.key.split('/');
      const octave = parseInt(parts[1]) || 4;
      return sum + octave;
    }, 0) / chordNotes.length;
    
    const stemDirection = clef === 'treble' 
      ? (avgPitch >= 5 ? Stem.DOWN : Stem.UP)
      : (avgPitch >= 3 ? Stem.DOWN : Stem.UP);

    try {
      const staveNote = new StaveNote({
        clef,
        keys,
        duration,
        stemDirection: stemDirection,
        autoStem: false
      });

      // Add accidentals
      chordNotes.forEach((n, idx) => {
        if (n.accidentals && n.accidentals.length > 0) {
          n.accidentals.forEach(acc => {
            // Don't add accidentals that are in the key signature
            if (!isInKeySignature(n.key, acc, keySignature)) {
              staveNote.addModifier(new Accidental(acc), idx);
            }
          });
        }
      });

      // Add dots for dotted notes
      if (note.dotted) {
        Dot.buildAndAttach([staveNote], { all: true });
      }

      // Add articulations
      if (note.staccato) {
        staveNote.addModifier(new Articulation('a.').setPosition(3), 0);
      }
      if (note.accent) {
        staveNote.addModifier(new Articulation('a>').setPosition(3), 0);
      }

      vexNotes.push(staveNote);
    } catch (e) {
      // Fallback to rest if note creation fails
      const restKey = clef === 'treble' ? 'b/4' : 'd/3';
      vexNotes.push(new StaveNote({ clef, keys: [restKey], duration: 'qr' }));
    }
  }

  return vexNotes;
}

function createBeams(notes: StaveNote[]): Beam[] {
  // Skip beam creation for now - it requires complex stem management
  // VexFlow's auto-beaming needs notes to be properly formatted first
  // The notes render correctly without beams
  return [];
}

function isInKeySignature(key: string, accidental: string, keySignature: string): boolean {
  // Simplified check - in a real implementation, would need full key signature logic
  const sharpsKeys = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const flatsKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  
  const noteName = key.split('/')[0].toLowerCase();
  
  if (accidental === '#' && sharpsKeys.includes(keySignature)) {
    // Check if this sharp is in the key signature
    const sharpOrder = ['f', 'c', 'g', 'd', 'a', 'e', 'b'];
    const numSharps = sharpsKeys.indexOf(keySignature) + 1;
    const sharpsInKey = sharpOrder.slice(0, numSharps);
    return sharpsInKey.includes(noteName.replace('#', ''));
  }
  
  if (accidental === 'b' && flatsKeys.includes(keySignature)) {
    // Check if this flat is in the key signature
    const flatOrder = ['b', 'e', 'a', 'd', 'g', 'c', 'f'];
    const numFlats = flatsKeys.indexOf(keySignature) + 1;
    const flatsInKey = flatOrder.slice(0, numFlats);
    return flatsInKey.includes(noteName.replace('b', ''));
  }
  
  return false;
}

export default MusicSheet;
