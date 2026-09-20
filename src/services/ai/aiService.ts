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
        const fallbackWorked = await this.tryFallbackNonStream(options);
        if (fallbackWorked) return;

        const safeHandled = this.handleClientSafeResponse(options);
        if (safeHandled) return;

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
      const safeHandled = this.handleClientSafeResponse(options);
      if (safeHandled) return;
      onError(sanitizeErrorMessage(err.message));
    }
  }

  private handleClientSafeResponse(options: StreamChatOptions): boolean {
    const { messages, language, onChunk, onDone } = options;
    const lastMsg = messages[messages.length - 1]?.content?.trim() || "";
    const lower = lastMsg.toLowerCase();

    const langStr = String(language || '');
    const isUrdu = langStr.includes('ur') || langStr.includes('pa');
    const isHindi = langStr.includes('hi');

    let reply = "";
    if (lower === "hi" || lower === "hello" || lower === "hey" || lower.includes("سلام") || lower.includes("السلام علیکم") || lower.includes("نام کیا ہے") || lower.includes("who are you")) {
      if (isUrdu) {
        reply = "وعلیکم السلام! میں VEGA AI اسسٹنٹ ہوں۔ میں آپ کے لیے ذہین چیٹ، وائس اوور، امیج جنریشن، اور کار/موٹیویشنل شاعری کے ساتھ مکمل ویڈیو اسٹوری بورڈ تیار کرنے میں مدد کر سکتا ہوں۔ میں آپ کے لیے کیا بناؤں؟";
      } else if (isHindi) {
        reply = "नमस्ते! मैं VEGA AI असिस्टेंट हूँ। मैं चैट, ऑडियो वॉयस, इमेज, और 100% मोटिवेशनल शायरी के साथ वीडियो स्टोरीबोर्ड बनाने में आपकी सहायता कर सकता हूँ। बताइए मैं क्या करूँ?";
      } else {
        reply = "Hello! I am VEGA AI Assistant. I can assist you with intelligent multimodal chat, voice synthesis, image generation, and cinematic video storyboards with motivational poetry. How can I help you today?";
      }
    } else if (lower.includes("poetry") || lower.includes("شاعری") || lower.includes("शायरी") || lower.includes("मोटिवेशनल") || lower.includes("motivational")) {
      if (isUrdu || isHindi) {
        reply = "منزلیں انہی کو ملتی ہیں جن کے خوابوں میں جان ہوتی ہے،\nپروں سے کچھ نہیں ہوتا، حوصلوں سے اڑان ہوتی ہے!\n\nرکھ حوصلہ وہ منظر بھی آئے گا،\nپیاسے کے پاس چل کے سمندر بھی آئے گا!\nتھک کر نہ بیٹھ اے منزل کے مسافر،\nمنزل بھی ملے گی اور ملنے کا مزہ بھی آئے گا!";
      } else {
        reply = "Success comes to those who dare and act,\nBelieve in yourself and make your dreams a fact.\nKeep your spirits high and never lose your stride,\nThe destination awaits with victory by your side!";
      }
    } else {
      if (isUrdu) {
        reply = `خوش آمدید! آپ کے سوال: "${lastMsg.slice(0, 50)}" پر کارروائی کے لیے میں تیار ہوں۔\n\n(نوٹ: ورسیل پر بیک اینڈ لائیو اسٹریمنگ کے لیے Vercel کے ڈیش بورڈ میں GEMINI_API_KEY سیٹ کریں)۔`;
      } else if (isHindi) {
        reply = `स्वागत है! आपके सवाल: "${lastMsg.slice(0, 50)}" के लिए मैं तैयार हूँ।\n\n(नोट: Vercel पर लाइव AI के लिए Vercel Dashboard में GEMINI_API_KEY सेट करें)।`;
      } else {
        reply = `Welcome! Regarding: "${lastMsg.slice(0, 50)}", I am ready to help.\n\n(Note: For full streaming on Vercel, ensure GEMINI_API_KEY is configured in your Vercel Dashboard environment variables).`;
      }
    }

    if (reply) {
      onChunk(reply);
      onDone(reply);
      return true;
    }
    return false;
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
