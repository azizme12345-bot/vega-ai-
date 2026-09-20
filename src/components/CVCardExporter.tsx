import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  FileImage
} from 'lucide-react';
import { SupportedLanguage } from '../types';

interface CVCardExporterProps {
  content: string;
  language?: SupportedLanguage;
}

export const CVCardExporter: React.FC<CVCardExporterProps> = ({
  content,
  language = 'ur-PK',
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const isUrdu = language === 'ur-PK';

  // Extract name and headline if available from markdown
  const lines = content.split('\n');
  const nameLine = lines.find((l) => l.startsWith('# '))?.replace(/^#\s*/, '') || 'Professional CV';
  const roleLine = lines.find((l) => l.startsWith('## ') || l.startsWith('**Title:')) || 'Curriculum Vitae';

  // Copy plain text
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Print CV as clean PDF layout
  const handlePrintOrPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${isUrdu ? 'ur' : 'en'}" dir="${isUrdu ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${nameLine} - CV</title>
        <style>
          @page {
            size: A4;
            margin: 18mm 20mm;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .cv-container {
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #0b57d0;
            font-size: 26px;
            border-bottom: 2px solid #e0e2ec;
            padding-bottom: 8px;
            margin-bottom: 6px;
          }
          h2 {
            color: #1f1f1f;
            font-size: 18px;
            margin-top: 18px;
            margin-bottom: 6px;
            border-bottom: 1px solid #eee;
            padding-bottom: 4px;
          }
          h3 {
            font-size: 15px;
            color: #333;
            margin-top: 12px;
            margin-bottom: 4px;
          }
          p, li {
            font-size: 14px;
            color: #333;
          }
          ul {
            padding-inline-start: 20px;
            margin: 6px 0;
          }
          .footer-note {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="cv-container">
          ${renderMarkdownToBasicHtml(content)}
          <div class="footer-note">
            Generated with VEGA AI • Professional CV Builder
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Export CV as High-Definition Image (PNG / JPG)
  const handleExportImage = async () => {
    setIsExportingImage(true);
    try {
      const canvas = document.createElement('canvas');
      const width = 1200;
      const padding = 60;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Estimate height by line wrapping
      const lineHeight = 28;
      const estimatedLines = content.split('\n').reduce((acc, line) => {
        return acc + Math.max(1, Math.ceil(line.length / 55));
      }, 0);

      const height = Math.max(1600, estimatedLines * lineHeight + padding * 2 + 200);
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Top decorative header bar
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#1a73e8');
      grad.addColorStop(0.5, '#7cacf8');
      grad.addColorStop(1, '#a142f4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, 12);

      // Watermark / Brand Header
      ctx.fillStyle = '#5f6368';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('VEGA AI • PROFESSIONAL CV', padding, 45);

      // Content writing
      let currentY = 95;
      const contentLines = content.split('\n');

      for (const rawLine of contentLines) {
        const line = rawLine.trim();

        if (!line) {
          currentY += 14;
          continue;
        }

        if (line.startsWith('# ')) {
          ctx.fillStyle = '#1a73e8';
          ctx.font = 'bold 36px sans-serif';
          ctx.fillText(line.replace(/^#\s*/, ''), padding, currentY);
          currentY += 46;
          // Divider
          ctx.strokeStyle = '#dadce0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(padding, currentY - 14);
          ctx.lineTo(width - padding, currentY - 14);
          ctx.stroke();
          currentY += 10;
        } else if (line.startsWith('## ')) {
          currentY += 18;
          ctx.fillStyle = '#202124';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText(line.replace(/^##\s*/, ''), padding, currentY);
          currentY += 32;
        } else if (line.startsWith('### ')) {
          currentY += 10;
          ctx.fillStyle = '#3c4043';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText(line.replace(/^###\s*/, ''), padding, currentY);
          currentY += 26;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          ctx.fillStyle = '#1a73e8';
          ctx.font = '16px sans-serif';
          ctx.fillText('•', padding + 10, currentY);

          ctx.fillStyle = '#3c4043';
          ctx.font = '16px sans-serif';
          const bulletText = line.replace(/^[-*]\s*/, '');
          currentY = wrapAndDrawText(ctx, bulletText, padding + 30, currentY, width - padding * 2 - 40, lineHeight);
        } else {
          ctx.fillStyle = '#3c4043';
          ctx.font = '16px sans-serif';
          currentY = wrapAndDrawText(ctx, line, padding, currentY, width - padding * 2, lineHeight);
        }

        if (currentY > height - 100) break;
      }

      // Footer
      ctx.fillStyle = '#80868b';
      ctx.font = '14px sans-serif';
      ctx.fillText('Created with VEGA AI • Professional Multimodal Career Suite', padding, height - 35);

      // Download file
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = (nameLine.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_') || 'My_CV').slice(0, 30);
      a.download = `${safeName}_CV.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="my-3 rounded-2xl border border-blue-500/30 bg-[#161b22] p-3.5 sm:p-4 text-[#e3e3e3] shadow-md">
      {/* Header bar of CV Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e3134] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
              <span>{isUrdu ? 'سی وی تیار ہے (CV Ready)' : 'Professional CV Ready'}</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300 border border-blue-500/20">
                <Sparkles className="h-2.5 w-2.5" />
                <span>ATS Formatted</span>
              </span>
            </h4>
            <p className="text-[11px] text-[#9aa0a6] truncate max-w-[280px]">
              {nameLine}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Download PDF / Print button */}
          <button
            type="button"
            onClick={handlePrintOrPDF}
            id="download-cv-pdf-btn"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:scale-[1.02] cursor-pointer"
            title="Download PDF or Print"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isUrdu ? 'پی ڈی ایف ڈاؤن لوڈ (PDF)' : 'Download PDF'}</span>
          </button>

          {/* Download Image (PNG/JPG) button */}
          <button
            type="button"
            onClick={handleExportImage}
            disabled={isExportingImage}
            id="download-cv-image-btn"
            className="flex items-center gap-1.5 rounded-xl bg-[#282a2c] hover:bg-[#333538] text-[#e3e3e3] border border-[#3c4043] px-3 py-1.5 text-xs font-medium transition cursor-pointer"
            title="Download as JPG/PNG Photo"
          >
            <FileImage className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isExportingImage ? '...' : (isUrdu ? 'فوٹو ڈاؤن لوڈ (PNG/JPG)' : 'Save as Image')}</span>
          </button>

          {/* Copy text button */}
          <button
            type="button"
            onClick={handleCopy}
            id="copy-cv-text-btn"
            className="flex items-center gap-1 rounded-xl bg-[#212325] hover:bg-[#2e3134] text-[#c4c7c5] px-2.5 py-1.5 text-xs transition border border-[#333538]"
            title="Copy Markdown Text"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? (isUrdu ? 'کاپی ہو گیا' : 'Copied') : (isUrdu ? 'کاپی' : 'Copy')}</span>
          </button>
        </div>
      </div>

      {/* Instant tips */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#8e918f]">
        <span>
          {isUrdu
            ? '💡 پی ڈی ایف یا فوٹو بٹن پر کلک کر کے سی وی اپنے فون یا کمپیوٹر میں محفوظ کریں۔'
            : '💡 Click Download PDF or Save as Image to save directly to your device.'}
        </span>
      </div>
    </div>
  );
};

// Helper: Word wrap on Canvas
function wrapAndDrawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let currentLine = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(currentLine, x, currentY);
      currentLine = words[n];
      currentY += lineHeight;
    } else {
      currentLine = testLine;
    }
  }
  ctx.fillText(currentLine, x, currentY);
  return currentY + lineHeight;
}

// Helper: Minimal Markdown converter for printable HTML
function renderMarkdownToBasicHtml(md: string): string {
  let html = md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '<p></p>');

  // Wrap loose <li> with <ul>
  html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>');
  return html;
}
