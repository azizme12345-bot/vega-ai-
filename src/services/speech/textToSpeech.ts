import { SupportedLanguage } from '../../types';

export interface TTSCallbacks {
  onLoading?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export class TextToSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private currentBlobUrl: string | null = null;
  private currentMessageId: string | null = null;
  private isSpeakingInternal = false;
  private isLoadingInternal = false;
  private isPausedInternal = false;
  private keepAliveInterval: any = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private activeMode: 'webAudio' | 'htmlAudio' | 'speechSynthesis' | null = null;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Setup voice list for fallback
      if ('speechSynthesis' in window) {
        const loadVoices = () => {
          try {
            const list = window.speechSynthesis.getVoices();
            if (list && list.length > 0) {
              this.cachedVoices = list;
            }
          } catch {}
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      // Auto-unlock audio on any user interaction
      const unlockHandler = () => {
        this.unlockAudio();
      };

      ['touchstart', 'touchend', 'click', 'keydown'].forEach((eventName) => {
        window.addEventListener(eventName, unlockHandler, { passive: true, capture: true });
      });
    }
  }

  /**
   * Unlocks the mobile audio subsystem and resumes the AudioContext
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;

    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }

      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    } catch {}

    // Unlock HTML5 audio element
    try {
      let el = document.getElementById('vega-tts-audio') as HTMLAudioElement;
      if (!el) {
        el = document.createElement('audio');
        el.id = 'vega-tts-audio';
        el.setAttribute('playsinline', 'true');
        el.setAttribute('webkit-playsinline', 'true');
        el.style.display = 'none';
        document.body.appendChild(el);
      }

      if (!this.isUnlocked) {
        // Play an inaudible 10ms silent wave to give Chrome the user gesture token
        el.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const p = el.play();
        if (p !== undefined) {
          p.then(() => {
            el.pause();
            this.isUnlocked = true;
          }).catch(() => {});
        }
      }
    } catch {}
  }

  isSupported(): boolean {
    return (
      (typeof window !== 'undefined' &&
        (typeof Audio !== 'undefined' ||
          'AudioContext' in window ||
          'webkitAudioContext' in window)) ||
      (typeof window !== 'undefined' && 'speechSynthesis' in window)
    );
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const list = window.speechSynthesis.getVoices();
        if (list && list.length > 0) {
          this.cachedVoices = list;
        }
      } catch {}
    }
    return this.cachedVoices;
  }

  async speak(
    messageId: string,
    rawText: string,
    language: SupportedLanguage = 'en-US',
    rate = 1.0,
    pitch = 1.0,
    callbacks?: TTSCallbacks
  ): Promise<boolean> {
    // If already speaking this message, toggle stop
    if (this.isSpeakingInternal && this.currentMessageId === messageId) {
      this.stop();
      return false;
    }

    this.stop();
    this.unlockAudio();

    const cleanText = this.cleanMarkdownForSpeech(rawText);
    if (!cleanText.trim()) return false;

    this.currentMessageId = messageId;
    this.isLoadingInternal = true;
    callbacks?.onLoading?.();

    // Determine target language
    const hasUrdu = /[\u0600-\u06FF]/.test(cleanText);
    const hasHindi = /[\u0900-\u097F]/.test(cleanText);
    let targetLang = 'ur';
    if (hasUrdu) targetLang = 'ur';
    else if (hasHindi) targetLang = 'hi';
    else if (language === 'ur-PK') targetLang = 'ur';
    else if ((language as string) === 'hi-IN') targetLang = 'hi';
    else targetLang = (language as string).slice(0, 2);

    // Engine 1: Web Audio API (High-Fidelity server-side TTS stream)
    try {
      const audioUrl = `/api/audio/tts?text=${encodeURIComponent(cleanText.slice(0, 1500))}&lang=${encodeURIComponent(targetLang)}`;
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error(`TTS server responded with status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Check if user stopped while fetching
      if (this.currentMessageId !== messageId) {
        return false;
      }

      // Try playing via Web Audio API first (most reliable on mobile iframe)
      if (this.audioContext) {
        try {
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }

          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));

          if (this.currentMessageId !== messageId) {
            return false;
          }

          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = Math.max(0.7, Math.min(1.8, rate));

          // Connect to destination
          source.connect(this.audioContext.destination);

          this.currentSourceNode = source;
          this.activeMode = 'webAudio';
          this.isLoadingInternal = false;
          this.isSpeakingInternal = true;
          this.isPausedInternal = false;

          source.onended = () => {
            if (this.currentMessageId === messageId) {
              this.cleanup();
              callbacks?.onEnd?.();
            }
          };

          source.start(0);
          callbacks?.onStart?.();
          return true;
        } catch (webAudioErr) {
          console.warn('Web Audio decode failed, attempting HTML5 Audio fallback:', webAudioErr);
        }
      }

      // Fallback Engine 2: HTML5 Audio with Blob URL
      try {
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        this.currentBlobUrl = blobUrl;

        let audio = document.getElementById('vega-tts-audio') as HTMLAudioElement;
        if (!audio) {
          audio = document.createElement('audio');
          audio.id = 'vega-tts-audio';
          audio.setAttribute('playsinline', 'true');
          audio.setAttribute('webkit-playsinline', 'true');
          audio.style.display = 'none';
          document.body.appendChild(audio);
        }

        this.currentAudio = audio;
        this.activeMode = 'htmlAudio';
        audio.src = blobUrl;
        audio.playbackRate = Math.max(0.7, Math.min(1.8, rate));

        audio.onplay = () => {
          this.isLoadingInternal = false;
          this.isSpeakingInternal = true;
          this.isPausedInternal = false;
          callbacks?.onStart?.();
        };

        audio.onended = () => {
          this.cleanup();
          callbacks?.onEnd?.();
        };

        audio.onerror = () => {
          console.warn('HTML5 Audio failed, falling back to Web Speech API');
          this.speakWithSpeechSynthesis(messageId, cleanText, language, targetLang, rate, pitch, callbacks);
        };

        await audio.play();
        return true;
      } catch (audioErr) {
        console.warn('HTML5 Audio play failed:', audioErr);
      }
    } catch (err) {
      console.warn('Backend TTS failed, falling back to Web Speech API:', err);
    }

    // Engine 3: Local Browser SpeechSynthesis Fallback
    return this.speakWithSpeechSynthesis(messageId, cleanText, language, targetLang, rate, pitch, callbacks);
  }

  private speakWithSpeechSynthesis(
    messageId: string,
    cleanText: string,
    language: SupportedLanguage,
    targetLang: string,
    rate: number,
    pitch: number,
    callbacks?: TTSCallbacks
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.cleanup();
      callbacks?.onError?.('اسپیکر سپورٹ نہیں ہے');
      return false;
    }

    try {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = Math.max(0.6, Math.min(1.8, rate));
      utterance.pitch = Math.max(0.7, Math.min(1.4, pitch));
      utterance.lang = targetLang === 'ur' ? 'ur-PK' : targetLang === 'hi' ? 'hi-IN' : language;

      const voices = this.getVoices();
      if (voices && voices.length > 0) {
        let matchedVoice: SpeechSynthesisVoice | undefined;
        if (targetLang === 'ur') {
          matchedVoice =
            voices.find((v) => v.lang.toLowerCase().startsWith('ur')) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
        } else if (targetLang === 'hi') {
          matchedVoice =
            voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('ur'));
        } else {
          matchedVoice =
            voices.find((v) => v.lang.toLowerCase() === utterance.lang.toLowerCase()) ||
            voices.find((v) => v.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()));
        }
        if (matchedVoice) utterance.voice = matchedVoice;
      }

      this.activeMode = 'speechSynthesis';
      this.currentUtterance = utterance;

      utterance.onstart = () => {
        this.isLoadingInternal = false;
        this.isSpeakingInternal = true;
        this.isPausedInternal = false;
        this.startKeepAlive();
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        this.cleanup();
        callbacks?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.cleanup();
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          callbacks?.onError?.(`اسپیکر خرابی: ${e.error}`);
        } else {
          callbacks?.onEnd?.();
        }
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err: any) {
      this.cleanup();
      callbacks?.onError?.(err?.message || 'اسپیکر چلانے میں ناکامی');
      return false;
    }
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis && this.isSpeakingInternal && !this.isPausedInternal) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 12000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private cleanup(): void {
    this.stopKeepAlive();
    this.isSpeakingInternal = false;
    this.isLoadingInternal = false;
    this.isPausedInternal = false;
    this.currentMessageId = null;
    this.currentUtterance = null;

    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {}
      this.currentSourceNode = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.removeAttribute('src');
      } catch {}
      this.currentAudio = null;
    }

    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    this.activeMode = null;
  }

  pause(): void {
    if (this.activeMode === 'webAudio' && this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend().catch(() => {});
      this.isPausedInternal = true;
    } else if (this.activeMode === 'htmlAudio' && this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPausedInternal = true;
    } else if (this.activeMode === 'speechSynthesis' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this.isPausedInternal = true;
    }
  }

  resume(): void {
    if (this.activeMode === 'webAudio' && this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
      this.isPausedInternal = false;
    } else if (this.activeMode === 'htmlAudio' && this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
      this.isPausedInternal = false;
    } else if (this.activeMode === 'speechSynthesis' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this.isPausedInternal = false;
    }
  }

  stop(): void {
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {}
      this.currentSourceNode = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.removeAttribute('src');
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.cleanup();
  }

  isSpeaking(): boolean {
    return this.isSpeakingInternal;
  }

  isLoading(): boolean {
    return this.isLoadingInternal;
  }

  isPaused(): boolean {
    return this.isPausedInternal;
  }

  getCurrentMessageId(): string | null {
    return this.currentMessageId;
  }

  private cleanMarkdownForSpeech(markdown: string): string {
    return markdown
      .replace(/```[\s\S]*?```/g, 'کوڈ بلاک')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/^\s*>\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/<[^>]+>/g, '')
      .replace(/^[-*_]{3,}\s*$/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}

export const textToSpeechService = new TextToSpeechService();
