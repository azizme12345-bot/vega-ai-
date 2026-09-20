import { useState, useCallback, useEffect } from 'react';
import { SupportedLanguage } from '../types';
import { textToSpeechService } from '../services/speech/textToSpeech';

export function useTextToSpeech() {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const isSupported = textToSpeechService.isSupported();

  const speak = useCallback(
    (
      messageId: string,
      text: string,
      language: SupportedLanguage = 'en-US',
      rate = 1.0,
      pitch = 1.0
    ) => {
      // Toggle off if already speaking or loading this message
      if (speakingMessageId === messageId && (isSpeaking || isLoadingAudio)) {
        textToSpeechService.stop();
        setSpeakingMessageId(null);
        setIsSpeaking(false);
        setIsLoadingAudio(false);
        setIsPaused(false);
        return;
      }

      setSpeakingMessageId(messageId);
      setIsLoadingAudio(true);
      setIsSpeaking(false);
      setIsPaused(false);
      setTtsError(null);

      textToSpeechService
        .speak(messageId, text, language, rate, pitch, {
          onLoading: () => {
            setSpeakingMessageId(messageId);
            setIsLoadingAudio(true);
          },
          onStart: () => {
            setSpeakingMessageId(messageId);
            setIsLoadingAudio(false);
            setIsSpeaking(true);
            setIsPaused(false);
          },
          onEnd: () => {
            setSpeakingMessageId(null);
            setIsLoadingAudio(false);
            setIsSpeaking(false);
            setIsPaused(false);
          },
          onError: (err) => {
            setSpeakingMessageId(null);
            setIsLoadingAudio(false);
            setIsSpeaking(false);
            setIsPaused(false);
            setTtsError(err || 'اسپیکر چلانے میں مسئلہ ہوا');
          },
        })
        .then((success) => {
          if (!success) {
            setSpeakingMessageId(null);
            setIsLoadingAudio(false);
            setIsSpeaking(false);
            setIsPaused(false);
          }
        })
        .catch(() => {
          setSpeakingMessageId(null);
          setIsLoadingAudio(false);
          setIsSpeaking(false);
          setIsPaused(false);
        });
    },
    [speakingMessageId, isSpeaking, isLoadingAudio]
  );

  const pause = useCallback(() => {
    textToSpeechService.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    textToSpeechService.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    textToSpeechService.stop();
    setSpeakingMessageId(null);
    setIsLoadingAudio(false);
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      textToSpeechService.stop();
    };
  }, []);

  return {
    speakingMessageId,
    isSpeaking,
    isLoadingAudio,
    isPaused,
    isSupported,
    ttsError,
    speak,
    pause,
    resume,
    stop,
  };
}
