import { ChatMessage, SupportedLanguage } from '../../types';

export interface StreamChatOptions {
  messages: ChatMessage[];
  systemInstruction?: string;
  language?: SupportedLanguage;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
  onError: (error: string) => void;
  onDone: (fullText: string) => void;
}

function sanitizeErrorMessage(rawMsg: string): string {
  if (!rawMsg) return 'An unexpected error occurred while communicating with the AI.';
  let msg = rawMsg;

  // Unpack nested JSON error string if present
  for (let i = 0; i < 3; i++) {
    try {
      const match = msg.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.error?.message) {
          msg = parsed.error.message;
        } else if (parsed.message) {
          msg = parsed.message;
        } else {
          break;
        }
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
    return 'The AI model is currently experiencing high demand. Please try again in a moment.';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Rate limit reached. Please wait a moment before sending another message.';
  }

  return msg;
}

export class AIService {
  async streamChat(options: StreamChatOptions): Promise<void> {
    const { messages, systemInstruction, language, signal, onChunk, onError, onDone } = options;

    if (!navigator.onLine) {
      onError('You are currently offline. Please connect to the internet to get AI responses.');
      return;
    }

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images?.map((img) => ({
              mimeType: img.mimeType,
              data: img.data,
            })),
          })),
          systemInstruction,
          language,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const rawErr = errorData.error || `Server returned error ${response.status}`;
        onError(sanitizeErrorMessage(rawErr));
        return;
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            onDone(accumulatedText);
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              if (!accumulatedText) {
                const fallbackWorked = await this.tryFallbackNonStream(options);
                if (fallbackWorked) return;
              }
              onError(sanitizeErrorMessage(parsed.error));
              return;
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              onChunk(parsed.text);
            }
          } catch {
            // Ignore non-json chunks or partial packets
          }
        }
      }

      onDone(accumulatedText);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Generation was intentionally stopped by user
        return;
      }
      console.error('AIService streamChat error:', err);
      const fallbackWorked = await this.tryFallbackNonStream(options);
      if (fallbackWorked) return;
      onError(sanitizeErrorMessage(err.message));
    }
  }

  private async tryFallbackNonStream(options: StreamChatOptions): Promise<boolean> {
    try {
      const { messages, systemInstruction, language, signal, onChunk, onDone } = options;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images?.map((img) => ({
              mimeType: img.mimeType,
              data: img.data,
            })),
          })),
          systemInstruction,
          language,
        }),
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          onChunk(data.text);
          onDone(data.text);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  async checkServerHealth(): Promise<{ ok: boolean; hasApiKey: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        return { ok: true, hasApiKey: data.hasApiKey };
      }
      return { ok: false, hasApiKey: false };
    } catch {
      return { ok: false, hasApiKey: false };
    }
  }
}

export const aiService = new AIService();
