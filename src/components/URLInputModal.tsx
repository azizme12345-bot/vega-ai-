import React, { useState } from 'react';
import { X, Globe, Link2, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { SupportedLanguage } from '../types';

interface URLInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitUrl: (url: string, title?: string, summaryText?: string) => void;
  language: SupportedLanguage;
}

export const URLInputModal: React.FC<URLInputModalProps> = ({
  isOpen,
  onClose,
  onSubmitUrl,
  language,
}) => {
  const isUrdu = language === 'ur-PK';
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<{ title: string; excerpt: string } | null>(null);

  if (!isOpen) return null;

  const handleFetchUrl = async () => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
      setUrl(cleanUrl);
    }

    setIsLoading(true);
    setError(null);
    setFetchedData(null);

    try {
      const res = await fetch('/api/url/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch webpage');
      }

      setFetchedData({
        title: data.title || cleanUrl,
        excerpt: data.excerpt || '',
      });
    } catch (err: any) {
      setError(err.message || 'اس لنک کا ڈیٹا لانے میں ناکامی ہوئی۔ آپ پھر بھی اسے AI سے پوچھ سکتے ہیں۔');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachAndSubmit = () => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    onSubmitUrl(cleanUrl, fetchedData?.title, fetchedData?.excerpt);
    onClose();
    setUrl('');
    setFetchedData(null);
    setError(null);
  };

  return (
    <div
      id="url-input-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="url-input-modal-container"
        className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                {isUrdu ? 'ویب سائٹ لنک / یوآرایل تجزیہ (Web Link Analysis)' : 'Web Page / URL Grounding'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isUrdu ? 'کوئی بھی ویب پیج یا لنک دیں، AI اسے براہ راست پڑھے گا' : 'Provide any web link for live analysis and summarization'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              {isUrdu ? 'ویب سائٹ کا لنک درج کریں (URL)' : 'Enter Web Page URL:'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                  placeholder="https://example.com/article"
                  className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isLoading || !url.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium rounded-xl border border-neutral-700 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <ArrowRight className="w-4 h-4" />}
                <span>{isUrdu ? 'پڑھیں' : 'Fetch'}</span>
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-neutral-400 font-medium">
              {isUrdu ? 'مثالیں:' : 'Try:'}
            </span>
            {[
              'https://en.wikipedia.org/wiki/Artificial_intelligence',
              'https://developer.mozilla.org/en-US/',
              'https://news.ycombinator.com',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setUrl(sample)}
                className="px-2 py-0.5 text-[11px] bg-neutral-800/80 hover:bg-neutral-750 text-neutral-300 rounded-md border border-neutral-700/60 truncate max-w-[200px]"
              >
                {sample.replace('https://', '')}
              </button>
            ))}
          </div>

          {/* Result Card */}
          {fetchedData && (
            <div className="p-3.5 bg-neutral-800/80 border border-blue-500/30 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'ویب صفحہ کامیابی سے منسلک ہو گیا!' : 'Web page ready for analysis!'}</span>
              </div>
              <p className="font-semibold text-neutral-200 text-xs line-clamp-1">{fetchedData.title}</p>
              <p className="text-neutral-400 text-[11px] line-clamp-2">{fetchedData.excerpt}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {isUrdu ? 'منسوخ' : 'Cancel'}
          </button>
          <button
            type="button"
            id="attach-url-btn"
            onClick={handleAttachAndSubmit}
            disabled={!url.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-md transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isUrdu ? 'AI سے تجزیہ کروائیں' : 'Analyze in Chat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
