import { useState, useCallback } from 'react';
import { transcribeAudio } from '../services/audioAnalyzer';
import { AppState, TranscriptionData, AnalysisProgress } from '../types';

interface UseAudioTranscriptionResult {
  status: AppState;
  data: TranscriptionData | null;
  progress: AnalysisProgress;
  transcribe: (file: File) => Promise<void>;
  reset: () => void;
  setError: (message: string) => void;
}

const INITIAL_PROGRESS: AnalysisProgress = {
  stage: 'loading',
  progress: 0,
  message: ''
};

function progressToStage(prog: number): AnalysisProgress['stage'] {
  if (prog < 20) return 'loading';
  if (prog < 40) return 'decoding';
  if (prog < 85) return 'analyzing';
  return 'transcribing';
}

export function useAudioTranscription(): UseAudioTranscriptionResult {
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [data, setData] = useState<TranscriptionData | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>(INITIAL_PROGRESS);

  const transcribe = useCallback(async (file: File) => {
    setStatus(AppState.PROCESSING);
    setProgress(INITIAL_PROGRESS);

    // Force React to flush state updates before starting async operation
    // This ensures the progress screen appears immediately
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const transcription = await transcribeAudio(file, (prog, msg) => {
        setProgress({
          stage: progressToStage(prog),
          progress: prog,
          message: msg
        });
      });
      setData(transcription);
      setStatus(AppState.VIEWING);
    } catch (err) {
      console.error(err);
      setStatus(AppState.ERROR);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus(AppState.IDLE);
    setData(null);
    setProgress(INITIAL_PROGRESS);
  }, []);

  const setError = useCallback((message: string) => {
    setStatus(AppState.ERROR);
  }, []);

  return {
    status,
    data,
    progress,
    transcribe,
    reset,
    setError
  };
}
