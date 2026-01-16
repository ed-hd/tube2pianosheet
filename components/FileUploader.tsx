import React, { useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  dragActive: boolean;
  onDragChange: (active: boolean) => void;
  error: string | null;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  dragActive,
  onDragChange,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      onDragChange(true);
    } else if (e.type === 'dragleave') {
      onDragChange(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragChange(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
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
  );
};

export default FileUploader;
