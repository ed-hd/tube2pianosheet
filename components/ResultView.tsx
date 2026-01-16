import React from 'react';
import { Download, CheckCircle2, Sparkles } from 'lucide-react';
import { TranscriptionData } from '../types';
import MusicSheet from './MusicSheet';

interface ResultViewProps {
  data: TranscriptionData;
  onBack: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ data, onBack }) => {
  const downloadPDF = () => {
    window.print();
  };

  return (
    <main className="w-full max-w-5xl space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <div className="w-8 h-8 flex items-center justify-center border border-white/20 rounded-full">
              <span className="text-white">←</span>
            </div>
          </button>
          <div>
            <h3 className="text-xl font-bold text-white">{data.title}</h3>
            <p className="text-gray-400 text-sm">{data.artist}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            TRANSCRIPTION COMPLETE
          </div>
          <button 
            onClick={downloadPDF}
            className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      <MusicSheet data={data} />

      <div className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-start gap-4 no-print">
        <div className="bg-blue-500 p-2 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="space-y-1">
          <h4 className="text-white font-bold">Offline Analysis Engine</h4>
          <p className="text-gray-400 text-sm leading-relaxed">
            This arrangement was generated using YIN pitch detection and energy-based beat tracking, 
            running entirely in your browser. No audio is sent to any server.
          </p>
        </div>
      </div>
    </main>
  );
};

export default ResultView;
