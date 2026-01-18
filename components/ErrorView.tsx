import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorViewProps {
  error: string;
  onRetry: () => void;
}

const ErrorView: React.FC<ErrorViewProps> = ({ error, onRetry }) => {
  return (
    <main className="w-full max-w-xl text-center space-y-6">
      <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">변환 실패</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <button 
          onClick={onRetry}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
};

export default ErrorView;
