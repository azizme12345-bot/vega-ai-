import {
  GeneratedImageItem,
  GeneratedVideoProject,
  ImageAspectRatio,
  ImageStylePreset,
  VideoAspectRatio,
  VideoStylePreset,
} from '../types';

export interface GenerateImageOptions {
  prompt: string;
  style?: ImageStylePreset;
  aspectRatio?: ImageAspectRatio;
  referenceImage?: string; // base64 or URL
  isHalalMode?: boolean;
}

export interface GenerateVideoOptions {
  prompt: string;
  targetDurationMinutes?: number; // 0.5, 1, 2, 5
  style?: VideoStylePreset;
  aspectRatio?: VideoAspectRatio;
  voiceOption?: 'ai-urdu' | 'ai-english' | 'user-mic' | 'none';
  referenceImage?: string;
}

class AIMediaService {
  /**
   * Check client-side for obvious Halal policy violations
   */
  checkHalalPrompt(prompt: string): { isHalal: boolean; reason?: string } {
    const lower = prompt.toLowerCase();
    const prohibited = [
      'nude', 'nudity', 'naked', 'erotic', 'porn', 'pornography', 'sexual',
      'vulgar', 'lingerie', 'bikini', 'cleavage', 'provocative', 'strip',
      'whiskey', 'vodka', 'beer', 'wine', 'alcohol', 'liquor', 'bar club',
      'gambling', 'casino', 'poker', 'betting',
      'عریانی', 'فحاشی', 'بے پردہ', 'جوا', 'شراب', 'نشہ', 'غیر اخلاقی'
    ];

    for (const term of prohibited) {
      if (lower.includes(term)) {
        return {
          isHalal: false,
          reason: 'یہ پرامپٹ اسلامی و اخلاقی اصولوں (حلال معیارات) کے منافی ہے۔ عریانی، فحاشی، شراب یا نامناسب مواد بنانا سختی سے ممنوع ہے۔',
        };
      }
    }
    return { isHalal: true };
  }

  /**
   * Generate an image with server prompt enhancement, halal check, and high-res rendering
   */
  async generateImage(options: GenerateImageOptions): Promise<GeneratedImageItem> {
    const halalCheck = this.checkHalalPrompt(options.prompt);
    if (!halalCheck.isHalal) {
      throw new Error(halalCheck.reason || 'حلال اور اخلاقی اصولوں کی خلاف ورزی کی وجہ سے امیج نہیں بنائی جا سکتی۔');
    }

    const res = await fetch('/api/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        style: options.style || 'photorealistic',
        aspectRatio: options.aspectRatio || '1:1',
        referenceImage: options.referenceImage,
        isHalalMode: options.isHalalMode !== false,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `امیج بنانے میں مسئلہ پیش آیا (Status: ${res.status})`);
    }

    const data = await res.json();
    return {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      prompt: options.prompt,
      enhancedPrompt: data.enhancedPrompt,
      imageUrl: data.imageUrl,
      aspectRatio: options.aspectRatio || '1:1',
      style: options.style || 'photorealistic',
      createdAt: Date.now(),
    };
  }

  /**
   * Enhance a prompt using Gemini
   */
  async enhancePrompt(prompt: string, style?: string): Promise<string> {
    const res = await fetch('/api/image/enhance-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style }),
    });
    if (!res.ok) {
      return prompt;
    }
    const data = await res.json();
    return data.enhancedPrompt || prompt;
  }

  /**
   * Generate a multi-scene Video Storyboard project
   */
  async generateVideoStoryboard(options: GenerateVideoOptions): Promise<GeneratedVideoProject> {
    const halalCheck = this.checkHalalPrompt(options.prompt);
    if (!halalCheck.isHalal) {
      throw new Error(halalCheck.reason || 'حلال اور اخلاقی اصولوں کی خلاف ورزی کی وجہ سے ویڈیو نہیں بنائی جا سکتی۔');
    }

    const res = await fetch('/api/video/storyboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        targetDurationMinutes: options.targetDurationMinutes || 1,
        style: options.style || 'cinematic',
        aspectRatio: options.aspectRatio || '16:9',
        voiceOption: options.voiceOption || 'ai-urdu',
        referenceImage: options.referenceImage,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `ویڈیو اسٹوری بورڈ تیار کرنے میں مسئلہ ہوا (Status: ${res.status})`);
    }

    const data = await res.json();
    return data.project as GeneratedVideoProject;
  }

  /**
   * Regenerate a single video scene visual
   */
  async regenerateSceneImage(visualPrompt: string, style?: string, aspectRatio?: string): Promise<string> {
    const res = await fetch('/api/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: visualPrompt,
        style: style || 'cinematic',
        aspectRatio: aspectRatio || '16:9',
      }),
    });
    if (!res.ok) {
      throw new Error('منظر کی تصویر دوبارہ بنانے میں مسئلہ ہوا۔');
    }
    const data = await res.json();
    return data.imageUrl;
  }
}

export const aiMediaService = new AIMediaService();
