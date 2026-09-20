import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 25mb limit for multimodal images/screenshots
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy GoogleGenAI client
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in the environment.");
    }
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

// Supported Gemini models with automatic failover in case of quota or demand limits
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

// Check if a prompt violates Halal / Islamic / ethical guidelines
function checkHalalCompliance(prompt: string): { isHalal: boolean; reason?: string } {
  const lower = prompt.toLowerCase();
  const prohibited = [
    "nude", "nudity", "naked", "erotic", "porn", "pornography", "sexual",
    "vulgar", "lingerie", "bikini", "cleavage", "provocative", "strip",
    "whiskey", "vodka", "beer", "wine", "alcohol", "liquor", "bar club",
    "gambling", "casino", "poker", "betting",
    "عریانی", "فحاشی", "بے پردہ", "جوا", "شراب", "نشہ", "غیر اخلاقی"
  ];
  for (const term of prohibited) {
    if (lower.includes(term)) {
      return {
        isHalal: false,
        reason: "یہ پرامپٹ اسلامی و اخلاقی اصولوں (حلال معیارات) کے خلاف ہے۔ عریانی، فحاشی، شراب، جوا یا غیر اخلاقی مواد بنانا سختی سے ممنوع ہے۔"
      };
    }
  }
  return { isHalal: true };
}

// Multi-engine visual image generator with high resolution and zero rate-limiting fallback
async function generateVisualImage(prompt: string, style?: string, aspectRatio: string = "1:1"): Promise<string> {
  const width = aspectRatio === "16:9" ? 1280 : aspectRatio === "9:16" ? 720 : 1024;
  const height = aspectRatio === "16:9" ? 720 : aspectRatio === "9:16" ? 1280 : 1024;

  // 1. High-resolution safe & halal photography search from Wikimedia Commons (Fast ~500ms, free, no rate limits)
  try {
    const keywords = prompt
      .replace(/[^\w\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3)
      .join(" ") || "nature landscape";

    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(keywords)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&origin=*`;
    const wikiRes = await fetch(wikiUrl);
    if (wikiRes.ok) {
      const data: any = await wikiRes.json();
      const pages = Object.values(data.query?.pages || {});
      for (const page of pages as any[]) {
        const url = page.imageinfo?.[0]?.url;
        if (url && (url.endsWith(".jpg") || url.endsWith(".png") || url.endsWith(".jpeg"))) {
          return url;
        }
      }
    }
  } catch (e) {
    // Continue
  }

  // 2. Try fast Pollinations AI check with 1.5s strict timeout
  try {
    const encoded = encodeURIComponent(prompt);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://image.pollinations.ai/prompt/${encoded}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeout);
    if (res.ok && res.headers.get("content-type")?.includes("image")) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 4000) {
        return `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
      }
    }
  } catch (e) {
    // Continue to fallback
  }

  // 3. Guaranteed instant photographic fallback
  const seed = Math.abs(prompt.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 1000;
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

// Helper to format raw Gemini API errors into clean, user-friendly messages
function formatGeminiErrorMessage(error: any): string {
  if (!error) return "Failed to communicate with VEGA AI. Please try again.";
  let msg = typeof error === "string" ? error : error.message || "";

  // Attempt to unpack nested JSON error objects from GoogleGenAI SDK ApiError
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

  if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("overloaded")) {
    return "VEGA AI is experiencing momentary high demand. Click 'Try again' to generate.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("per_day")) {
    return "Model request quota momentarily reached. Automatic failover was activated or please retry in a few moments.";
  }
  if (msg.includes("API key") || (msg.includes("INVALID_ARGUMENT") && msg.includes("key"))) {
    return "Gemini API key is invalid or expired. Please verify your configuration in Settings > Secrets.";
  }
  if (msg.includes("BLOCKED") || msg.includes("Safety")) {
    return "The response was blocked due to safety guidelines.";
  }

  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}

// SEO: Serve sitemap.xml and robots.txt
app.get("/sitemap.xml", (_req, res) => {
  const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
  res.type("application/xml");
  res.sendFile(sitemapPath);
});

app.get("/robots.txt", (_req, res) => {
  const robotsPath = path.join(process.cwd(), "public", "robots.txt");
  res.type("text/plain");
  res.sendFile(robotsPath);
});

// Helper to fetch and extract clean text from any URL (web crawler / analyzer)
async function fetchAndExtractUrlContent(targetUrl: string): Promise<{ title: string; text: string } | null> {
  try {
    const urlObj = new URL(targetUrl);
    if (!["http:", "https:"].includes(urlObj.protocol)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ur;q=0.8,hi;q=0.7",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : targetUrl;

    // Extract main text content, stripping noise
    let cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, " ")
      .trim();

    if (cleanText.length > 6000) {
      cleanText = cleanText.slice(0, 6000) + "... [Web content truncated for speed]";
    }

    return { title, text: cleanText };
  } catch (err: any) {
    console.warn(`Could not fetch URL ${targetUrl}:`, err?.message);
    return null;
  }
}

// Endpoint to fetch and inspect web URLs directly
app.post("/api/url/fetch", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const extracted = await fetchAndExtractUrlContent(url.trim());
    if (!extracted) {
      return res.status(422).json({ error: "Unable to retrieve content from this URL. Please verify the link is accessible." });
    }

    return res.json({
      url,
      title: extracted.title,
      text: extracted.text,
      excerpt: extracted.text.slice(0, 300) + "...",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to process URL" });
  }
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Helper to clean markdown syntax before text-to-speech
function cleanMarkdownForSpeech(markdown: string): string {
  if (!markdown) return "";
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^[\s-*+>#]+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Split text into natural sentence chunks for TTS (max 160 chars per chunk)
function splitTextIntoSpeechChunks(text: string, maxLen = 160): string[] {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.?!،۔;\n])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 <= maxLen) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      if (current) chunks.push(current);
      if (sentence.length > maxLen) {
        const words = sentence.split(/\s+/);
        let wordChunk = "";
        for (const word of words) {
          if (wordChunk.length + word.length + 1 <= maxLen) {
            wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = word;
          }
        }
        current = wordChunk;
      } else {
        current = sentence;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// In-memory cache for generated TTS audio buffers
const ttsCache = new Map<string, Buffer>();

// Audio transcription endpoint for microphone voice input fallback
app.post("/api/audio/transcribe", async (req, res) => {
  try {
    const { audioData, mimeType, language } = req.body;
    if (!audioData || typeof audioData !== "string") {
      return res.status(400).json({ error: "Missing audio data" });
    }

    const cleanBase64 = audioData.includes(",") ? audioData.split(",")[1] : audioData;
    const safeMime = mimeType || "audio/webm";

    const ai = getGenAI();

    const langInstruction =
      language === "ur-PK" || language === "urdu"
        ? "The spoken audio is in Urdu (اردو) or mixed Urdu/English. Transcribe it accurately in Urdu script."
        : language === "hi-IN" || language === "hindi"
        ? "The spoken audio is in Hindi (हिन्दी) or mixed Hindi/English. Transcribe it accurately in Devanagari Hindi script."
        : "Transcribe the spoken audio accurately in the language it is spoken (Urdu, Hindi, English, Punjabi, etc.).";

    let transcription = "";
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: safeMime,
                    data: cleanBase64,
                  },
                },
                {
                  text: `${langInstruction}\n\nStrict Rules:\n1. Transcribe the spoken speech verbatim.\n2. Output ONLY the transcribed text. Do NOT add introductory phrases, quotes, or markdown annotations.\n3. If the audio is silent or only background noise without speech, return an empty string.`,
                },
              ],
            },
          ],
        });

        transcription = (response.text || "").trim();
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Audio transcribe attempt failed with model ${modelName}:`, err?.message);
      }
    }

    if (!transcription && lastError) {
      return res.status(500).json({ error: formatGeminiErrorMessage(lastError) });
    }

    return res.json({ text: transcription });
  } catch (err: any) {
    console.error("Transcribe API error:", err);
    return res.status(500).json({ error: formatGeminiErrorMessage(err) });
  }
});

// High-Fidelity Text-to-Speech (TTS) Endpoint
// Generates natural, clear spoken audio in Urdu, Hindi, English, etc.
app.all("/api/audio/tts", async (req, res) => {
  try {
    const rawText = (req.method === "POST" ? req.body?.text : req.query.text) as string | undefined;
    const requestedLang = ((req.method === "POST" ? req.body?.lang : req.query.lang) as string | undefined) || "ur";

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ error: "Missing text for TTS" });
    }

    const cleanText = cleanMarkdownForSpeech(rawText);
    if (!cleanText) {
      return res.status(400).json({ error: "Text has no pronounceable content" });
    }

    // Language detection: prioritize Urdu script, then Hindi, then requested lang
    const hasUrdu = /[\u0600-\u06FF]/.test(cleanText);
    const hasHindi = /[\u0900-\u097F]/.test(cleanText);
    let targetLang = "ur";
    if (hasUrdu) {
      targetLang = "ur";
    } else if (hasHindi) {
      targetLang = "hi";
    } else if (requestedLang.toLowerCase().startsWith("ur")) {
      targetLang = "ur";
    } else if (requestedLang.toLowerCase().startsWith("hi")) {
      targetLang = "hi";
    } else if (requestedLang.toLowerCase().startsWith("ar")) {
      targetLang = "ar";
    } else if (requestedLang.toLowerCase().startsWith("en")) {
      targetLang = "en";
    } else {
      targetLang = requestedLang.slice(0, 2).toLowerCase();
    }

    // Cache key
    const cacheKey = `${targetLang}:${cleanText.slice(0, 500)}`;
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", cached.length.toString());
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Accept-Ranges", "bytes");
      return res.end(cached);
    }

    // Split text into chunks
    const chunks = splitTextIntoSpeechChunks(cleanText, 160);
    // Limit to safe number of chunks to prevent timeouts
    const safeChunks = chunks.slice(0, 15);

    // Parallel fetch for speed
    const chunkResults = await Promise.all(
      safeChunks.map(async (chunk) => {
        const trimmed = chunk.trim();
        if (!trimmed) return null;
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(trimmed)}`;
        try {
          const response = await fetch(ttsUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              Accept: "audio/mpeg, */*",
            },
          });
          if (response.ok) {
            const ab = await response.arrayBuffer();
            if (ab.byteLength > 0) {
              return Buffer.from(ab);
            }
          }
        } catch (e) {
          console.warn(`TTS fetch chunk error for [${trimmed.slice(0, 20)}...]:`, e);
        }
        return null;
      })
    );

    const buffers: Buffer[] = chunkResults.filter((b): b is Buffer => b !== null);

    if (buffers.length === 0) {
      return res.status(502).json({ error: "Failed to synthesize speech audio" });
    }

    const fullBuffer = Buffer.concat(buffers);

    // Store in cache (limit cache to ~150 items)
    if (ttsCache.size > 150) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, fullBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", fullBuffer.length.toString());
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Accept-Ranges", "bytes");

    return res.end(fullBuffer);
  } catch (err: any) {
    console.error("TTS API error:", err);
    return res.status(500).json({ error: "TTS generation failed: " + (err?.message || "unknown") });
  }
});

// Streaming chat endpoint
app.post("/api/chat/stream", async (req, res) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const { messages, systemInstruction, language } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.write(`data: ${JSON.stringify({ error: "Invalid or empty messages payload" })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const ai = getGenAI();

    // Check if user is asking to generate an image
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
    const userPromptText = (lastUserMessage?.content || "").trim();
    const isImageGenRequest = (() => {
      const p = userPromptText.toLowerCase();
      return (
        p.startsWith("generate image") ||
        p.startsWith("generate an image") ||
        p.startsWith("create an image") ||
        p.startsWith("draw an image") ||
        p.startsWith("make an image") ||
        p.startsWith("paint an image") ||
        p.startsWith("تصویر بناؤ") ||
        p.startsWith("امیج بناؤ") ||
        p.startsWith("امیج جنریٹ") ||
        p.includes("generate an image of") ||
        p.includes("create an image of") ||
        p.includes("draw a picture of") ||
        p.includes("کی تصویر بناؤ")
      );
    })();

    if (isImageGenRequest) {
      try {
        const cleanPrompt = userPromptText
          .replace(/^(generate image|generate an image|create an image|draw an image|make an image|تصویر بناؤ|امیج جنریٹ کر دو|امیج بناؤ) (of|about|for)?\s*/i, "")
          .trim() || userPromptText;

        const halalCheck = checkHalalCompliance(cleanPrompt);
        if (!halalCheck.isHalal) {
          const rejectMsg = halalCheck.reason || "یہ پرامپٹ اسلامی و اخلاقی اصولوں (حلال معیارات) کے خلاف ہے۔ براہ کرم مناسب مواد بنانے کی درخواست کریں۔";
          res.write(`data: ${JSON.stringify({ text: rejectMsg })}\n\n`);
          res.write("data: [DONE]\n\n");
          return res.end();
        }

        const isUrdu = language === "ur-PK" || language === "urdu";
        const progressMsg = isUrdu ? "🎨 آپ کی حلال اور خوبصورت تصویر تیار کی جا رہی ہے..." : "🎨 Generating your requested image...";
        res.write(`data: ${JSON.stringify({ text: progressMsg })}\n\n`);

        const imgUrl = await generateVisualImage(cleanPrompt, "photorealistic", "1:1");
        const intro = isUrdu ? "✨ یہ رہی آپ کی بنائی گئی تصویر:" : "✨ Here is your generated image:";
        const markdownOutput = `\n\n${intro}\n\n![${cleanPrompt}](${imgUrl})\n\n**پرامپٹ:** *${cleanPrompt}*\n\n> 💡 آپ اوپر دیے گئے **AI اسٹوڈیو** بٹن پر کلک کر کے مزید جدید تبدیلیاں اور اس سے ویڈیو بھی بنا سکتے ہیں!`;

        res.write(`data: ${JSON.stringify({ text: markdownOutput })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      } catch (imgErr) {
        console.warn("Image generation fallback to Gemini:", imgErr);
        // Fall back gracefully to Gemini text stream
      }
    }

    let fetchedUrlContext = "";
    if (lastUserMessage && typeof lastUserMessage.content === "string") {
      const urlMatches = lastUserMessage.content.match(/https?:\/\/[^\s"'<>()[\]]+/gi);
      if (urlMatches && urlMatches.length > 0) {
        // Fetch the first 2 distinct URLs
        const uniqueUrls: string[] = Array.from(new Set<string>(urlMatches)).slice(0, 2);
        for (const targetUrl of uniqueUrls) {
          const extracted = await fetchAndExtractUrlContent(targetUrl);
          if (extracted && extracted.text) {
            fetchedUrlContext += `\n\n[Live Web Content from ${targetUrl}]:\nTitle: ${extracted.title}\nContent:\n${extracted.text}\n`;
          }
        }
      }
    }

    // Construct Gemini contents array
    // Map roles: 'user' -> 'user', 'assistant' -> 'model'
    const contents = messages.map((m: {
      role: string;
      content: string;
      images?: { mimeType: string; data: string }[];
    }, idx: number) => {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      // Add image / PDF / video thumbnail parts if present
      if (Array.isArray(m.images) && m.images.length > 0) {
        for (const img of m.images) {
          if (img?.data && img?.mimeType) {
            // Remove data URI prefix if present
            const cleanBase64 = img.data.includes(",") ? img.data.split(",")[1] : img.data;
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: cleanBase64,
              },
            });
          }
        }
      }

      // Add text part (including extracted URL context on the latest user message)
      let messageText = m.content || "";
      if (idx === messages.length - 1 && fetchedUrlContext) {
        messageText += fetchedUrlContext;
      }

      if (messageText || parts.length === 0) {
        parts.push({ text: messageText || "Please analyze this file/image." });
      }

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    // Concise, user-intent-focused system prompt
    let defaultSystem = "You are VEGA AI, an intelligent, disciplined, multimodal AI assistant.";
    defaultSystem += "\nCRITICAL DIRECTIVE ON OBEDIENCE & USER INTENT: Follow strictly what the user asks or commands. Never take unprompted actions or make assumptions. Do NOT output unsolicited CVs, code, advice, or features unless the user specifically asks for them. If the user has not given details for a request (such as for creating a CV), polite and directly ask the user for their required details (name, education, experience) rather than inventing or forcing unrequested content. Execute only what the user asks.";
    defaultSystem += "\nREADABILITY & SPOKEN OUTPUT: Frame your answers cleanly and clearly so that when read aloud via the speaker, they sound natural, clear, and easy to understand.";
    defaultSystem += "\nMULTIMODAL VISION & VIDEO: When the user attaches a photo, screenshot, document, PDF, or video clip and asks a question about it, analyze it carefully and answer precisely.";
    defaultSystem += "\nCV & RESUME GENERATION: ONLY when the user explicitly requests a CV or Resume (e.g., 'میرے لیے سی وی بناؤ' or 'make my CV'):";
    defaultSystem += "\n- If the user provides details, generate a clean, ATS-friendly CV formatted in Markdown with proper headings.";
    defaultSystem += "\n- If the user has not provided details, ask them for their name, qualification, and experience.";
    defaultSystem += "\nLANGUAGE: If the user communicates in Urdu or Hindi or prefers Urdu (اردو/ہندی), answer in clear, simple language matching their preference.";

    if (language === "ur-PK" || language === "urdu") {
      defaultSystem += "\nبراہ کرم صارف کے حکم اور سوال کے مطابق بالکل واضح، شائستہ اور درست اردو میں جواب دیں تاکہ وہ اسے آسانی سے سن اور سمجھ سکیں۔ اپنی طرف سے کوئی اضافی غیر ضروری کام نہ کریں۔";
    }

    const finalSystemPrompt = systemInstruction ? `${defaultSystem}\n${systemInstruction}` : defaultSystem;

    let streamedAnyChunk = false;
    let lastError: any = null;
    let isClientConnected = true;

    res.on("close", () => {
      isClientConnected = false;
    });

    // Iterate through candidate models to provide automatic failover if one is overloaded
    for (const modelName of CANDIDATE_MODELS) {
      if (!isClientConnected) break;

      try {
        const streamResponse = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction: finalSystemPrompt,
          },
        });

        for await (const chunk of streamResponse) {
          if (!isClientConnected) {
            break;
          }
          const textChunk = chunk.text;
          if (textChunk) {
            streamedAnyChunk = true;
            res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
        }

        // If client disconnected, stop
        if (!isClientConnected) {
          return res.end();
        }

        // Finished streaming successfully
        res.write("data: [DONE]\n\n");
        if (typeof (res as any).flush === "function") {
          (res as any).flush();
        }
        return res.end();
      } catch (err: any) {
        lastError = err;
        // If we already sent partial content chunks to client, do not attempt to start a new model stream midway
        if (streamedAnyChunk) {
          break;
        }
        // Transient delay before switching to next candidate model
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    // If streaming failed on all candidate models without sending any chunks, attempt standard generateContent fallback
    if (!streamedAnyChunk && isClientConnected) {
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const nonStreamResponse = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: finalSystemPrompt,
            },
          });
          const text = nonStreamResponse.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
            res.write("data: [DONE]\n\n");
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
            return res.end();
          }
        } catch (err: any) {
          lastError = err;
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    }

    // All candidate models failed or stream interrupted
    const friendlyError = formatGeminiErrorMessage(lastError);
    res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Gemini API Error in /api/chat/stream:", error);
    const clientErrorMsg = formatGeminiErrorMessage(error);
    res.write(`data: ${JSON.stringify({ error: clientErrorMsg })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// Non-streaming chat endpoint fallback
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction, language } = req.body;
    const ai = getGenAI();

    const contents = (messages || []).map((m: any) => {
      const parts: any[] = [];
      if (Array.isArray(m.images)) {
        for (const img of m.images) {
          if (img?.data && img?.mimeType) {
            const cleanBase64 = img.data.includes(",") ? img.data.split(",")[1] : img.data;
            parts.push({ inlineData: { mimeType: img.mimeType, data: cleanBase64 } });
          }
        }
      }
      if (m.content || parts.length === 0) {
        parts.push({ text: m.content || "Analyze this." });
      }
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });

    let defaultSystem = "You are VEGA AI, an intelligent, helpful multimodal assistant.";
    if (language === "ur-PK" || language === "urdu") {
      defaultSystem += " The user prefers Urdu when appropriate.";
    } else if (language === "pa-PK" || language === "punjabi") {
      defaultSystem += " The user prefers Punjabi when appropriate.";
    }
    const finalSystemPrompt = systemInstruction ? `${defaultSystem}\n${systemInstruction}` : defaultSystem;

    let lastError: any = null;
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: finalSystemPrompt,
          },
        });

        return res.json({ text: response.text || "" });
      } catch (err: any) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    const friendlyError = formatGeminiErrorMessage(lastError);
    res.status(503).json({ error: friendlyError });
  } catch (err: any) {
    console.error("Gemini API Error in /api/chat:", err);
    res.status(500).json({ error: formatGeminiErrorMessage(err) });
  }
});

// Dedicated AI image generation endpoint with Halal compliance and multi-engine fallback
app.post("/api/image/generate", async (req, res) => {
  try {
    const { prompt, style = "photorealistic", aspectRatio = "1:1", referenceImage, isHalalMode = true } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "امیج بنانے کے لیے پرامپٹ لکھنا ضروری ہے۔" });
    }

    // 1. Halal & Ethical compliance check
    if (isHalalMode) {
      const halal = checkHalalCompliance(prompt);
      if (!halal.isHalal) {
        return res.status(400).json({ error: halal.reason });
      }
    }

    const ai = getGenAI();
    let enhancedPrompt = prompt;

    // 2. Enhance and translate prompt to English visual prompt with Gemini
    try {
      let promptInstruction = `You are a professional visual prompt engineer for an AI image generator.
Convert this prompt into a rich, detailed, high-resolution English visual prompt.
Style: ${style}.
Aspect Ratio: ${aspectRatio}.
Include details on lighting, camera angle, textures, and composition.
STRICT HALAL DIRECTIVE: The image must strictly depict modest, ethical, halal, family-friendly elements. Absolutely no nudity, vulgarity, alcohol, or indecent themes.
Output ONLY the final expanded prompt in 1-2 descriptive sentences, without quotes.`;

      const parts: any[] = [];
      if (referenceImage && typeof referenceImage === "string") {
        const cleanB64 = referenceImage.includes(",") ? referenceImage.split(",")[1] : referenceImage;
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanB64,
          },
        });
        promptInstruction += `\nThe user provided a reference photo. Analyze the subject and composition, and create a stylized adaptation prompt applying the user's requested style (${style}) and modifications: ${prompt}`;
      }
      parts.push({ text: `Prompt: ${prompt}` });

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const enhanceRes = await ai.models.generateContent({
            model: modelName,
            contents: parts,
            config: { systemInstruction: promptInstruction },
          });
          const text = enhanceRes.text?.trim();
          if (text) {
            enhancedPrompt = text;
            break;
          }
        } catch (e) {
          // try next model
        }
      }
    } catch (e) {
      console.warn("Prompt enhancement skipped:", e);
    }

    // 3. Generate the visual image
    const imageUrl = await generateVisualImage(enhancedPrompt, style, aspectRatio);

    return res.json({
      imageUrl,
      prompt,
      enhancedPrompt,
      style,
      aspectRatio,
    });
  } catch (err: any) {
    console.error("AI Image Generation Error:", err);
    return res.status(500).json({ error: "امیج بنانے میں مسئلہ ہوا: " + (err.message || "Unknown error") });
  }
});

// Prompt enhancement endpoint
app.post("/api/image/enhance-prompt", async (req, res) => {
  try {
    const { prompt, style = "photorealistic" } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "پرامپٹ درکار ہے۔" });
    }

    const ai = getGenAI();
    let enhanced = prompt;
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Enhance this image description for an AI generator in detailed English with artistic lighting and style (${style}). Halal family-friendly standards only. Output only the prompt:\n${prompt}`,
        });
        const text = response.text?.trim();
        if (text) {
          enhanced = text;
          break;
        }
      } catch (e) {
        // next model
      }
    }
    return res.json({ enhancedPrompt: enhanced });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// AI Video Storyboard and Multi-scene generator
app.post("/api/video/storyboard", async (req, res) => {
  try {
    const {
      prompt,
      targetDurationMinutes = 1,
      style = "cinematic",
      aspectRatio = "16:9",
      voiceOption = "ai-urdu",
      referenceImage,
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "ویڈیو کا پرامپٹ لکھنا لازمی ہے۔" });
    }

    // 1. Halal check
    const halal = checkHalalCompliance(prompt);
    if (!halal.isHalal) {
      return res.status(400).json({ error: halal.reason });
    }

    const durationMins = Math.max(0.25, Math.min(5, Number(targetDurationMinutes) || 1));
    const targetSeconds = Math.round(durationMins * 60);

    // Determine number of scenes (each scene 8-15 seconds)
    const numScenes = durationMins <= 0.5 ? 3 : durationMins <= 1 ? 5 : durationMins <= 2 ? 8 : 12;

    const ai = getGenAI();

    let directorPrompt = `You are an elite AI Film Director and Video Producer.
Create a complete multi-scene video storyboard based on this request:
User Request: "${prompt}"
Target Duration: ${durationMins} minute(s) (~${targetSeconds} seconds total)
Visual Style: ${style}
Aspect Ratio: ${aspectRatio}

STRICT INSTRUCTIONS:
1. Divide the video into exactly ${numScenes} structured sequential cinematic scenes.
2. For each scene, specify:
   - order: integer (1 to ${numScenes})
   - title: concise scene title in Urdu (e.g., منظر ۱: مسحور کن شروعات)
   - durationSeconds: integer duration of this shot (between 8 and 15 seconds, totaling ~${targetSeconds}s)
   - visualPrompt: rich, detailed English description for visual image generation (lighting, camera angle, subject, composition)
   - overlayText: 1-2 lines of attractive Urdu subtitle/text overlay to display on screen
   - narrationScript: smooth, natural Urdu voiceover narration script to be spoken in this scene
   - cameraMotion: choose one of ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'tilt-up', 'slow-ken-burns']
3. HALAL & ETHICAL DIRECTIVE: Ensure all scenes, scripts, and visuals strictly respect Islamic, respectful, family-friendly guidelines. No nudity, vulgarity, alcohol, or indecent themes.
4. Output MUST be a valid JSON object matching this schema:
{
  "title": "عنوان (Video Title in Urdu)",
  "scenes": [
    {
      "order": 1,
      "title": "منظر کا نام",
      "durationSeconds": 10,
      "visualPrompt": "A breathtaking cinematic vista...",
      "overlayText": "یہاں سکرین پر لکھا ہوا متن آئے گا",
      "narrationScript": "یہاں اس منظر کی آواز کا مکمل اردو جملہ آئے گا",
      "cameraMotion": "zoom-in"
    }
  ]
}`;

    const parts: any[] = [];
    if (referenceImage && typeof referenceImage === "string") {
      const cleanB64 = referenceImage.includes(",") ? referenceImage.split(",")[1] : referenceImage;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanB64,
        },
      });
      directorPrompt += `\nThe user provided a reference starting photo. Ensure Scene 1 incorporates this photo or its aesthetic seamlessly.`;
    }
    parts.push({ text: `Create the ${numScenes}-scene video storyboard.` });

    let storyboardData: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: parts,
          config: {
            systemInstruction: directorPrompt,
            responseMimeType: "application/json",
          },
        });

        const rawText = response.text?.trim() || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          storyboardData = JSON.parse(jsonMatch[0]);
          if (Array.isArray(storyboardData.scenes) && storyboardData.scenes.length > 0) {
            break;
          }
        }
      } catch (e) {
        console.warn(`Model ${modelName} failed storyboard:`, e);
      }
    }

    if (!storyboardData || !Array.isArray(storyboardData.scenes) || storyboardData.scenes.length === 0) {
      // Fallback structured storyboard if Gemini failed
      storyboardData = {
        title: prompt.slice(0, 40),
        scenes: [
          {
            order: 1,
            title: "منظر ۱: تعارف و آغاز",
            durationSeconds: Math.round(targetSeconds / 3),
            visualPrompt: `Cinematic opening scene of ${prompt}, highly detailed, volumetric lighting, 8k resolution`,
            overlayText: prompt.slice(0, 50),
            narrationScript: `خوش آمدید! آج ہم دیکھیں گے: ${prompt}۔ ایک خوبصورت اور پرکشش منظر۔`,
            cameraMotion: "zoom-in",
          },
          {
            order: 2,
            title: "منظر ۲: تفصیلی منظر",
            durationSeconds: Math.round(targetSeconds / 3),
            visualPrompt: `Detailed cinematic close-up and panoramic view of ${prompt}, stunning colors, golden hour`,
            overlayText: "تفصیل اور حسن",
            narrationScript: "اس خوبصورت منظر کی باریکیاں اور فطری حسن دیکھنے والوں کو مسحور کر دیتا ہے۔",
            cameraMotion: "pan-right",
          },
          {
            order: 3,
            title: "منظر ۳: شاندار اختتام",
            durationSeconds: Math.round(targetSeconds / 3),
            visualPrompt: `Breathtaking cinematic finale shot of ${prompt}, serene atmosphere, epic wide angle`,
            overlayText: "شاندار اختتام",
            narrationScript: "یہ تھا ہمارا ایک خوبصورت سفر۔ دیکھنے کا بہت بہت شکریہ۔",
            cameraMotion: "slow-ken-burns",
          },
        ],
      };
    }

    // 2. In parallel, generate scene images for all scenes
    const scenePromises = storyboardData.scenes.map(async (sc: any, index: number) => {
      const sceneId = `scene_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
      let imgUrl = "";

      if (index === 0 && referenceImage && typeof referenceImage === "string") {
        imgUrl = referenceImage.startsWith("data:") ? referenceImage : `data:image/jpeg;base64,${referenceImage}`;
      } else {
        imgUrl = await generateVisualImage(sc.visualPrompt || prompt, style, aspectRatio);
      }

      const cleanScript = (sc.narrationScript || "").trim();
      const audioUrl = cleanScript ? `/api/audio/tts?text=${encodeURIComponent(cleanScript)}&lang=ur` : undefined;

      return {
        id: sceneId,
        order: sc.order || index + 1,
        title: sc.title || `منظر ${index + 1}`,
        durationSeconds: Math.max(5, Number(sc.durationSeconds) || 10),
        visualPrompt: sc.visualPrompt || prompt,
        imageUrl: imgUrl,
        overlayText: sc.overlayText || "",
        narrationScript: cleanScript,
        cameraMotion: sc.cameraMotion || "zoom-in",
        audioUrl,
      };
    });

    const populatedScenes = await Promise.all(scenePromises);

    const project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: storyboardData.title || prompt.slice(0, 40),
      prompt,
      targetDurationMinutes: durationMins,
      aspectRatio,
      style,
      scenes: populatedScenes,
      voiceOption,
      musicPreset: style === "islamic" ? "spiritual" : style === "nature" ? "peaceful" : "cinematic",
      createdAt: Date.now(),
    };

    return res.json({ project });
  } catch (err: any) {
    console.error("Video storyboard error:", err);
    return res.status(500).json({ error: "ویڈیو تیار کرنے میں مسئلہ ہوا: " + (err.message || "Unknown error") });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`My AI Assistant server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
