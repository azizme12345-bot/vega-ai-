export type SupportedLanguage = 'en-US' | 'ur-PK' | 'pa-PK';

export interface ChatImage {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64 data (with or without data URI header)
  previewUrl: string;
  sizeBytes?: number;
  mediaType?: 'image' | 'pdf' | 'video';
  durationSeconds?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: ChatImage[];
  timestamp: number;
  status?: 'sending' | 'streaming' | 'complete' | 'done' | 'error';
  errorMessage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  draftText?: string;
  draftImages?: ChatImage[];
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  speechLang: SupportedLanguage;
  ttsEnabled: boolean;
  ttsRate: number; // 0.8 - 1.5
  ttsPitch: number;
  customSystemPrompt: string;
  soundEffects: boolean;
  autoScroll: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  isLoggedIn: boolean;
  avatar?: string;
  lastSyncedAt?: number;
}

export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

export interface SpeechSynthesisState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentMessageId: string | null;
  isSupported: boolean;
}

// Image Generation Types
export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3';
export type ImageStylePreset =
  | 'photorealistic'
  | 'islamic-art'
  | '3d-animation'
  | 'oil-painting'
  | 'portrait'
  | 'cyberpunk'
  | 'watercolor'
  | 'anime';

export interface GeneratedImageItem {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  imageUrl: string;
  aspectRatio: ImageAspectRatio;
  style: ImageStylePreset;
  createdAt: number;
}

// Video Generation & Storyboard Types
export type VideoAspectRatio = '16:9' | '9:16' | '1:1';
export type VideoStylePreset =
  | 'animation'
  | 'cinematic'
  | 'islamic'
  | 'nature'
  | 'documentary'
  | 'cyberpunk';
export type VideoCameraMotion =
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'tilt-up'
  | 'slow-ken-burns';

export interface VideoScene {
  id: string;
  order: number;
  title: string;
  durationSeconds: number; // e.g., 5 to 15 seconds
  visualPrompt: string;
  imageUrl?: string;
  overlayText?: string;
  narrationScript?: string;
  cameraMotion: VideoCameraMotion;
  audioUrl?: string; // Voiceover audio
}

export interface GeneratedVideoProject {
  id: string;
  title: string;
  prompt: string;
  targetDurationMinutes: number; // e.g. 0.5 (30s), 1 (1m), 2, 5 (5m)
  aspectRatio: VideoAspectRatio;
  style: VideoStylePreset;
  scenes: VideoScene[];
  voiceOption: 'ai-urdu' | 'ai-english' | 'user-mic' | 'none';
  userRecordedAudio?: string;
  musicPreset?: 'peaceful' | 'cinematic' | 'spiritual' | 'epic' | 'none';
  createdAt: number;
}

