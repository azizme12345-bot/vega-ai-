import React from 'react';
import { Volume2, VolumeX, Pause, Play, Square, FastForward } from 'lucide-react';
import { SupportedLanguage } from '../types';

interface VoicePlayerBarProps {
  isSpeaking: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  language: SupportedLanguage;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
}

export const VoicePlayerBar: React.FC<VoicePlayerBarProps> = ({
  isSpeaking,
  isPaused,
  onPause,
  onResume,
  onStop,
  language,
  autoSpeak,
  onToggleAutoSpeak,
}) => {
  if (!isSpeaking) return null;

  const isUrdu = language === 'ur-PK';

  return (
    <div
      id="voice-player-bar"
      className="fixed bottom-24 right-4 z-40 flex items-center gap-3 rounded-full border border-blue-500/40 bg-neutral-900/95 backdrop-blur-md px-4 py-2 text-neutral-100 shadow-2xl animate-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
        </span>
        <span className="text-xs font-medium text-neutral-200">
          {isPaused
            ? (isUrdu ? 'آواز رکی ہوئی ہے' : 'Audio paused')
            : (isUrdu ? 'جواب بولا جا رہا ہے...' : 'Speaking response...')}
        </span>
      </div>

      <div className="flex items-center gap-1 border-l border-neutral-700 pl-2">
        {isPaused ? (
          <button
            type="button"
            onClick={onResume}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-200 transition"
            title="پلے کریں / Resume"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-200 transition"
            title="روکیں / Pause"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onStop}
          className="p-1.5 rounded-full hover:bg-neutral-800 text-rose-400 transition"
          title="بند کریں / Stop"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>
    </div>
  );
};
