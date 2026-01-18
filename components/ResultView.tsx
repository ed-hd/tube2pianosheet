import React, { useRef, useState } from 'react';
import { Download, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { TranscriptionData } from '../types';
import MusicSheet from './MusicSheet';

// Bravura font will be loaded dynamically from CDN for PDF generation
const BRAVURA_FONT_URL = 'https://cdn.jsdelivr.net/npm/vexflow-fonts@1.0.6/bravura/Bravura_1.392.woff2';

interface ResultViewProps {
  data: TranscriptionData;
  onBack: () => void;
}

// Cache for loaded font data
let bravuraFontBase64: string | null = null;

async function loadBravuraFontBase64(): Promise<string> {
  if (bravuraFontBase64) return bravuraFontBase64;
  
  const response = await fetch(BRAVURA_FONT_URL);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      bravuraFontBase64 = base64;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function embedFontInSvg(svgElement: SVGElement, fontBase64: string): void {
  // Create style element with embedded font
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    @font-face {
      font-family: 'Bravura';
      src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
  `;
  defs.appendChild(style);
  svgElement.insertBefore(defs, svgElement.firstChild);
}

const ResultView: React.FC<ResultViewProps> = ({ data, onBack }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const downloadPDF = async () => {
    if (!sheetRef.current || isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      // Load Bravura font as base64
      const fontBase64 = await loadBravuraFontBase64();
      
      // Find the music sheet SVG (not icon SVGs)
      const svgElements = sheetRef.current.querySelectorAll('svg');
      let svgElement: SVGElement | null = null;
      for (const svg of svgElements) {
        const width = parseInt(svg.getAttribute('width') || '0');
        if (width > 100) {
          svgElement = svg;
          break;
        }
      }
      
      if (!svgElement) {
        alert('악보를 찾을 수 없습니다.');
        setIsGeneratingPDF(false);
        return;
      }

      const svgWidth = parseInt(svgElement.getAttribute('width') || '800');
      const svgHeight = parseInt(svgElement.getAttribute('height') || '400');

      // A4 landscape dimensions in mm
      const pageWidthMM = 297;
      const pageHeightMM = 210;
      const marginMM = 10;
      const titleHeightMM = 15;
      const contentWidthMM = pageWidthMM - (marginMM * 2);
      const contentHeightMM = pageHeightMM - (marginMM * 2) - titleHeightMM;

      // Use moderate DPI for balance of quality and file size
      const dpi = 96;
      const mmToPx = dpi / 25.4;
      const contentWidthPx = contentWidthMM * mmToPx;
      const contentHeightPx = contentHeightMM * mmToPx;

      // Calculate how much of SVG fits per page
      const scale = contentHeightPx / svgHeight;
      const svgWidthPerPage = contentWidthPx / scale;
      const pagesNeeded = Math.ceil(svgWidth / svgWidthPerPage);

      // Limit pages to prevent huge files
      const maxPages = 50;
      const actualPages = Math.min(pagesNeeded, maxPages);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      for (let page = 0; page < actualPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        // Add title on first page
        if (page === 0) {
          pdf.setFontSize(16);
          pdf.text(data.title, pageWidthMM / 2, marginMM + 8, { align: 'center' });
          pdf.setFontSize(10);
          pdf.text(`Piano - ${data.bpm} BPM`, pageWidthMM / 2, marginMM + 15, { align: 'center' });
        }

        // Calculate viewBox for this page
        const viewBoxX = page * svgWidthPerPage;
        const viewBoxW = Math.min(svgWidthPerPage, svgWidth - viewBoxX);

        // Clone and modify SVG
        const svgClone = svgElement.cloneNode(true) as SVGElement;
        svgClone.setAttribute('viewBox', `${viewBoxX} 0 ${viewBoxW} ${svgHeight}`);
        
        // Set larger dimensions for high-res rendering
        const renderWidth = Math.round(viewBoxW * scale);
        const renderHeight = Math.round(svgHeight * scale);
        svgClone.setAttribute('width', String(renderWidth));
        svgClone.setAttribute('height', String(renderHeight));
        
        // Embed Bravura font in SVG for proper rendering
        embedFontInSvg(svgClone, fontBase64);

        // Add white background rect at the beginning (after defs)
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', String(viewBoxX));
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('width', String(viewBoxW));
        bgRect.setAttribute('height', String(svgHeight));
        bgRect.setAttribute('fill', 'white');
        // Insert after defs (which contains the font)
        const defs = svgClone.querySelector('defs');
        if (defs && defs.nextSibling) {
          svgClone.insertBefore(bgRect, defs.nextSibling);
        } else {
          svgClone.insertBefore(bgRect, svgClone.firstChild);
        }

        // Serialize SVG to string and create data URL
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
        const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

        // Load image
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => {
            console.error('Image load error:', e);
            reject(new Error('Image load failed'));
          };
          img.src = svgDataUrl;
        });

        // Create high-resolution canvas
        const canvas = document.createElement('canvas');
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, renderWidth, renderHeight);
        }

        // Add to PDF with JPEG for smaller file size
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const yOffset = page === 0 ? marginMM + titleHeightMM : marginMM;
        const imgWidthMM = contentWidthMM * (viewBoxW / svgWidthPerPage);
        const imgHeightMM = contentHeightMM;
        pdf.addImage(imgData, 'JPEG', marginMM, yOffset, imgWidthMM, imgHeightMM);

        // Page number
        pdf.setFontSize(8);
        pdf.text(`${page + 1} / ${actualPages}`, pageWidthMM / 2, pageHeightMM - 5, { align: 'center' });
      }

      // Try to save to the same folder as uploaded file using File System Access API
      const fileName = `${data.title}.pdf`;
      
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as unknown as { showSaveFilePicker: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          const writable = await handle.createWritable();
          const pdfBlob = pdf.output('blob');
          await writable.write(pdfBlob);
          await writable.close();
        } catch (e) {
          // User cancelled or API not supported, fallback to regular download
          if ((e as Error).name !== 'AbortError') {
            pdf.save(fileName);
          }
        }
      } else {
        // Fallback for browsers without File System Access API
        pdf.save(fileName);
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <main className="w-full max-w-5xl space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
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
            변환 완료
          </div>
          <button 
            onClick={downloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                PDF 다운로드
              </>
            )}
          </button>
        </div>
      </div>

      <div ref={sheetRef}>
        <MusicSheet data={data} />
      </div>

      <div className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-start gap-4 no-print">
        <div className="bg-blue-500 p-2 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="space-y-1">
          <h4 className="text-white font-bold">오프라인 AI 분석 엔진</h4>
          <p className="text-gray-400 text-sm leading-relaxed">
            이 악보는 Spotify Basic Pitch AI 모델을 사용하여 생성되었습니다.
            모든 분석은 브라우저에서 로컬로 처리되며, 오디오 파일은 서버로 전송되지 않습니다.
          </p>
        </div>
      </div>
    </main>
  );
};

export default ResultView;
