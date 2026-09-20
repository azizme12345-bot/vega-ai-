import { SupportedLanguage } from '../../types';

export interface SpeechCallbacks {
  onResult: (finalTranscript: string, interimTranscript: string) => void;
  onStart: () => void;
  onEnd: () => void;
  onError: (errorMessage: string) => void;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListeningInternal = false;
  private currentLanguage: SupportedLanguage = 'en-US';

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  async start(lang: SupportedLanguage, callbacks: SpeechCallbacks): Promise<boolean> {
    if (!this.isSupported()) {
      callbacks.onError('اس براؤزر میں براہ راست اسپیچ ریکگنیشن دستیاب نہیں ہے۔ آڈیو ریکارڈنگ موڈ پر منتقل کیا جا رہا ہے۔');
      return false;
    }

    if (this.isListeningInternal) {
      this.stop();
    }

    try {
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      this.recognition = new SpeechRecognitionConstructor();
      this.currentLanguage = lang;
      this.recognition.lang = lang;
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListeningInternal = true;
        callbacks.onStart();
      };

      this.recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalStr += result[0].transcript + ' ';
          } else {
            interimStr += result[0].transcript;
          }
        }

        callbacks.onResult(finalStr, interimStr);
      };

      this.recognition.onerror = (event: any) => {
        let message = 'آواز کی شناخت میں خرابی ہوئی (Speech recognition error)';
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            message = 'مائیکروفون کی اجازت نہیں ملی۔ براہ کرم براؤزر کے ایڈریس بار میں لاک آئیکن پر کلک کر کے مائیکروفون الاؤ کریں۔ اگر آپ پریویو میں ہیں تو "Open in new tab" پر کلک کریں۔';
            break;
          case 'no-speech':
            message = 'کوئی آواز سنائی نہیں دی، براہ کرم مائیک کے قریب بولیں۔ (No speech detected)';
            break;
          case 'audio-capture':
            message = 'کوئی مائیکروفون نہیں ملا۔ براہ کرم مائیکروفون کنیکٹ کریں۔ (No microphone hardware found)';
            break;
          case 'network':
            message = 'نیٹ ورک کی خرابی۔ براہ کرم اپنا انٹرنیٹ چیک کریں۔ (Network error during speech recognition)';
            break;
          case 'aborted':
            return;
          case 'language-not-supported':
            message = `زبان ${lang} کے لیے براؤزر کی براہ راست شناخت دستیاب نہیں ہے۔ ہم آڈیو ریکارڈنگ موڈ سے ترجمہ کر رہے ہیں۔`;
            break;
          default:
            message = `مائیک خرابی: ${event.error || 'نامعلوم خرابی'}`;
        }
        callbacks.onError(message);
      };

      this.recognition.onend = () => {
        this.isListeningInternal = false;
        callbacks.onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.isListeningInternal = false;
      callbacks.onError(err.message || 'مائیکروفون شروع کرنے میں ناکامی ہوئی');
      return false;
    }
  }

  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Safe ignore
      }
      this.recognition = null;
    }
    this.isListeningInternal = false;
  }

  isListening(): boolean {
    return this.isListeningInternal;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
