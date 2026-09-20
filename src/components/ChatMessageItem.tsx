import React, { useState, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  User,
  AlertCircle,
  Loader2,
  Film,
} from 'lucide-react';
import { ChatMessage, SupportedLanguage, ChatImage } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CVCardExporter } from './CVCardExporter';

interface ChatMessageItemProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onSpeak?: (id: string, text: string) => void;
  isSpeaking: boolean;
  isLoadingAudio?: boolean;
  speechLang: SupportedLanguage;
  onImageClick?: (image: ChatImage) => void;
  onCreateVideoFromImage?: (imageUrl: string, prompt?: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onSpeak,
  isSpeaking,
  isLoadingAudio = false,
  speechLang,
  onImageClick,
  onCreateVideoFromImage,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';

  // Extract any image URL from message images or markdown
  const detectedImageUrl = useMemo(() => {
    if (message.images && message.images.length > 0) {
      return message.images[0].data;
    }
    if (message.content) {
      const match = message.content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)/);
      if (match && match[1]) return match[1];
    }
    return null;
  }, [message.images, message.content]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isCV = useMemo(() => {
    if (isStreaming || !message.content || isUser || isError) return false;
    const c = message.content.toLowerCase();
    // Must look like an actual structured CV document, not just casual conversation or asking about CV
    const hasCvTitle =
      c.includes('# curriculum vitae') ||
      c.includes('curriculum vitae\n') ||
      c.includes('# resume') ||
      c.includes('# سی وی') ||
      c.includes('**curriculum vitae**') ||
      c.includes('**resume**');

    const hasMultipleSections =
      (c.includes('experience') && c.includes('education') && c.includes('skills')) ||
      (c.includes('تجربہ') && c.includes('تعلیم') && c.includes('مہارت'));

    return (hasCvTitle || (hasMultipleSections && message.content.length > 250));
  }, [message.content, isStreaming, isUser, isError]);

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex w-full gap-3 px-3 py-4 sm:px-6 transition-colors ${
        isUser
          ? 'justify-end'
          : 'justify-start'
      }`}
    >
      {/* Assistant Avatar (Gemini iridescent star) */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white shadow-xs">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      {/* Message content container */}
      <div
        className={`flex max-w-[88%] sm:max-w-[82%] flex-col ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Attached Images & PDFs */}
        {message.images && message.images.length > 0 && (
          <div className={`mb-2 flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {message.images.map((img) => {
              const isPdf = img.mimeType === 'application/pdf' || img.name?.toLowerCase().endsWith('.pdf') || img.mediaType === 'pdf';
              const isVideo = img.mediaType === 'video' || img.mimeType?.startsWith('video/');
              return (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-2xl border border-[#333538] bg-[#1e1f20] shadow-sm transition"
                >
                  {isVideo ? (
                    <div className="flex flex-col bg-black max-w-sm rounded-2xl overflow-hidden">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        className="max-h-64 w-full object-contain bg-black"
                        src={img.previewUrl?.startsWith('data:video') ? img.previewUrl : (img.data ? `data:${img.mimeType || 'video/mp4'};base64,${img.data}` : img.previewUrl)}
                      />
                      <div className="flex items-center justify-between p-2.5 bg-[#1a1b1e] text-[11px] text-[#c4c7c5]">
                        <span className="truncate max-w-[200px] font-medium">{img.name || 'Video clip'}</span>
                        {img.durationSeconds ? (
                          <span className="font-mono bg-[#282a2c] px-2 py-0.5 rounded text-white text-[10px]">
                            {Math.floor(img.durationSeconds / 60)}:{String(img.durationSeconds % 60).padStart(2, '0')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : isPdf ? (
                    <div
                      onClick={() => onImageClick?.(img)}
                      className="cursor-pointer flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl min-w-[200px]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                        PDF
                      </div>
                      <div className="flex flex-col text-left truncate">
                        <span className="text-xs font-semibold text-neutral-200 truncate max-w-[150px]">
                          {img.name || 'Document.pdf'}
                        </span>
                        <span className="text-[10px] text-neutral-400">PDF Document</span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={img.previewUrl}
                      alt={img.name || 'Uploaded photo'}
                      onClick={() => onImageClick?.(img)}
                      className="cursor-pointer max-h-60 max-w-full rounded-2xl object-contain sm:max-h-80"
                      loading="lazy"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Text bubble */}
        <div
          className={`rounded-[22px] px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#282a2c] text-[#e3e3e3] rounded-br-md border border-[#37393b]/60'
              : isError
              ? 'border border-rose-900/60 bg-[#251819] text-[#f28b82] rounded-bl-md'
              : 'text-[#e3e3e3] px-1 py-1'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : isError ? (
            <div className="flex items-start gap-2.5 p-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#f28b82] mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-[#f28b82]">Could not complete response</p>
                <p className="text-xs mt-0.5 text-[#c4c7c5] leading-relaxed">
                  {message.errorMessage || message.content || 'The request could not be completed.'}
                </p>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    id={`retry-error-btn-${message.id}`}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#3c2426] hover:bg-[#4d2d30] text-[#f28b82] border border-[#5c3236] transition cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Try again</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <MarkdownRenderer content={message.content} />
              {isStreaming && (
                <span className="inline-block h-3.5 w-1.5 ml-1 align-middle bg-[#7cacf8] animate-pulse rounded-xs" />
              )}
              {/* CV Action & Download Card if this message contains a CV */}
              {isCV && (
                <CVCardExporter content={message.content} language={speechLang} />
              )}
            </div>
          )}
        </div>

        {/* Footer actions & timestamp */}
        <div
          className={`mt-1.5 flex items-center gap-2 text-[11px] text-[#8e918f] ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{formattedTime}</span>

          {/* Action Buttons for both User and Assistant */}
          {!isError && message.content && (
            <div className="flex items-center gap-1.5 opacity-90 transition-opacity">
              {/* Speaker / Read Aloud button */}
              <button
                type="button"
                onClick={() => onSpeak?.(message.id, message.content)}
                id={`speak-btn-${message.id}`}
                disabled={isStreaming}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition cursor-pointer font-medium select-none ${
                  isSpeaking
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/50 animate-pulse'
                    : isLoadingAudio
                    ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                    : isStreaming
                    ? 'opacity-40 cursor-not-allowed bg-[#282a2c]/40 text-[#8e918f]'
                    : 'bg-[#282a2c]/60 text-[#c4c7c5] hover:bg-[#323538] hover:text-white border border-[#3c4043]/50'
                }`}
                title={
                  isSpeaking
                    ? 'Stop speaking (اسپیکر بند کریں)'
                    : isLoadingAudio
                    ? 'Loading voice... (آواز تیار ہو رہی ہے)'
                    : 'Listen via speaker (اسپیکر سے سنیں)'
                }
              >
                {isLoadingAudio ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                    <span>لوڈ ہو رہا ہے...</span>
                  </>
                ) : isSpeaking ? (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-white" />
                    <span>روکیں (Stop)</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>سنیں (Listen)</span>
                  </>
                )}
              </button>

              {/* Copy message button */}
              <button
                onClick={handleCopyText}
                id={`copy-msg-btn-${message.id}`}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-[#8e918f] hover:bg-[#282a2c] hover:text-[#e3e3e3] transition"
                title="Copy text (کاپی کریں)"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-[#81c995]" />
                    <span className="text-[#81c995]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Create Video from Image button */}
              {detectedImageUrl && onCreateVideoFromImage && (
                <button
                  type="button"
                  onClick={() => onCreateVideoFromImage(detectedImageUrl, message.content)}
                  id={`video-from-img-btn-${message.id}`}
                  className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
                  title="اس تصویر سے مکمل ویڈیو بنائیں"
                >
                  <Film className="h-3 w-3 text-rose-400" />
                  <span>اس سے ویڈیو بنائیں</span>
                </button>
              )}

              {/* Regenerate button (on last assistant message) */}
              {!isUser && isLastAssistant && !isStreaming && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  id="chat-regenerate-btn"
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-[#8e918f] hover:bg-[#282a2c] hover:text-[#e3e3e3] transition"
                  title="Regenerate this response"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#4285f4] to-[#9b72cb] text-white font-semibold text-xs shadow-xs">
          A
        </div>
      )}
    </div>
  );
};
