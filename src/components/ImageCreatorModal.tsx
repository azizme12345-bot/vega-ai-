import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Download,
  Share2,
  Video,
  Upload,
  RefreshCw,
  ShieldCheck,
  Wand2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { GeneratedImageItem, ImageAspectRatio, ImageStylePreset } from '../types';
import { aiMediaService } from '../services/aiMediaService';

interface ImageCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialImage?: string;
  onCreateVideoFromImage?: (imageUrl: string, prompt: string) => void;
}

const STYLE_OPTIONS: { id: ImageStylePreset; label: string; icon: string }[] = [
  { id: 'photorealistic', label: 'حقیقت پسندانہ (8K Photo)', icon: '📸' },
  { id: 'islamic-art', label: 'اسلامی و خطاطی (Halal & Art)', icon: '🕌' },
  { id: '3d-animation', label: 'تھری ڈی اینیمیشن (3D Cartoon)', icon: '🎬' },
  { id: 'portrait', label: 'اسٹوڈیو پورٹریٹ (Studio Portrait)', icon: '👤' },
  { id: 'oil-painting', label: 'آئل پینٹنگ (Fine Art)', icon: '🎨' },
  { id: 'cyberpunk', label: 'جدید و سائنسی (Sci-Fi)', icon: '🚀' },
];

const ASPECT_RATIOS: { id: ImageAspectRatio; label: string; ratioClass: string }[] = [
  { id: '1:1', label: '1:1 (مربع)', ratioClass: 'aspect-square' },
  { id: '16:9', label: '16:9 (یوٹیوب / لینڈ سکیپ)', ratioClass: 'aspect-video' },
  { id: '9:16', label: '9:16 (موبائل اسٹوری / ریل)', ratioClass: 'aspect-[9/16]' },
  { id: '4:3', label: '4:3 (معیاری)', ratioClass: 'aspect-[4/3]' },
];

export const ImageCreatorModal: React.FC<ImageCreatorModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = '',
  initialImage,
  onCreateVideoFromImage,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [style, setStyle] = useState<ImageStylePreset>('photorealistic');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [referenceImage, setReferenceImage] = useState<string | null>(initialImage || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageItem | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
    if (initialImage) {
      setReferenceImage(initialImage);
    }
  }, [initialPrompt, initialImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('تصویر کا سائز 10MB سے کم ہونا چاہیے۔');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      setError('براہ کرم پرامپٹ لکھیں تاکہ اسے بہتر بنایا جا سکے۔');
      return;
    }
    try {
      setIsEnhancing(true);
      setError(null);
      const enhanced = await aiMediaService.enhancePrompt(prompt, style);
      setPrompt(enhanced);
    } catch (err: any) {
      setError('پرامپٹ بہتر بنانے میں مسئلہ پیش آیا۔');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('براہ کرم تصویر کا پرامپٹ لکھیں۔');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const result = await aiMediaService.generateImage({
        prompt,
        style,
        aspectRatio,
        referenceImage: referenceImage || undefined,
        isHalalMode: true,
      });

      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message || 'امیج بنانے میں مسئلہ ہوا۔');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedImage?.imageUrl) return;
    navigator.clipboard.writeText(generatedImage.imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedImage?.imageUrl) return;
    const a = document.createElement('a');
    a.href = generatedImage.imageUrl;
    a.download = `vega-ai-image-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI امیج اسٹوڈیو
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  حلال و محفوظ
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                پرامپٹ یا اپنی تصویر سے جدید 8K آرٹ اور ویڈیو بیک گراؤنڈ بنائیں
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-5">
              {/* Prompt Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    تصویر کا پرامپٹ (اردو یا انگریزی)
                  </label>
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !prompt.trim()}
                    className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                    {isEnhancing ? 'بہتر بنایا جا رہا ہے...' : 'پرامپٹ بہتر بنائیں'}
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="مثال: غروبِ آفتاب کے وقت خوبصورت مسجد، ارد گرد سبز وادیاں اور جھیل کا دلکش منظر..."
                  rows={3}
                  dir="auto"
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Photo to Image (Optional reference upload) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    اپنی تصویر لگائیں (Image-to-Image / متبادل)
                  </label>
                  {referenceImage && (
                    <button
                      onClick={() => setReferenceImage(null)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      تصویر ہٹائیں
                    </button>
                  )}
                </div>

                {referenceImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50 p-2 flex items-center gap-3">
                    <img
                      src={referenceImage}
                      alt="Reference"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-600"
                    />
                    <div className="flex-1 text-xs text-slate-300">
                      <p className="font-medium text-emerald-400">تصویر شامل ہو گئی</p>
                      <p className="text-slate-400 text-[11px]">
                        AI اس تصویر کے خدوخال محفوظ رکھ کر نیا اسٹائل بنائے گا۔
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 transition group"
                  >
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition" />
                    <span className="text-xs text-slate-300">
                      تصویر اپلوڈ کرنے کے لیے کلک کریں یا ڈریگ کریں
                    </span>
                    <span className="text-[10px] text-slate-500">JPG, PNG (زیادہ سے زیادہ 10MB)</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Style Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">اسٹائل کا انتخاب</label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_OPTIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStyle(st.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-right transition ${
                        style === st.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-white font-medium'
                          : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-base">{st.icon}</span>
                      <span className="truncate">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">پیمائش (Aspect Ratio)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => setAspectRatio(ar.id)}
                      className={`p-2 rounded-xl border text-center text-xs transition ${
                        aspectRatio === ar.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-white font-medium'
                          : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    تصویر تیار کی جا رہی ہے...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    حلال AI امیج جنریٹ کریں
                  </>
                )}
              </button>
            </div>

            {/* Right Preview */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center">
              <div className="w-full h-full min-h-[340px] bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                {isGenerating ? (
                  <div className="text-center space-y-3 p-6">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                      <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">حلال و معیاری تصویر بنائی جا رہی ہے</p>
                      <p className="text-xs text-slate-400">روشنی، رنگ اور تفصیلات ترتیب پا رہی ہیں...</p>
                    </div>
                  </div>
                ) : generatedImage ? (
                  <div className="w-full h-full flex flex-col space-y-3">
                    <div className="relative w-full flex-1 max-h-[360px] rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                      <img
                        src={generatedImage.imageUrl}
                        alt={generatedImage.prompt}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                      <p className="text-xs text-slate-300 line-clamp-2 italic">
                        "{generatedImage.prompt}"
                      </p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          onClick={handleDownload}
                          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          ڈاؤنلوڈ کریں
                        </button>
                        <button
                          onClick={handleCopyLink}
                          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'کاپی ہو گیا' : 'لنک کاپی'}
                        </button>
                        {onCreateVideoFromImage && (
                          <button
                            onClick={() => onCreateVideoFromImage(generatedImage.imageUrl, generatedImage.prompt)}
                            className="py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md transition"
                          >
                            <Video className="w-3.5 h-3.5" />
                            اس سے ویڈیو بنائیں
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2 p-8 text-slate-500">
                    <ImageIcon className="w-12 h-12 mx-auto stroke-[1.5] text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">تصویر کا پریویو یہاں نظر آئے گا</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      بائیں جانب پرامپٹ لکھ کر "حلال AI امیج جنریٹ کریں" کا بٹن دبائیں۔
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
