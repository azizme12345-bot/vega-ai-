import { SupportedLanguage } from '../../types';

export interface RecorderCallbacks {
  onStart?: () => void;
  onVolumeChange?: (volume: number) => void;
  onEnd?: () => void;
  onError?: (errorMsg: string) => void;
}

export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private audioChunks: Blob[] = [];
  private isRecordingInternal = false;
  private lastRecordedBlob: Blob | null = null;
  private lastRecordedUrl: string | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }

  getLastRecordingUrl(): string | null {
    return this.lastRecordedUrl;
  }

  playLastRecording(onEnded?: () => void): boolean {
    if (!this.lastRecordedUrl) return false;
    try {
      if (this.currentAudioElement) {
        this.currentAudioElement.pause();
        this.currentAudioElement = null;
      }
      const audio = new Audio(this.lastRecordedUrl);
      this.currentAudioElement = audio;
      audio.onended = () => {
        this.currentAudioElement = null;
        onEnded?.();
      };
      audio.play().catch((e) => console.warn('Could not play recorded audio:', e));
      return true;
    } catch {
      return false;
    }
  }

  stopPlayingLastRecording(): void {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
      } catch {}
      this.currentAudioElement = null;
    }
  }

  async start(
    callbacks: RecorderCallbacks
  ): Promise<boolean> {
    if (!this.isSupported()) {
      callbacks.onError?.('براؤزر میں آڈیو ریکارڈنگ سپورٹ موجود نہیں ہے۔ (Audio recording not supported in this browser)');
      return false;
    }

    // Stop any existing recording
    this.stopInternal();

    try {
      // Request microphone access with safe fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (fallbackErr) {
        // Fallback for mobile browsers or if advanced constraints fail
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.audioStream = stream;
      this.audioChunks = [];

      // Determine supported mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
      ];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      this.mediaRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      // Set up AudioContext for volume level detection
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(stream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          source.connect(this.analyser);

          const bufferLength = this.analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const checkVolume = () => {
            if (!this.isRecordingInternal || !this.analyser) return;
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const normalized = Math.min(1, average / 75); // 0 to 1
            callbacks.onVolumeChange?.(normalized);
            this.animFrameId = requestAnimationFrame(checkVolume);
          };

          checkVolume();
        }
      } catch (audioCtxErr) {
        console.warn('AudioContext volume metering not available:', audioCtxErr);
      }

      recorder.onstart = () => {
        this.isRecordingInternal = true;
        callbacks.onStart?.();
      };

      recorder.onerror = (event: any) => {
        this.stopInternal();
        callbacks.onError?.(`ریکارڈنگ میں خرابی ہوئی: ${event.error?.name || 'مائیک کی خرابی'}`);
      };

      recorder.start(200); // Slice every 200ms
      return true;
    } catch (err: any) {
      this.stopInternal();
      console.error('Audio recorder start error:', err);

      let userMsg = 'مائیکروفون شروع کرنے میں دشواری پیش آئی۔ (Microphone could not start)';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userMsg = 'PERMISSION_DENIED';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userMsg = 'کوئی مائیکروفون نہیں ملا۔ براہ کرم ہینڈزفری یا مائیکروفون جوڑیں۔ (No microphone detected)';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userMsg = 'مائیکروفون کسی اور ایپلیکیشن یا ٹیب میں زیر استعمال ہے۔ (Microphone is already in use by another app)';
      }
      callbacks.onError?.(userMsg);
      return false;
    }
  }

  async stopAndTranscribe(lang: SupportedLanguage): Promise<{ text: string; audioUrl: string | null }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.stopInternal();
        return resolve({ text: '', audioUrl: null });
      }

      const recorder = this.mediaRecorder;
      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.lastRecordedBlob = audioBlob;
          if (this.lastRecordedUrl) {
            URL.revokeObjectURL(this.lastRecordedUrl);
          }
          const audioUrl = URL.createObjectURL(audioBlob);
          this.lastRecordedUrl = audioUrl;

          this.stopInternal();

          if (audioBlob.size < 400) {
            return resolve({ text: '', audioUrl });
          }

          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result as string;
              const res = await fetch('/api/audio/transcribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  audioData: base64Audio,
                  mimeType,
                  language: lang,
                }),
              });

              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `سرور سے آڈیو پروسیسنگ میں خرابی ہوئی (${res.status})`);
              }

              const data = await res.json();
              resolve({ text: (data.text || '').trim(), audioUrl });
            } catch (postErr: any) {
              reject(postErr);
            }
          };
          reader.onerror = () => {
            reject(new Error('آڈیو فائل پڑھنے میں ناکامی'));
          };
          reader.readAsDataURL(audioBlob);
        } catch (procErr) {
          this.stopInternal();
          reject(procErr);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        this.stopInternal();
        reject(err);
      }
    });
  }

  cancel(): void {
    this.stopInternal();
  }

  private stopInternal(): void {
    this.isRecordingInternal = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => t.stop());
      this.audioStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.isRecordingInternal;
  }
}

export const audioRecorderService = new AudioRecorderService();
