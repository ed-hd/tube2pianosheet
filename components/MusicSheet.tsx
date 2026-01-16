
import React, { useEffect, useRef } from 'react';
import Vex from 'vexflow';
import { TranscriptionData, Measure } from '../types';

interface MusicSheetProps {
  data: TranscriptionData;
}

const MusicSheet: React.FC<MusicSheetProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous rendering
    containerRef.current.innerHTML = '';

    const VF = Vex.Flow;
    const renderer = new VF.Renderer(containerRef.current, VF.Renderer.Backends.SVG);
    
    // Calculate width based on measures (each measure approx 300px)
    const measureWidth = 300;
    const totalWidth = Math.max(800, data.measures.length * measureWidth);
    const totalHeight = 400;

    renderer.resize(totalWidth, totalHeight);
    const context = renderer.getContext();
    context.setFont('Arial', 10, '').setBackgroundFillStyle('#eed');

    let x = 10;
    const y_treble = 40;
    const y_bass = 160;

    data.measures.forEach((measure, index) => {
      // Treble Stave
      const trebleStave = new VF.Stave(x, y_treble, measureWidth);
      if (index === 0) {
        trebleStave.addClef('treble').addTimeSignature(data.timeSignature);
      }
      trebleStave.setContext(context).draw();

      // Bass Stave
      const bassStave = new VF.Stave(x, y_bass, measureWidth);
      if (index === 0) {
        bassStave.addClef('bass').addTimeSignature(data.timeSignature);
      }
      // Add brace and connector for the first measure
      if (index === 0) {
        new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.BRACE).setContext(context).draw();
        new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(context).draw();
      }
      new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.SINGLE_RIGHT).setContext(context).draw();
      bassStave.setContext(context).draw();

      // Create Notes
      const tNotes = measure.trebleNotes.map(n => new VF.StaveNote({ 
        clef: 'treble', 
        keys: [n.key], 
        duration: n.duration 
      }));

      const bNotes = measure.bassNotes.map(n => new VF.StaveNote({ 
        clef: 'bass', 
        keys: [n.key], 
        duration: n.duration 
      }));

      // Create Voices
      const voiceTreble = new VF.Voice({ num_beats: 4, beat_value: 4 });
      const voiceBass = new VF.Voice({ num_beats: 4, beat_value: 4 });

      voiceTreble.addTickables(tNotes);
      voiceBass.addTickables(bNotes);

      // Format and justify
      new VF.Formatter().joinVoices([voiceTreble]).format([voiceTreble], measureWidth - 50);
      new VF.Formatter().joinVoices([voiceBass]).format([voiceBass], measureWidth - 50);

      // Draw
      voiceTreble.draw(context, trebleStave);
      voiceBass.draw(context, bassStave);

      x += measureWidth;
    });

  }, [data]);

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl overflow-x-auto overflow-y-hidden border border-gray-200">
      <div className="mb-6 text-center text-gray-900">
        <h2 className="text-3xl font-serif font-bold">{data.title}</h2>
        <p className="text-gray-500 uppercase tracking-widest text-sm mt-1">Transcribed for Piano - {data.bpm} BPM</p>
      </div>
      <div ref={containerRef} className="mx-auto" style={{ minHeight: '350px' }}></div>
    </div>
  );
};

export default MusicSheet;
