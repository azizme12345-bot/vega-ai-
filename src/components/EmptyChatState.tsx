import React from 'react';
import { Sparkles } from 'lucide-react';
import { SupportedLanguage } from '../types';

interface EmptyChatStateProps {
  onSelectStarter?: (prompt: string) => void;
  onOpenCVBuilder?: () => void;
  onOpenUrlModal?: () => void;
  speechLang: SupportedLanguage;
  userName?: string;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  speechLang,
}) => {
  const isUrdu = speechLang === 'ur-PK';

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 max-w-2xl mx-auto w-full my-auto text-center select-none animate-in fade-in duration-300">
      {/* Prominent, Beautiful Large VEGA AI Logo & Emblem */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Soft Ambient Glow Aura */}
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-600/20 via-indigo-500/20 to-purple-600/20 blur-2xl opacity-70" />

        {/* Outer Circular Ring */}
        <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1e2229] via-[#16181d] to-[#0f1115] border border-[#333a44] shadow-2xl">
          {/* Logo Mark: Stylized Star & Diamond V */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-14 w-14 sm:h-16 sm:w-16 drop-shadow-md"
          >
            <defs>
              <linearGradient id="vegaGradPrimary" x1="10%" y1="0%" x2="90%" y2="100%">
                <stop offset="0%" stopColor="#7cacf8" />
                <stop offset="45%" stopColor="#4285f4" />
                <stop offset="100%" stopColor="#9b72cf" />
              </linearGradient>
              <linearGradient id="vegaGradAccent" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a8c7fa" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            {/* Dynamic V-shaped wings */}
            <path
              d="M 22 26 L 50 82 L 78 26 L 63 26 L 50 60 L 37 26 Z"
              fill="url(#vegaGradPrimary)"
            />
            {/* Inner Celestial Core */}
            <polygon
              points="50,18 55,30 68,34 57,43 60,56 50,48 40,56 43,43 32,34 45,30"
              fill="url(#vegaGradAccent)"
            />
          </svg>
        </div>
      </div>

      {/* Large App Title */}
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
        <span className="bg-gradient-to-r from-[#7cacf8] via-[#a8c7fa] to-[#d3e3fd] bg-clip-text text-transparent">
          VEGA AI
        </span>
      </h1>

      {/* Clean, Elegant Subtitle */}
      <p className="text-sm sm:text-base text-[#9aa0a6] max-w-md mx-auto leading-relaxed">
        {isUrdu ? (
          <>
            <span>ویگا اے آئی • آپ کا ذہین ذاتی اسسٹنٹ</span>
            <br />
            <span className="text-xs text-[#80868b] mt-1 inline-block">
              سی وی بنائیں، تصویر یا ویڈیو اینالائز کریں، یا کوئی بھی سوال پوچھیں
            </span>
          </>
        ) : (
          <>
            <span>Intelligent Multimodal Assistant</span>
            <br />
            <span className="text-xs text-[#80868b] mt-1 inline-block">
              Create a CV, analyze photos & videos, generate images, or ask anything
            </span>
          </>
        )}
      </p>
    </div>
  );
};
