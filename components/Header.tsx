import React from 'react';
import { Music } from 'lucide-react';

const Header: React.FC = () => {
  return (
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
        <a href="#" className="hover:text-white transition-colors">사용 방법</a>
        <a href="#" className="hover:text-white transition-colors">알고리즘</a>
      </div>
    </header>
  );
};

export default Header;
