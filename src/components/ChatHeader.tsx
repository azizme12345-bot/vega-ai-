import React, { useState } from 'react';
import {
  Menu,
  MoreVertical,
  Trash2,
  Edit2,
  Share2,
  Languages,
  WifiOff,
  Wifi,
  Sparkles,
  Plus,
  ChevronDown,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  FileText,
  Globe,
  Copy,
  Check,
  Image as ImageIcon,
  Film,
} from 'lucide-react';
import { Conversation, SupportedLanguage } from '../types';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface ChatHeaderProps {
  conversation: Conversation | null;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onClearConversation: () => void;
  onRenameConversation: (newTitle: string) => void;
  onDeleteConversation: () => void;
  speechLang: SupportedLanguage;
  onChangeSpeechLang: (lang: SupportedLanguage) => void;
  isOnline: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  autoSpeakEnabled?: boolean;
  onToggleAutoSpeak?: () => void;
  onOpenCVBuilder?: () => void;
  onOpenUrlModal?: () => void;
  onCopyAllMessages?: () => void;
  onOpenImageStudio?: () => void;
  onOpenVideoStudio?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onToggleSidebar,
  onNewChat,
  onClearConversation,
  onRenameConversation,
  onDeleteConversation,
  speechLang,
  onChangeSpeechLang,
  isOnline,
  isDarkMode = true,
  onToggleDarkMode,
  autoSpeakEnabled = false,
  onToggleAutoSpeak,
  onOpenCVBuilder,
  onOpenUrlModal,
  onCopyAllMessages,
  onOpenImageStudio,
  onOpenVideoStudio,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState(conversation?.title || 'New Chat');
  const [copiedAll, setCopiedAll] = useState(false);

  const isUrdu = speechLang === 'ur-PK';

  const languages: { code: SupportedLanguage; label: string; flag: string }[] = [
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'ur-PK', label: 'اردو (Urdu)', flag: '🇵🇰' },
    { code: 'pa-PK', label: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇵🇰' },
  ];

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameText.trim()) {
      onRenameConversation(renameText.trim());
    }
    setIsRenaming(false);
  };

  const handleCopyAll = async () => {
    if (onCopyAllMessages) {
      onCopyAllMessages();
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      return;
    }

    if (!conversation) return;
    const textToCopy = conversation.messages
      .map((m) => `${m.role === 'user' ? 'User' : 'VEGA AI'}:\n${m.content}`)
      .join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    setShowMenu(false);
    if (!conversation) return;
    const textToShare = conversation.messages
      .map((m) => `${m.role === 'user' ? 'You' : 'VEGA AI'}: ${m.content}`)
      .join('\n\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `VEGA AI - ${conversation.title}`,
          text: textToShare,
        });
      } catch {
        // Safe ignore
      }
    } else {
      handleCopyAll();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#282a2c]/80 bg-[#131314]/90 backdrop-blur-md px-3 sm:px-4">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Sidebar hamburger toggle */}
        <button
          onClick={onToggleSidebar}
          id="header-sidebar-toggle"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#c4c7c5] hover:bg-[#282a2c] hover:text-white transition"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Title or Model pill */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                autoFocus
                onBlur={() => setIsRenaming(false)}
                className="rounded-full border border-[#444746] bg-[#1e1f20] px-3 py-1 text-xs font-semibold text-[#e3e3e3] focus:outline-none focus:border-[#7cacf8]"
              />
            </form>
          ) : (
            <div className="flex items-center gap-2 truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#e3e3e3] font-['Plus_Jakarta_Sans',sans-serif]">
                  VEGA AI
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1e1f20] border border-[#333538] px-2 py-0.5 text-[11px] font-medium text-[#c4c7c5]">
                  <span>Flash 2.5</span>
                  <ChevronDown className="h-3 w-3 text-[#8e918f]" />
                </span>
              </div>

              {conversation && (
                <span
                  onClick={() => {
                    setRenameText(conversation.title);
                    setIsRenaming(true);
                  }}
                  className="hidden md:inline-block cursor-pointer truncate text-xs text-[#8e918f] hover:text-[#e3e3e3] transition border-l border-[#2e3134] pl-2"
                  title="Click to rename"
                >
                  {conversation.title}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* AI Image Studio Button */}
        {onOpenImageStudio && (
          <button
            type="button"
            id="header-image-studio-btn"
            onClick={onOpenImageStudio}
            className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition"
            title="AI Image Studio (حلال فوٹو میکر)"
          >
            <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI فوٹو</span>
          </button>
        )}

        {/* AI Video Studio Button */}
        {onOpenVideoStudio && (
          <button
            type="button"
            id="header-video-studio-btn"
            onClick={onOpenVideoStudio}
            className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20 hover:text-white transition"
            title="AI Video Studio (ویڈیو اسٹوڈیو 5 منٹ)"
          >
            <Film className="h-3.5 w-3.5 text-rose-400" />
            <span className="hidden sm:inline">AI ویڈیو</span>
          </button>
        )}

        {/* Auto-Speak toggle button */}
        {onToggleAutoSpeak && (
          <button
            type="button"
            id="header-auto-speak-btn"
            onClick={onToggleAutoSpeak}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
              autoSpeakEnabled
                ? 'bg-blue-600 text-white font-medium shadow-xs shadow-blue-500/30'
                : 'border border-[#333538] bg-[#1e1f20] text-[#c4c7c5] hover:bg-[#282a2c] hover:text-white'
            }`}
            title={
              autoSpeakEnabled
                ? (isUrdu ? 'خودکار آواز آن ہے (Auto-Speak ON)' : 'Auto-Speak ON: AI answers will be read aloud')
                : (isUrdu ? 'خودکار آواز آف ہے (Auto-Speak OFF)' : 'Auto-Speak OFF: Click to enable voice answers')
            }
          >
            {autoSpeakEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 opacity-60" />}
            <span className="hidden sm:inline">{isUrdu ? 'اسپیکر' : 'Speaker'}</span>
          </button>
        )}

        {/* Dark / Light Mode toggle */}
        {onToggleDarkMode && (
          <button
            type="button"
            id="header-theme-toggle-btn"
            onClick={onToggleDarkMode}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#c4c7c5] hover:bg-[#282a2c] hover:text-white transition"
            title={isDarkMode ? 'Light Mode (لائٹ موڈ)' : 'Dark Mode (ڈارک موڈ)'}
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-blue-300" />}
          </button>
        )}

        {/* Copy Entire Chat button */}
        <button
          type="button"
          id="header-copy-chat-btn"
          onClick={handleCopyAll}
          disabled={!conversation || conversation.messages.length === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#c4c7c5] hover:bg-[#282a2c] hover:text-white disabled:opacity-40 transition"
          title={copiedAll ? 'Copied!' : (isUrdu ? 'پوری چیٹ کاپی کریں' : 'Copy All Messages')}
        >
          {copiedAll ? <Check className="h-4 w-4 text-[#81c995]" /> : <Copy className="h-3.5 w-3.5" />}
        </button>

        {/* Quick Language Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu((v) => !v)}
            id="header-lang-picker-btn"
            className="flex items-center gap-1.5 rounded-full border border-[#333538] bg-[#1e1f20] px-2 py-1 text-xs font-medium text-[#c4c7c5] hover:bg-[#282a2c] hover:text-white transition"
            title="Language"
          >
            <Languages className="h-3.5 w-3.5 text-[#7cacf8]" />
            <span className="hidden sm:inline">
              {speechLang === 'ur-PK' ? 'اردو' : speechLang === 'pa-PK' ? 'ਪੰਜਾਬੀ' : 'EN'}
            </span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 top-10 z-50 w-44 rounded-2xl border border-[#333538] bg-[#1e1f20] p-1.5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[#8e918f] uppercase tracking-wider">
                Language
              </div>
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onChangeSpeechLang(l.code);
                    setShowLangMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition ${
                    speechLang === l.code
                      ? 'bg-[#004a77]/50 text-[#c2e7ff] font-medium'
                      : 'text-[#c4c7c5] hover:bg-[#282a2c] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </div>
                  <span className="text-[10px] text-[#8e918f] font-mono">{l.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Overflow Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            id="header-overflow-menu-btn"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#c4c7c5] hover:bg-[#282a2c] hover:text-white transition"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-2xl border border-[#333538] bg-[#1e1f20] p-1.5 shadow-2xl animate-in fade-in zoom-in-95">
              {conversation && (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setIsRenaming(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[#e3e3e3] hover:bg-[#282a2c] transition"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-[#8e918f]" />
                    <span>Rename Chat</span>
                  </button>
                  <button
                    onClick={handleCopyAll}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[#e3e3e3] hover:bg-[#282a2c] transition"
                  >
                    <Copy className="h-3.5 w-3.5 text-[#8e918f]" />
                    <span>Copy Entire Chat</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[#e3e3e3] hover:bg-[#282a2c] transition"
                  >
                    <Share2 className="h-3.5 w-3.5 text-[#8e918f]" />
                    <span>Share / Export</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onClearConversation();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[#f28b82] hover:bg-[#282a2c] transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Messages</span>
                  </button>
                  <div className="my-1 border-t border-[#2e3134]" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteConversation();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-rose-400 hover:bg-[#282a2c] transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Chat</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
