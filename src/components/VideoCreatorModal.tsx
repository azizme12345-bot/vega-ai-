import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Video,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  Square,
  Download,
  Share2,
  Layers,
  Settings,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
  Clock,
  Film,
  Move,
  Upload,
} from 'lucide-react';
import {
  GeneratedVideoProject,
  VideoScene,
  VideoAspectRatio,
  VideoStylePreset,
  VideoCameraMotion,
} from '../types';
import { aiMediaService } from '../services/aiMediaService';
import { textToSpeechService } from '../services/speech/textToSpeech';

interface VideoCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialReferenceImage?: string;
}

const DURATION_OPTIONS = [
  { mins: 0.25, label: '15 سیکنڈ (Shorts)' },
  { mins: 0.5, label: '30 سیکنڈ (Reels)' },
  { mins: 1, label: '1 منٹ (معیاری کلپ)' },
  { mins: 2, label: '2 منٹ (مفصل کہانی)' },
  { mins: 5, label: '5 منٹ (مکمل دستاویزی ویڈیو)' },
];

const VIDEO_STYLES: { id: VideoStylePreset; label: string; icon: string }[] = [
  { id: 'cinematic', label: 'سینماٹک (Cinematic)', icon: '🎬' },
  { id: 'islamic', label: 'روحانی و اسلامی (Islamic Art)', icon: '🕌' },
  { id: 'animation', label: 'اینیمیشن و کارٹون (3D Cartoon)', icon: '🎨' },
  { id: 'nature', label: 'قدرت و مناظر (Nature 8K)', icon: '🌲' },
  { id: 'documentary', label: 'معلوماتی ڈاکومنٹری (Docu)', icon: '📚' },
];

const CAMERA_MOTIONS: { id: VideoCameraMotion; label: string }[] = [
  { id: 'zoom-in', label: 'زوم ان (Zoom In)' },
  { id: 'zoom-out', label: 'زوم آؤٹ (Zoom Out)' },
  { id: 'pan-left', label: 'پین بائیں (Pan Left)' },
  { id: 'pan-right', label: 'پین دائیں (Pan Right)' },
  { id: 'tilt-up', label: 'ٹلٹ اوپر (Tilt Up)' },
  { id: 'slow-ken-burns', label: 'کن برنز (Ken Burns)' },
];

export const VideoCreatorModal: React.FC<VideoCreatorModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = '',
  initialReferenceImage,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [durationMins, setDurationMins] = useState(1);
  const [style, setStyle] = useState<VideoStylePreset>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [voiceOption, setVoiceOption] = useState<'ai-urdu' | 'ai-english' | 'user-mic' | 'none'>('ai-urdu');
  const [referenceImage, setReferenceImage] = useState<string | null>(initialReferenceImage || null);

  // Studio State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<GeneratedVideoProject | null>(null);

  // Playback State
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0); // in seconds
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // In-app voice recording state for scenes
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordingSceneId, setRecordingSceneId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Export video state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const totalDuration = project?.scenes.reduce((acc, s) => acc + s.durationSeconds, 0) || 0;
  const currentScene = project?.scenes[currentSceneIndex];
  const activeSelectedScene = project?.scenes.find((s) => s.id === selectedSceneId) || currentScene;

  const playSceneAudio = useCallback((index: number) => {
    if (!project || !project.scenes[index]) return;
    const scene = project.scenes[index];

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    if (isMuted || voiceOption === 'none') return;

    if (scene.audioUrl) {
      const audio = new Audio(scene.audioUrl);
      audio.muted = isMuted;
      audioElementRef.current = audio;
      audio.play().catch(() => {});
    } else if (scene.narrationScript && voiceOption === 'ai-urdu') {
      textToSpeechService.speak(scene.id, scene.narrationScript, 'ur-PK').catch(() => {});
    }
  }, [project, isMuted, voiceOption]);

  useEffect(() => {
    if (initialPrompt && !project) {
      setPrompt(initialPrompt);
    }
    if (initialReferenceImage && !referenceImage) {
      setReferenceImage(initialReferenceImage);
    }
  }, [initialPrompt, initialReferenceImage]);

  // Clean up audio on unmount or pause
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Scene advance loop
  useEffect(() => {
    if (!isPlaying || !project || project.scenes.length === 0) return;

    let startTime = Date.now() - playbackTime * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;

      if (elapsed >= totalDuration) {
        setIsPlaying(false);
        setPlaybackTime(0);
        setCurrentSceneIndex(0);
        if (audioElementRef.current) {
          audioElementRef.current.pause();
        }
        clearInterval(interval);
        return;
      }

      setPlaybackTime(elapsed);

      // Determine current scene based on elapsed time
      let accumulated = 0;
      for (let i = 0; i < project.scenes.length; i++) {
        accumulated += project.scenes[i].durationSeconds;
        if (elapsed < accumulated) {
          if (i !== currentSceneIndex) {
            setCurrentSceneIndex(i);
            playSceneAudio(i);
          }
          break;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentSceneIndex, project, totalDuration, playSceneAudio]);

  // Handle Generate Full Project
  const handleGenerateProject = async () => {
    if (!prompt.trim()) {
      setError('براہ کرم ویڈیو کا پرامپٹ لکھیں۔');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setIsPlaying(false);

      const proj = await aiMediaService.generateVideoStoryboard({
        prompt,
        targetDurationMinutes: durationMins,
        style,
        aspectRatio,
        voiceOption,
        referenceImage: referenceImage || undefined,
      });

      setProject(proj);
      setCurrentSceneIndex(0);
      setPlaybackTime(0);
      if (proj.scenes.length > 0) {
        setSelectedSceneId(proj.scenes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'ویڈیو بنانے میں مسئلہ ہوا۔');
    } finally {
      setIsGenerating(false);
    }
  };

  // Playback Control
  const handleTogglePlay = () => {
    if (!project || project.scenes.length === 0) return;

    if (isPlaying) {
      setIsPlaying(false);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      playSceneAudio(currentSceneIndex);
    }
  };

  // Handle Photo Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Scene Edit Handlers
  const handleUpdateScene = (sceneId: string, updates: Partial<VideoScene>) => {
    if (!project) return;
    const updatedScenes = project.scenes.map((sc) => (sc.id === sceneId ? { ...sc, ...updates } : sc));
    setProject({ ...project, scenes: updatedScenes });
  };

  const handleRegenerateSceneVisual = async (scene: VideoScene) => {
    try {
      setError(null);
      const newImg = await aiMediaService.regenerateSceneImage(
        scene.visualPrompt || prompt,
        project?.style,
        project?.aspectRatio
      );
      handleUpdateScene(scene.id, { imageUrl: newImg });
    } catch (err: any) {
      setError('منظر کی تصویر دوبارہ بنانے میں مسئلہ ہوا۔');
    }
  };

  // Microphone recording for scene
  const handleStartMicRecord = async (sceneId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        handleUpdateScene(sceneId, { audioUrl });
        setIsRecordingMic(false);
        setRecordingSceneId(null);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingMic(true);
      setRecordingSceneId(sceneId);
    } catch (err) {
      setError('مائیکروفون تک رسائی ممکن نہیں ہوئی۔');
    }
  };

  const handleStopMicRecord = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Export video via HTML5 Canvas + MediaRecorder
  const handleExportVideo = async () => {
    if (!project || project.scenes.length === 0) return;

    try {
      setIsExporting(true);
      setExportProgress(10);

      const canvas = document.createElement('canvas');
      canvas.width = project.aspectRatio === '9:16' ? 720 : 1280;
      canvas.height = project.aspectRatio === '9:16' ? 1280 : 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering not supported');

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vega-video-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsExporting(false);
        setExportProgress(100);
      };

      recorder.start();

      // Render each scene onto canvas sequentially
      let processed = 0;
      for (const scene of project.scenes) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res) => {
          img.onload = res;
          img.onerror = res;
          img.src = scene.imageUrl;
        });

        // Draw animated frames for scene duration (simulated fast capture)
        const frames = 30 * Math.min(scene.durationSeconds, 4);
        for (let f = 0; f < frames; f++) {
          const progress = f / frames;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Camera motion zoom/pan
          const scale = 1 + progress * 0.08;
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
          ctx.restore();

          // Subtitles / Overlay card
          if (scene.overlayText) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.roundRect
              ? ctx.roundRect(40, canvas.height - 110, canvas.width - 80, 70, 12)
              : ctx.fillRect(40, canvas.height - 110, canvas.width - 80, 70);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(scene.overlayText, canvas.width / 2, canvas.height - 68);
          }

          await new Promise((r) => setTimeout(r, 20));
        }

        processed++;
        setExportProgress(Math.round((processed / project.scenes.length) * 90));
      }

      recorder.stop();
    } catch (err: any) {
      setError('ویڈیو برآمد (Export) کرنے میں مسئلہ ہوا: ' + err.message);
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                AI ویڈیو اسٹوڈیو اور ایڈیٹر
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  حلال و فیملی فرینڈلی
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                خودکار مناظر، سب ٹائٹلز، اردو وائس اوور اور کیمرہ موشن کے ساتھ مکمل ویڈیو
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

        {/* Studio Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {!project ? (
            /* Creation Form */
            <div className="max-w-3xl mx-auto space-y-6 py-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  ویڈیو کا موضوع یا تفصیلی پرامپٹ (اردو یا انگلش)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="مثال: پانچ منٹ کی خوبصورت اسلامی ویڈیو جس میں مساجد کا روحانی حسن، قرآن پاک کی تلاوت کا ماحول اور اخوت و بھائی چارے کا درس ہو..."
                  rows={3}
                  dir="auto"
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              {/* Photo-to-Video Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    شروعاتی تصویر لگائیں (Photo-to-Video / اختیاری)
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
                      alt="Starting Reference"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-600"
                    />
                    <div className="flex-1 text-xs text-slate-300">
                      <p className="font-medium text-emerald-400">تصویر شامل ہو گئی</p>
                      <p className="text-slate-400 text-[11px]">
                        ویڈیو کا پہلا منظر اس تصویر سے شروع ہو کر باقی مناظر سے جڑے گا۔
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-rose-500/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 transition group"
                  >
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-rose-400 transition" />
                    <span className="text-xs text-slate-300">
                      فوٹو ٹو ویڈیو کے لیے تصویر منتخب کریں (Click to Upload)
                    </span>
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

              {/* Duration and Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    ویڈیو کا دورانیہ (Duration)
                  </label>
                  <div className="space-y-1.5">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.mins}
                        type="button"
                        onClick={() => setDurationMins(opt.mins)}
                        className={`w-full p-2 rounded-xl border text-xs text-right transition flex items-center justify-between ${
                          durationMins === opt.mins
                            ? 'border-rose-500 bg-rose-500/15 text-white font-medium'
                            : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {durationMins === opt.mins && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Film className="w-3.5 h-3.5 text-slate-400" />
                    اسٹائل اور موڈ (Style & Theme)
                  </label>
                  <div className="space-y-1.5">
                    {VIDEO_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStyle(st.id)}
                        className={`w-full p-2 rounded-xl border text-xs text-right transition flex items-center justify-between ${
                          style === st.id
                            ? 'border-rose-500 bg-rose-500/15 text-white font-medium'
                            : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{st.icon}</span>
                          <span>{st.label}</span>
                        </span>
                        {style === st.id && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Voiceover Choice */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">وائس اوور (Voiceover Options)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ai-urdu', label: '🎙️ خودکار اردو آواز' },
                    { id: 'user-mic', label: '🎤 اپنی آواز ریکارڈ کروں گا' },
                    { id: 'ai-english', label: '🌐 انگریزی AI آواز' },
                    { id: 'none', label: '🔇 بغیر آواز / صرف ٹیکسٹ' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoiceOption(v.id as any)}
                      className={`p-2.5 rounded-xl border text-xs text-center transition ${
                        voiceOption === v.id
                          ? 'border-rose-500 bg-rose-500/15 text-white font-medium'
                          : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateProject}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    مکمل ویڈیو اسٹوری بورڈ تیار ہو رہا ہے... (مناظر اور آواز ترتیب دی جا رہی ہے)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    ویڈیو تیار کریں اور اسٹوڈیو کھولیں
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Live In-Studio Player & Multi-Scene Editor */
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Interactive Canvas Video Player */}
                <div className="lg:col-span-7 flex flex-col space-y-3">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center group">
                    {currentScene ? (
                      <div className="relative w-full h-full overflow-hidden">
                        {/* Scene Visual with Smooth Ken Burns Motion */}
                        <img
                          src={currentScene.imageUrl}
                          alt={currentScene.title}
                          className={`w-full h-full object-cover transition-transform duration-[10000ms] ease-out ${
                            isPlaying
                              ? currentScene.cameraMotion === 'zoom-in'
                                ? 'scale-125'
                                : currentScene.cameraMotion === 'zoom-out'
                                ? 'scale-100'
                                : currentScene.cameraMotion === 'pan-right'
                                ? 'scale-115 translate-x-4'
                                : currentScene.cameraMotion === 'pan-left'
                                ? 'scale-115 -translate-x-4'
                                : currentScene.cameraMotion === 'tilt-up'
                                ? 'scale-115 -translate-y-4'
                                : 'scale-120'
                              : 'scale-105'
                          }`}
                        />

                        {/* Top Scene Indicator */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs text-white drop-shadow-md pointer-events-none">
                          <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 font-medium">
                            {currentScene.title} ({currentSceneIndex + 1}/{project.scenes.length})
                          </span>
                          <span className="bg-rose-600/80 px-2 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wider">
                            {currentScene.cameraMotion}
                          </span>
                        </div>

                        {/* Animated Subtitle / Overlay Card */}
                        {currentScene.overlayText && (
                          <div className="absolute bottom-4 left-4 right-4 text-center">
                            <div className="inline-block max-w-xl bg-black/75 backdrop-blur-md border border-white/15 px-5 py-2.5 rounded-xl shadow-2xl animate-in fade-in duration-300">
                              <p className="text-sm sm:text-base font-bold text-white leading-relaxed" dir="auto">
                                {currentScene.overlayText}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs">منظر دستیاب نہیں</div>
                    )}

                    {/* Play/Pause Large Center Overlay when Hovered */}
                    <button
                      onClick={handleTogglePlay}
                      className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 hover:bg-rose-600/90 text-white flex items-center justify-center backdrop-blur-sm transition opacity-0 group-hover:opacity-100 shadow-xl"
                    >
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </button>
                  </div>

                  {/* Player Controls Bar */}
                  <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleTogglePlay}
                        className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setPlaybackTime(0);
                          setCurrentSceneIndex(0);
                          if (isPlaying) playSceneAudio(0);
                        }}
                        className="p-2 text-slate-400 hover:text-white rounded-lg transition"
                        title="شروع سے دیکھیں"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 text-slate-400 hover:text-white rounded-lg transition"
                        title={isMuted ? 'آواز کھولیں' : 'آواز بند کریں'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <span className="text-xs font-mono text-slate-400">
                        {Math.floor(playbackTime)}s / {totalDuration}s
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportVideo}
                        disabled={isExporting}
                        className="py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow"
                      >
                        {isExporting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ویڈیو بن رہی ہے ({exportProgress}%)
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            ویڈیو ڈاؤنلوڈ کریں
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Active Scene Inspector & Editor */}
                <div className="lg:col-span-5 flex flex-col space-y-4 bg-slate-850/50 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-rose-400" />
                      منظر کی تفصیلات اور ایڈیٹنگ
                    </h3>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                      Scene {activeSelectedScene?.order || 1}
                    </span>
                  </div>

                  {activeSelectedScene && (
                    <div className="space-y-4 text-xs">
                      {/* Subtitle / Overlay Editor */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-medium">سکرین پر نظر آنے والا متن (Subtitles / Overlay)</label>
                        <input
                          type="text"
                          value={activeSelectedScene.overlayText}
                          onChange={(e) =>
                            handleUpdateScene(activeSelectedScene.id, { overlayText: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                        />
                      </div>

                      {/* Narration Script */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-medium">اردو وائس اوور کا جملہ (Spoken Narration)</label>
                        <textarea
                          rows={2}
                          value={activeSelectedScene.narrationScript}
                          onChange={(e) =>
                            handleUpdateScene(activeSelectedScene.id, { narrationScript: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-rose-500 outline-none resize-none"
                        />
                      </div>

                      {/* Camera Motion & Duration */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-slate-300 font-medium">کیمرہ حرکت (Camera Motion)</label>
                          <select
                            value={activeSelectedScene.cameraMotion}
                            onChange={(e) =>
                              handleUpdateScene(activeSelectedScene.id, {
                                cameraMotion: e.target.value as VideoCameraMotion,
                              })
                            }
                            className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                          >
                            {CAMERA_MOTIONS.map((cm) => (
                              <option key={cm.id} value={cm.id}>
                                {cm.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-300 font-medium">دورانیہ (سیکنڈ)</label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                handleUpdateScene(activeSelectedScene.id, {
                                  durationSeconds: Math.max(5, activeSelectedScene.durationSeconds - 2),
                                })
                              }
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center font-mono py-1.5 bg-slate-800/80 rounded border border-slate-700 text-slate-200">
                              {activeSelectedScene.durationSeconds}s
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateScene(activeSelectedScene.id, {
                                  durationSeconds: activeSelectedScene.durationSeconds + 2,
                                })
                              }
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Voice Recording / Action Buttons */}
                      <div className="pt-2 border-t border-slate-800 flex items-center gap-2 flex-wrap">
                        {isRecordingMic && recordingSceneId === activeSelectedScene.id ? (
                          <button
                            onClick={handleStopMicRecord}
                            className="flex-1 py-2 px-3 bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 animate-pulse"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                            ریکارڈنگ روکیں
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartMicRecord(activeSelectedScene.id)}
                            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition"
                          >
                            <Mic className="w-3.5 h-3.5 text-rose-400" />
                            اپنی آواز ریکارڈ کریں
                          </button>
                        )}

                        <button
                          onClick={() => handleRegenerateSceneVisual(activeSelectedScene)}
                          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                          title="نئی تصویر بنائیں"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          نئی تصویر
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Multi-Scene Visual Timeline Strip */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    منظر بہ منظر ٹائم لائن ({project.scenes.length} مناظر)
                  </span>
                  <button
                    onClick={() => {
                      setProject(null);
                      setIsPlaying(false);
                    }}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    نیا پروجیکٹ بنائیں
                  </button>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {project.scenes.map((sc, idx) => (
                    <div
                      key={sc.id}
                      onClick={() => {
                        setSelectedSceneId(sc.id);
                        setCurrentSceneIndex(idx);
                        if (isPlaying) playSceneAudio(idx);
                      }}
                      className={`group relative flex-shrink-0 w-36 rounded-xl overflow-hidden border cursor-pointer transition ${
                        currentSceneIndex === idx
                          ? 'border-rose-500 ring-2 ring-rose-500/30'
                          : selectedSceneId === sc.id
                          ? 'border-indigo-500'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="relative aspect-video w-full bg-slate-950">
                        <img src={sc.imageUrl} alt={sc.title} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-black/60 text-[9px] font-mono px-1.5 py-0.5 rounded text-white">
                          #{idx + 1}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/60 text-[9px] font-mono px-1 py-0.5 rounded text-slate-300">
                          {sc.durationSeconds}s
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900 text-right">
                        <p className="text-[11px] font-medium text-slate-200 truncate">{sc.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
