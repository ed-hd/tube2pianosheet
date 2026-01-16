import React from 'react';
import { Loader2, FileAudio } from 'lucide-react';
import { AnalysisProgress } from '../types';

interface ProcessingViewProps {
  fileName: string;
  progress: AnalysisProgress;
}

const STAGE_TITLES: Record<AnalysisProgress['stage'], string> = {
  loading: 'Loading Audio',
  decoding: 'Decoding Audio',
  analyzing: 'Analyzing Frequencies',
  transcribing: 'Generating Sheet Music'
};

const ProcessingView: React.FC<ProcessingViewProps> = ({ fileName, progress }) => {
  return (
    <main className="w-full max-w-xl flex flex-col items-center justify-center py-20 space-y-8">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-blue-500/20 rounded-full animate-spin border-t-blue-500"></div>
        <Loader2 className="w-12 h-12 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
          <FileAudio className="w-4 h-4" />
          {fileName}
        </div>
        <h3 className="text-2xl font-semibold text-white">
          {STAGE_TITLES[progress.stage]}
        </h3>
        <p className="text-gray-400 animate-pulse">{progress.message}</p>
      </div>
      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-blue-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${progress.progress}%` }}
        ></div>
      </div>
      <p className="text-gray-500 text-sm">{Math.round(progress.progress)}% complete</p>
    </main>
  );
};

export default ProcessingView;
