import React from 'react';

const Footer: React.FC = () => {
  return (
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
  );
};

export default Footer;
