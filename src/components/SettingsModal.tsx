import React, { useState } from 'react';
import {
  X,
  Moon,
  Sun,
  Mic,
  Volume2,
  Trash2,
  Cpu,
  Info,
  Shield,
  Smartphone,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AppSettings, SupportedLanguage } from '../types';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClearAllData: () => void;
  isOnline: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllData,
  isOnline,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'preferences' | 'voice' | 'about'>('preferences');

  if (!isOpen) return null;

  const handleSpeechLangChange = (lang: SupportedLanguage) => {
    const updated = { ...localSettings, speechLang: lang };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleThemeChange = (theme: 'dark' | 'light' | 'system') => {
    const updated = { ...localSettings, theme };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleTtsToggle = (enabled: boolean) => {
    const updated = { ...localSettings, ttsEnabled: enabled };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleTtsRateChange = (rate: number) => {
    const updated = { ...localSettings, ttsRate: rate };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleSystemPromptChange = (customSystemPrompt: string) => {
    const updated = { ...localSettings, customSystemPrompt };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="flex flex-col w-full max-w-lg max-h-[90vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Settings</h2>
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              v1.0.0
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'preferences'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            General & Theme
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'voice'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Voice & Audio
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`border-b-2 py-3 px-3 transition ${
              activeTab === 'about'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            About & Platforms
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {activeTab === 'preferences' && (
            <>
              {/* Theme section */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-2">
                  Appearance Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 transition ${
                      localSettings.theme === 'light'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 transition ${
                      localSettings.theme === 'dark'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Moon className="h-4 w-4 text-indigo-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('system')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 transition ${
                      localSettings.theme === 'system'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Cpu className="h-4 w-4 text-slate-400" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              {/* AI Model & System prompt */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  AI Model & Engine
                </label>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">Gemini 3.8 Flash</span>
                    <span className="flex items-center gap-1 text-emerald-500 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Server-Side Active
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    High-speed multimodal AI engine supporting text generation, real-time speech processing, and visual understanding.
                  </p>
                </div>

                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  Custom System Instructions (Optional)
                </label>
                <textarea
                  value={localSettings.customSystemPrompt}
                  onChange={(e) => handleSystemPromptChange(e.target.value)}
                  placeholder="e.g. You are a concise coding expert who prefers TypeScript..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Clear data section */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  Chat Data & Storage
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  All your conversations and photos are stored securely on your device via IndexedDB.
                </p>

                {showClearConfirm ? (
                  <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-semibold mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Permanently delete all chat history?</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onClearAllData();
                          setShowClearConfirm(false);
                        }}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700 transition"
                      >
                        Yes, Delete All
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    id="settings-clear-data-btn"
                    className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Clear All Local Chats & Cache</span>
                  </button>
                )}
              </div>
            </>
          )}

          {activeTab === 'voice' && (
            <>
              {/* Voice recognition language */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="h-4 w-4 text-indigo-500" />
                  <label className="text-xs font-semibold text-slate-900 dark:text-white">
                    Speech Recognition Language 🎤
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Controls the live microphone recognition dialect for voice queries:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSpeechLangChange('en-US')}
                    className={`flex flex-col items-start rounded-xl border p-2.5 transition text-left ${
                      localSettings.speechLang === 'en-US'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>English</span>
                    <span className="text-[10px] text-slate-400">en-US</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeechLangChange('ur-PK')}
                    className={`flex flex-col items-start rounded-xl border p-2.5 transition text-left ${
                      localSettings.speechLang === 'ur-PK'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>اردو (Urdu)</span>
                    <span className="text-[10px] text-slate-400">ur-PK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeechLangChange('pa-PK')}
                    className={`flex flex-col items-start rounded-xl border p-2.5 transition text-left ${
                      localSettings.speechLang === 'pa-PK'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>ਪੰਜਾਬੀ (Punjabi)</span>
                    <span className="text-[10px] text-slate-400">pa-PK</span>
                  </button>
                </div>
              </div>

              {/* Text to Speech Voice Output */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-indigo-500" />
                    <div>
                      <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                        AI Voice Output (Speaker) 🔊
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Enable read-aloud functionality on AI answers
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.ttsEnabled}
                    onChange={(e) => handleTtsToggle(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                {localSettings.ttsEnabled && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                        <span>Reading Speed:</span>
                        <span className="font-semibold">{localSettings.ttsRate}x</span>
                      </div>
                      <div className="flex gap-2">
                        {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => handleTtsRateChange(rate)}
                            className={`flex-1 rounded-lg py-1 text-center font-medium transition ${
                              localSettings.ttsRate === rate
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'about' && (
            <>
              {/* App platforms */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-2">
                  Unified Multiplatform Architecture
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                        🌐
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">Web App</span>
                        <span className="block text-[10px] text-slate-400">Universal browser client</span>
                      </div>
                    </div>
                    <span className="text-emerald-500 font-semibold text-[11px]">Active</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
                        📱
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">Progressive Web App (PWA)</span>
                        <span className="block text-[10px] text-slate-400">Offline service worker & home screen install</span>
                      </div>
                    </div>
                    <PWAInstallPrompt variant="button" />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">Android App (Capacitor)</span>
                        <span className="block text-[10px] text-slate-400">Shared codebase with native hardware back button</span>
                      </div>
                    </div>
                    <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Configured
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy & Security */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Privacy & Security
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your API keys and server credentials remain strictly server-side. Photos are pre-processed and compressed on-device before transmission. No personal chat data is shared with third parties.
                </p>
              </div>

              {/* Version info */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/30 p-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div><strong>Application:</strong> VEGA AI</div>
                <div><strong>Version:</strong> 2.5.0 Production Ready</div>
                <div><strong>Speech Support:</strong> en-US, ur-PK, pa-PK</div>
                <div><strong>Architecture:</strong> Full-Stack + Multimodal + Offline Cache</div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
