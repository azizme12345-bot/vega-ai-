import { useState, useCallback, useEffect, useRef } from 'react';
import { SupportedLanguage } from '../types';
import { audioRecorderService } from '../services/speech/audioRecorderService';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [lastRecordedUrl, setLastRecordedUrl] = useState<string | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);

  const durationTimerRef = useRef<any>(null);
  const currentLangRef = useRef<SupportedLanguage>('ur-PK');
  const onFinalCallbackRef = useRef<((text: string) => void) | null>(null);

  const isSupported = audioRecorderService.isSupported();

  // Clear duration timer
  const clearTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setDuration(0);
  }, []);

  // Start duration timer
  const startTimer = useCallback(() => {
    clearTimer();
    setDuration(0);
    durationTimerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, [clearTimer]);

  // Request Microphone and start recording
  const startListening = useCallback(
    async (lang: SupportedLanguage, onFinalResult?: (text: string) => void) => {
      setError(null);
      setIsPermissionDenied(false);
      setIsStarting(true);
      currentLangRef.current = lang;
      if (onFinalResult) {
        onFinalCallbackRef.current = onFinalResult;
      }

      try {
        const started = await audioRecorderService.start({
          onStart: () => {
            setIsStarting(false);
            setIsListening(true);
            startTimer();
          },
          onVolumeChange: (vol) => {
            setVolume(vol);
          },
          onError: (errMsg) => {
            setIsStarting(false);
            setIsListening(false);
            clearTimer();
            if (errMsg === 'PERMISSION_DENIED') {
              setIsPermissionDenied(true);
              setError(
                'مائیکروفون کی اجازت بلاک ہے۔ براہ کرم "نئے ٹیب میں کھولیں" پر کلک کریں یا براؤزر میں مائیکروفون Allow کریں۔'
              );
            } else {
              setError(errMsg);
            }
          },
        });

        if (!started) {
          setIsStarting(false);
          setIsListening(false);
          clearTimer();
        }
      } catch (e: any) {
        setIsStarting(false);
        setIsListening(false);
        clearTimer();
        setError('مائیکروفون شروع کرنے میں دشواری ہوئی۔ براہ کرم دوبارہ کوشش کریں۔');
      }
    },
    [startTimer, clearTimer]
  );

  // Stop recording and transcribe audio via Gemini AI
  const stopListening = useCallback(async (): Promise<string> => {
    clearTimer();
    setIsListening(false);
    setIsStarting(false);
    setVolume(0);
    setIsTranscribing(true);

    try {
      const { text, audioUrl } = await audioRecorderService.stopAndTranscribe(
        currentLangRef.current
      );
      setIsTranscribing(false);
      if (audioUrl) {
        setLastRecordedUrl(audioUrl);
      }
      if (text && onFinalCallbackRef.current) {
        onFinalCallbackRef.current(text);
      }
      return text;
    } catch (err: any) {
      setIsTranscribing(false);
      console.error('Transcription error:', err);
      const msg = err.message || 'آواز سمجھنے میں خرابی ہوئی، براہ کرم دوبارہ بولیں۔';
      setError(msg);
      return '';
    }
  }, [clearTimer]);

  // Toggle listening
  const toggleListening = useCallback(
    (lang: SupportedLanguage, onFinalResult?: (text: string) => void) => {
      if (isListening || isStarting || isTranscribing) {
        stopListening();
      } else {
        startListening(lang, onFinalResult);
      }
    },
    [isListening, isStarting, isTranscribing, startListening, stopListening]
  );

  // Cancel recording and discard
  const cancelListening = useCallback(() => {
    clearTimer();
    setIsStarting(false);
    setIsListening(false);
    setIsTranscribing(false);
    setVolume(0);
    audioRecorderService.cancel();
  }, [clearTimer]);

  // Play back the last recorded voice
  const playRecording = useCallback(() => {
    if (!lastRecordedUrl) return;
    setIsPlayingRecording(true);
    audioRecorderService.playLastRecording(() => {
      setIsPlayingRecording(false);
    });
  }, [lastRecordedUrl]);

  const stopPlayingRecording = useCallback(() => {
    audioRecorderService.stopPlayingLastRecording();
    setIsPlayingRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      audioRecorderService.cancel();
      audioRecorderService.stopPlayingLastRecording();
    };
  }, [clearTimer]);

  return {
    isListening,
    isStarting,
    isTranscribing,
    volume,
    duration,
    error,
    isPermissionDenied,
    lastRecordedUrl,
    isPlayingRecording,
    playRecording,
    stopPlayingRecording,
    clearError: () => {
      setError(null);
      setIsPermissionDenied(false);
    },
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    cancelListening,
  };
}
