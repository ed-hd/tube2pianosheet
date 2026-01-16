import React, { useCallback } from 'react';
import { AppState } from './types';
import { useFileUpload } from './hooks/useFileUpload';
import { useAudioTranscription } from './hooks/useAudioTranscription';
import Header from './components/Header';
import Footer from './components/Footer';
import FileUploader from './components/FileUploader';
import ProcessingView from './components/ProcessingView';
import ErrorView from './components/ErrorView';
import ResultView from './components/ResultView';

const App: React.FC = () => {
  const fileUpload = useFileUpload();
  const transcription = useAudioTranscription();

  const handleFileSelect = useCallback(async (file: File) => {
    const validFile = fileUpload.validateAndSetFile(file);
    if (validFile) {
      await transcription.transcribe(validFile);
    }
  }, [fileUpload, transcription]);

  const handleReset = useCallback(() => {
    fileUpload.reset();
    transcription.reset();
  }, [fileUpload, transcription]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-[60%] -right-[10%] w-[35%] h-[35%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>

      <Header />

      {transcription.status === AppState.IDLE && (
        <FileUploader
          onFileSelect={handleFileSelect}
          dragActive={fileUpload.dragActive}
          onDragChange={fileUpload.setDragActive}
          error={fileUpload.error}
        />
      )}

      {transcription.status === AppState.PROCESSING && (
        <ProcessingView
          fileName={fileUpload.fileName}
          progress={transcription.progress}
        />
      )}

      {transcription.status === AppState.ERROR && (
        <ErrorView
          error="Transcription failed. Please try a different audio file."
          onRetry={handleReset}
        />
      )}

      {transcription.status === AppState.VIEWING && transcription.data && (
        <ResultView
          data={transcription.data}
          onBack={handleReset}
        />
      )}

      <Footer />

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
