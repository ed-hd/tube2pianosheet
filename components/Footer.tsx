import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-8 w-full border-t border-white/5 no-print">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-4">
        <p className="text-gray-500 text-sm">© 2024 Tube2Score - 오프라인 오디오 악보 변환</p>
        <div className="flex gap-6 text-gray-500 text-sm">
          <a href="#" className="hover:text-white">개인정보처리방침</a>
          <a href="#" className="hover:text-white">이용약관</a>
          <a href="#" className="hover:text-white">문의하기</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
