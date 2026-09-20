import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  Conversation,
  AppSettings,
  UserAccount,
  SupportedLanguage,
  ChatImage
} from './types';
import { storageService } from './services/storage/indexedDB';
import { aiService } from './services/ai/aiService';
import { authService } from './services/auth/authService';
import { androidBridge } from './services/android/androidBridge';
import { imageProcessor } from './services/image/imageProcessor';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { textToSpeechService } from './services/speech/textToSpeech';

import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInputBar } from './components/ChatInputBar';
import { EmptyChatState } from './components/EmptyChatState';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { CVBuilderModal } from './components/CVBuilderModal';
import { URLInputModal } from './components/URLInputModal';
import { VoicePlayerBar } from './components/VoicePlayerBar';
import { ImageCreatorModal } from './components/ImageCreatorModal';
import { VideoCreatorModal } from './components/VideoCreatorModal';

export default function App() {
  const isOnline = useOnlineStatus();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    speechLang: 'en-US',
    ttsEnabled: true,
    ttsRate: 1.0,
    ttsPitch: 1.0,
    customSystemPrompt: '',
    soundEffects: true,
    autoScroll: true,
  });
  const [user, setUser] = useState<UserAccount>({
    id: 'local_user_default',
    name: 'Guest User',
    email: '',
    isLoggedIn: false,
  });

  // UI Navigation / Modals
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<ChatImage | null>(null);
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [imageInitialPrompt, setImageInitialPrompt] = useState('');
  const [imageInitialReference, setImageInitialReference] = useState<string | undefined>(undefined);
  const [videoInitialPrompt, setVideoInitialPrompt] = useState('');
  const [videoInitialReference, setVideoInitialReference] = useState<string | undefined>(undefined);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // TTS Hook
  const {
    speakingMessageId,
    isSpeaking,
    isLoadingAudio,
    isPaused,
    ttsError,
    speak,
    pause: pauseSpeaking,
    resume: resumeSpeaking,
    stop: stopSpeaking,
  } = useTextToSpeech();

  const [volumeNotice, setVolumeNotice] = useState<string | null>(null);

  // Active conversation helper
  const currentConversation = conversations.find((c) => c.id === currentChatId) || null;

  // Initialize DB, settings, user accounts
  useEffect(() => {
    async function initApp() {
      // 1. Settings
      const loadedSettings = await storageService.getSettings();
      setSettings(loadedSettings);
      applyTheme(loadedSettings.theme);

      // 2. User
      const loadedUser = await authService.init();
      setUser(loadedUser);

      // 3. Conversations
      const loadedChats = await storageService.getAllConversations();
      if (loadedChats.length > 0) {
        setConversations(loadedChats);
        setCurrentChatId(loadedChats[0].id);
      } else {
        // Create initial default chat
        const initialChat: Conversation = {
          id: `conv_${Date.now()}`,
          title: 'New Chat',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        await storageService.saveConversation(initialChat);
        setConversations([initialChat]);
        setCurrentChatId(initialChat.id);
      }
    }

    initApp();

    // Subscribe to auth changes
    const unsubAuth = authService.subscribe((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // Theme application
  const applyTheme = (theme: 'dark' | 'light' | 'system') => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  const isDarkMode =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleToggleDarkMode = async () => {
    const nextTheme: 'dark' | 'light' = isDarkMode ? 'light' : 'dark';
    const updated = { ...settings, theme: nextTheme };
    setSettings(updated);
    applyTheme(nextTheme);
    await storageService.saveSettings(updated);
  };

  const handleToggleAutoSpeak = async () => {
    const nextVal = !settings.ttsEnabled;
    if (nextVal) {
      textToSpeechService.unlockAudio();
    }
    const updated = { ...settings, ttsEnabled: nextVal };
    setSettings(updated);
    await storageService.saveSettings(updated);
  };

  // Android hardware back button handler
  useEffect(() => {
    const unregister = androidBridge.registerBackButton(() => {
      if (cvModalOpen) {
        setCvModalOpen(false);
        return true;
      }
      if (urlModalOpen) {
        setUrlModalOpen(false);
        return true;
      }
      if (previewImage) {
        setPreviewImage(null);
        return true;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return true;
      }
      if (authOpen) {
        setAuthOpen(false);
        return true;
      }
      if (sidebarOpen) {
        setSidebarOpen(false);
        return true;
      }
      return false;
    });

    return () => unregister();
  }, [cvModalOpen, urlModalOpen, previewImage, settingsOpen, authOpen, sidebarOpen]);

  // Auto-scroll on new messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (!settings.autoScroll) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, [settings.autoScroll]);

  useEffect(() => {
    scrollToBottom(false);
  }, [currentChatId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [currentConversation?.messages.length, isGenerating]);

  // Create New Chat
  const handleNewChat = async () => {
    // If currently empty chat, just focus it
    if (currentConversation && currentConversation.messages.length === 0) {
      setSidebarOpen(false);
      return;
    }

    const newChat: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    await storageService.saveConversation(newChat);
    setConversations((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setSidebarOpen(false);
  };

  // Select Chat
  const handleSelectChat = (id: string) => {
    if (isGenerating) {
      handleStopGenerating();
    }
    stopSpeaking();
    setCurrentChatId(id);
    setSidebarOpen(false);
  };

  // Rename Chat
  const handleRenameChat = async (id: string, newTitle: string) => {
    const chat = conversations.find((c) => c.id === id);
    if (!chat) return;

    const updated: Conversation = { ...chat, title: newTitle, updatedAt: Date.now() };
    await storageService.saveConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  // Delete Chat
  const handleDeleteChat = async (id: string) => {
    await storageService.deleteConversation(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);

    if (currentChatId === id) {
      if (updated.length > 0) {
        setCurrentChatId(updated[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  // Clear Conversation messages
  const handleClearConversation = async () => {
    if (!currentConversation) return;
    const updated: Conversation = {
      ...currentConversation,
      messages: [],
      updatedAt: Date.now(),
    };
    await storageService.saveConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  // Clear All Data
  const handleClearAllData = async () => {
    await storageService.clearAllConversations();
    const freshChat: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    await storageService.saveConversation(freshChat);
    setConversations([freshChat]);
    setCurrentChatId(freshChat.id);
  };

  // Send message
  const handleSendMessage = async (text: string, images: ChatImage[]) => {
    if (!currentConversation) return;

    // Unlock audio context on user action so auto-speak will play without autoplay restriction
    textToSpeechService.unlockAudio();

    // Check offline status
    if (!navigator.onLine) {
      alert('You are offline. Reconnect to the internet to send messages to the AI.');
      return;
    }

    const userMessageId = `msg_u_${Date.now()}`;
    const assistantMessageId = `msg_a_${Date.now() + 1}`;

    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      images: images && images.length > 0 ? images : undefined,
      timestamp: Date.now(),
      status: 'done',
    };

    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
      status: 'streaming',
    };

    // Auto-generate title if this is the first message
    const isFirstMessage = currentConversation.messages.length === 0;
    let newTitle = currentConversation.title;
    if (isFirstMessage) {
      newTitle = text ? text.slice(0, 36).trim() + (text.length > 36 ? '...' : '') : 'Photo Analysis';
    }

    const updatedMessages = [...currentConversation.messages, newUserMessage, initialAssistantMessage];
    const updatedConversation: Conversation = {
      ...currentConversation,
      title: newTitle,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    // Update state & persist user message
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConversation.id ? updatedConversation : c))
    );
    await storageService.saveConversation(updatedConversation);

    // Stream response
    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulatedResponse = '';

    await aiService.streamChat({
      messages: [...currentConversation.messages, newUserMessage],
      systemInstruction: settings.customSystemPrompt,
      language: settings.speechLang,
      signal: abortController.signal,
      onChunk: (chunk) => {
        accumulatedResponse += chunk;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentConversation.id) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: accumulatedResponse, status: 'streaming' as const }
                : m
            );
            return { ...c, messages: msgs };
          })
        );
      },
      onError: (err) => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentConversation.id) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: accumulatedResponse || 'An error occurred while generating a response.',
                    errorMessage: err,
                    status: 'error' as const,
                  }
                : m
            );
            const conv = { ...c, messages: msgs, updatedAt: Date.now() };
            storageService.saveConversation(conv);
            return conv;
          })
        );
      },
      onDone: (fullText) => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentConversation.id) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: fullText, status: 'done' as const }
                : m
            );
            const finalConv = { ...c, messages: msgs, updatedAt: Date.now() };
            storageService.saveConversation(finalConv);
            return finalConv;
          })
        );

        // Auto-Speak response through speaker if enabled
        if (settings.ttsEnabled && fullText) {
          speak(assistantMessageId, fullText, settings.speechLang, settings.ttsRate, settings.ttsPitch);
        }
      },
    });
  };

  // Stop generating
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    // Finalize assistant message
    if (currentConversation) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentConversation.id) return c;
          const msgs = c.messages.map((m) =>
            m.status === 'streaming' ? { ...m, status: 'done' as const } : m
          );
          const finalConv = { ...c, messages: msgs, updatedAt: Date.now() };
          storageService.saveConversation(finalConv);
          return finalConv;
        })
      );
    }
  };

  // Regenerate last response
  const handleRegenerate = async () => {
    if (!currentConversation || isGenerating) return;

    const messages = currentConversation.messages;
    if (messages.length === 0) return;

    // Find the last assistant message
    const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant');
    if (lastAssistantIdx === -1) return;

    const actualIdx = messages.length - 1 - lastAssistantIdx;
    const historyBeforeAssistant = messages.slice(0, actualIdx);
    const lastUserMessage = [...historyBeforeAssistant].reverse().find((m) => m.role === 'user');

    if (!lastUserMessage) return;

    // Remove the old assistant message and trigger stream
    const assistantMessageId = `msg_a_${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
    };

    const updatedMessages = [...historyBeforeAssistant, initialAssistantMessage];
    const updatedConv: Conversation = {
      ...currentConversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );
    await storageService.saveConversation(updatedConv);

    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulated = '';

    await aiService.streamChat({
      messages: historyBeforeAssistant,
      systemInstruction: settings.customSystemPrompt,
      language: settings.speechLang,
      signal: abortController.signal,
      onChunk: (chunk) => {
        accumulated += chunk;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentConversation.id) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: accumulated, status: 'streaming' as const }
                : m
            );
            return { ...c, messages: msgs };
          })
        );
      },
      onError: (err) => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentConversation.id) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: accumulated || 'Regeneration error occurred.',
                    errorMessage: err,
                    status: 'error' as const,
                  }
                : m
            );
            const conv = { ...c, messages: msgs, updatedAt: Date.now() };
            storageService.saveConversation(conv);
            return conv;
          })
        );
      },
      onDone: (fullText) => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentConversation.id) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: fullText, status: 'done' as const }
                : m
            );
            const finalConv = { ...c, messages: msgs, updatedAt: Date.now() };
            storageService.saveConversation(finalConv);
            return finalConv;
          })
        );

        if (settings.ttsEnabled && fullText) {
          speak(assistantMessageId, fullText, settings.speechLang, settings.ttsRate, settings.ttsPitch);
        }
      },
    });
  };

  // Voice output / Speak message
  const handleSpeak = (messageId: string, text: string) => {
    // Explicit user tap unlocks audio immediately
    textToSpeechService.unlockAudio();
    speak(messageId, text, settings.speechLang, settings.ttsRate, settings.ttsPitch);
  };

  // Modal Handlers
  const handleGenerateCVFromModal = async (prompt: string, attachedFile?: File) => {
    setCvModalOpen(false);
    let attachedImages: ChatImage[] = [];
    if (attachedFile) {
      try {
        const processed = await imageProcessor.processImageFile(attachedFile);
        attachedImages = [processed];
      } catch {
        // Fallback
      }
    }
    handleSendMessage(prompt, attachedImages);
  };

  const handleSubmitUrlFromModal = (url: string, title?: string, excerpt?: string) => {
    setUrlModalOpen(false);
    const isUrdu = settings.speechLang === 'ur-PK';
    const prompt = isUrdu
      ? `براہ کرم اس ویب سائٹ کا تفصیلی تجزیہ اور خلاصہ اردو میں پیش کریں:\n${url}${title ? `\nعنوان: ${title}` : ''}`
      : `Please analyze and summarize this webpage / URL link:\n${url}${title ? `\nTitle: ${title}` : ''}`;
    handleSendMessage(prompt, []);
  };

  const handleOpenImageStudio = (initialPrompt?: string, initialImage?: string) => {
    setImageInitialPrompt(initialPrompt || '');
    setImageInitialReference(initialImage);
    setImageModalOpen(true);
  };

  const handleOpenVideoStudio = (initialPrompt?: string, initialReference?: string) => {
    setVideoInitialPrompt(initialPrompt || '');
    setVideoInitialReference(initialReference);
    setVideoModalOpen(true);
  };

  const handleCreateVideoFromImage = (imageUrl: string, promptText?: string) => {
    setImageModalOpen(false);
    setVideoInitialPrompt(promptText || 'اس تصویر سے متعلق ایک دلکش 5 منٹ کی ویڈیو بنائیں');
    setVideoInitialReference(imageUrl);
    setVideoModalOpen(true);
  };

  const handleCopyAllMessages = async () => {
    if (!currentConversation) return;
    const text = currentConversation.messages
      .map((m) => `${m.role === 'user' ? 'User' : 'VEGA AI'}:\n${m.content}`)
      .join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  // Settings Save
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    applyTheme(newSettings.theme);
    await storageService.saveSettings(newSettings);
  };

  const handleChangeSpeechLang = async (lang: SupportedLanguage) => {
    const updated = { ...settings, speechLang: lang };
    setSettings(updated);
    await storageService.saveSettings(updated);
  };

  const messages = currentConversation?.messages || [];
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--gemini-bg)] text-[var(--gemini-text)] font-['Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-[#284a7d] selection:text-white">
      {/* Sleek Collapsible Sidebar with VEGA AI Branding */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setSettingsOpen(true)}
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        isOnline={isOnline}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main chat column */}
      <main className="flex flex-1 flex-col h-full overflow-hidden relative bg-[var(--gemini-bg)]">
        {/* Chat top header */}
        <ChatHeader
          conversation={currentConversation}
          onToggleSidebar={handleToggleSidebar}
          onNewChat={handleNewChat}
          onClearConversation={handleClearConversation}
          onRenameConversation={(title) => {
            if (currentConversation) handleRenameChat(currentConversation.id, title);
          }}
          onDeleteConversation={() => {
            if (currentConversation) handleDeleteChat(currentConversation.id);
          }}
          speechLang={settings.speechLang}
          onChangeSpeechLang={handleChangeSpeechLang}
          isOnline={isOnline}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          autoSpeakEnabled={settings.ttsEnabled}
          onToggleAutoSpeak={handleToggleAutoSpeak}
          onCopyAllMessages={handleCopyAllMessages}
          onOpenImageStudio={() => handleOpenImageStudio()}
          onOpenVideoStudio={() => handleOpenVideoStudio()}
        />

        {/* Chat messages viewport */}
        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col justify-between">
          {messages.length === 0 ? (
            <EmptyChatState
              onSelectStarter={(starterText) => handleSendMessage(starterText, [])}
              onOpenCVBuilder={() => setCvModalOpen(true)}
              onOpenUrlModal={() => setUrlModalOpen(true)}
              speechLang={settings.speechLang}
              userName={user.isLoggedIn ? user.name : 'Friend'}
            />
          ) : (
            <div className="mx-auto max-w-4xl w-full py-4 space-y-1">
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  isLastAssistant={msg.id === lastAssistantMessage?.id}
                  onRegenerate={handleRegenerate}
                  onSpeak={handleSpeak}
                  isSpeaking={isSpeaking && speakingMessageId === msg.id}
                  isLoadingAudio={isLoadingAudio && speakingMessageId === msg.id}
                  speechLang={settings.speechLang}
                  onImageClick={(img) => setPreviewImage(img)}
                  onCreateVideoFromImage={handleCreateVideoFromImage}
                />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}

          {/* Bottom input bar */}
          <div className="w-full mt-auto">
            <ChatInputBar
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
              onStopGenerating={handleStopGenerating}
              speechLang={settings.speechLang}
              isOnline={isOnline}
              onOpenCVModal={() => setCvModalOpen(true)}
              onOpenUrlModal={() => setUrlModalOpen(true)}
              onOpenImageModal={() => handleOpenImageStudio()}
              onOpenVideoModal={() => handleOpenVideoStudio()}
              autoSpeakEnabled={settings.ttsEnabled}
              onToggleAutoSpeak={handleToggleAutoSpeak}
            />
          </div>
        </div>
      </main>

      {/* Floating active speech player */}
      <VoicePlayerBar
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        onPause={pauseSpeaking}
        onResume={resumeSpeaking}
        onStop={stopSpeaking}
        language={settings.speechLang}
        autoSpeak={settings.ttsEnabled}
        onToggleAutoSpeak={handleToggleAutoSpeak}
      />

      {/* CV Builder Modal */}
      <CVBuilderModal
        isOpen={cvModalOpen}
        onClose={() => setCvModalOpen(false)}
        onGenerateCV={handleGenerateCVFromModal}
        language={settings.speechLang}
      />

      {/* URL Grounding Input Modal */}
      <URLInputModal
        isOpen={urlModalOpen}
        onClose={() => setUrlModalOpen(false)}
        onSubmitUrl={handleSubmitUrlFromModal}
        language={settings.speechLang}
      />

      {/* AI Image Creator Modal */}
      {imageModalOpen && (
        <ImageCreatorModal
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          initialPrompt={imageInitialPrompt}
          initialImage={imageInitialReference}
          onCreateVideoFromImage={handleCreateVideoFromImage}
        />
      )}

      {/* AI Video Studio & Timeline Editor Modal */}
      {videoModalOpen && (
        <VideoCreatorModal
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          initialPrompt={videoInitialPrompt}
          initialReferenceImage={videoInitialReference}
        />
      )}

      {/* Offline state indicator toast */}
      <OfflineIndicator />

      {/* Full-view image modal */}
      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onClearAllData={handleClearAllData}
        isOnline={isOnline}
      />

      {/* Auth / Account Profile Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        user={user}
        chatCount={conversations.length}
      />

      {/* Speaker error or volume toast */}
      {ttsError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#322020] border border-red-500/50 text-red-200 text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
          <span>{ttsError}</span>
        </div>
      )}
    </div>
  );
}
