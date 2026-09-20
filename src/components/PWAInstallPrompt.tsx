import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  variant?: 'button' | 'banner' | 'compact';
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // If already installed or neither installable nor iOS, return null
  if (isInstalled) return null;
  if (!isInstallable && !isIOS) return null;
  if (variant === 'banner' && bannerDismissed) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await install();
    }
  };

  return (
    <>
      {variant === 'banner' && (
        <div className="mx-2 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#333538] bg-[#1e1f20] p-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#4285f4] to-[#9b72cb] text-white shadow-xs">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#e3e3e3]">
                Install VEGA AI
              </p>
              <p className="text-[11px] text-[#8e918f]">
                Fast offline access, voice input, and native app experience
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="rounded-full bg-[#e3e3e3] px-3 py-1 text-xs font-semibold text-[#131314] hover:bg-white transition"
            >
              Install
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="rounded-full p-1 text-[#8e918f] hover:text-[#e3e3e3]"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {variant === 'button' && (
        <button
          onClick={handleInstallClick}
          id="pwa-install-app-btn"
          className="flex items-center gap-1.5 rounded-full border border-[#333538] bg-[#1e1f20] hover:bg-[#282a2c] px-3 py-1 text-xs font-medium text-[#c4c7c5] hover:text-white transition"
          title="Install as Progressive Web App"
        >
          <Download className="h-3.5 w-3.5 text-[#7cacf8]" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleInstallClick}
          id="pwa-install-app-compact-btn"
          className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-xs font-medium text-[#c4c7c5] hover:bg-[#282a2c] hover:text-[#e3e3e3] transition"
        >
          <Download className="h-4 w-4 text-[#7cacf8] shrink-0" />
          <span>Install VEGA AI App</span>
        </button>
      )}

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#333538] bg-[#1e1f20] p-5 shadow-2xl animate-in fade-in zoom-in-95 text-[#e3e3e3]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white">
                Install on iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="rounded-full p-1 text-[#8e918f] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[#8e918f] mb-4 leading-relaxed">
              To install <strong>VEGA AI</strong> as a standalone PWA on your iOS device:
            </p>
            <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-[11px]">
                  1
                </span>
                <span className="flex items-center gap-1.5">
                  Tap the <Share className="inline h-3.5 w-3.5 text-indigo-500" /> <strong>Share</strong> button in the Safari toolbar.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-[11px]">
                  2
                </span>
                <span className="flex items-center gap-1.5">
                  Scroll down and tap <PlusSquare className="inline h-3.5 w-3.5 text-indigo-500" /> <strong>Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-[11px]">
                  3
                </span>
                <span>Confirm by tapping <strong>Add</strong> in the top right.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full rounded-xl bg-slate-900 dark:bg-slate-100 py-2.5 text-xs font-semibold text-white dark:text-slate-900 transition hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
