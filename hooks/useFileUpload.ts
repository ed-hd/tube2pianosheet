import { useState, useCallback } from 'react';

interface UseFileUploadResult {
  dragActive: boolean;
  error: string | null;
  fileName: string;
  setDragActive: (active: boolean) => void;
  validateAndSetFile: (file: File) => File | null;
  setError: (error: string | null) => void;
  reset: () => void;
}

export function useFileUpload(): UseFileUploadResult {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const validateAndSetFile = useCallback((file: File): File | null => {
    if (!file.type.includes('audio/')) {
      setError('Please upload an audio file (MP3, WAV, etc.)');
      return null;
    }
    setFileName(file.name);
    setError(null);
    return file;
  }, []);

  const reset = useCallback(() => {
    setDragActive(false);
    setError(null);
    setFileName('');
  }, []);

  return {
    dragActive,
    error,
    fileName,
    setDragActive,
    validateAndSetFile,
    setError,
    reset
  };
}
