import React, { useState, useRef, useCallback } from 'react';
import { Music, Upload, Download, Loader2, Sparkles, CheckCircle2, AlertCircle, FileAudio } from 'lucide-react';
import { transcribeAudio } from './services/audioAnalyzer';
import { AppState, TranscriptionData, AnalysisProgress } from './types';
import MusicSheet from './components/MusicSheet';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [data, setData] = useState<TranscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>({
    stage: 'loading',
    progress: 0,
    message: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes('audio/')) {
      setError('Please upload an audio file (MP3, WAV, etc.)');
      return;
    }

    setFileName(file.name);
    setStatus(AppState.PROCESSING);
    setError(null);

    try {
      const transcription = await transcribeAudio(file, (prog, msg) => {
        setProgress({
          stage: prog < 20 ? 'loading' : prog < 40 ? 'decoding' : prog < 85 ? 'analyzing' : 'transcribing',
          progress: prog,
          message: msg
        });
      });
      setData(transcription);
      setStatus(AppState.VIEWING);
    } catch (err) {
      console.error(err);
      setError('Transcription failed. Please try a different audio file.');
      setStatus(AppState.ERROR);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const downloadPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-[60%] -right-[10%] w-[35%] h-[35%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>

      <header className="w-full max-w-4xl flex items-center justify-between mb-16 no-print">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
            <Music className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Tube2Score
          </h1>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-white transition-colors">How it works</a>
          <a href="#" className="hover:text-white transition-colors">Algorithms</a>
        </div>
      </header>

      {status === AppState.IDLE && (
        <main className="w-full max-w-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">
              Turn any song into <span className="text-blue-400">Piano Sheets.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-lg mx-auto">
              Upload an audio file and our local analysis engine will generate professional piano notation in seconds.
            </p>
          </div>

          <div 
            className={`relative group cursor-pointer transition-all duration-300 ${dragActive ? 'scale-105' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur transition duration-500 ${dragActive ? 'opacity-75' : 'opacity-25 group-hover:opacity-50'}`}></div>
            <div className={`relative flex flex-col items-center justify-center gap-4 bg-[#121216] p-12 rounded-2xl border-2 border-dashed transition-colors ${dragActive ? 'border-blue-400' : 'border-white/20 hover:border-white/40'}`}>
              <div className={`p-4 rounded-full transition-colors ${dragActive ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                <Upload className={`w-8 h-8 transition-colors ${dragActive ? 'text-blue-400' : 'text-gray-400'}`} />
              </div>
              <div className="space-y-2">
                <p className="text-white font-semibold text-lg">
                  {dragActive ? 'Drop your audio file here' : 'Drag & drop your audio file'}
                </p>
                <p className="text-gray-500 text-sm">
                  or click to browse • MP3, WAV, OGG supported
                </p>
              </div>
              <input 
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm animate-pulse">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </main>
      )}

      {status === AppState.PROCESSING && (
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
              {progress.stage === 'loading' && 'Loading Audio'}
              {progress.stage === 'decoding' && 'Decoding Audio'}
              {progress.stage === 'analyzing' && 'Analyzing Frequencies'}
              {progress.stage === 'transcribing' && 'Generating Sheet Music'}
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
      )}

      {status === AppState.ERROR && (
        <main className="w-full max-w-xl text-center space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Transcription Failed</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button 
              onClick={() => setStatus(AppState.IDLE)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      )}

      {status === AppState.VIEWING && data && (
        <main className="w-full max-w-5xl space-y-8 animate-in zoom-in-95 duration-500">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setStatus(AppState.IDLE)}
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
      )}

      <footer className="mt-auto py-8 w-full border-t border-white/5 no-print">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-4">
          <p className="text-gray-500 text-sm">© 2024 Tube2Score - Offline Audio Transcription</p>
          <div className="flex gap-6 text-gray-500 text-sm">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
          #root { width: 100% !important; }
          main { margin: 0 !important; width: 100% !important; max-width: none !important; }
          .bg-white { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
