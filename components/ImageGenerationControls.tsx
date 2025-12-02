import React from 'react';
import { Sparkles, Palette, Cpu } from 'lucide-react';

export type ImageQuality = 'low' | 'medium' | 'high' | 'ultra';
export type ImageStyle = 'photo' | 'illustration' | 'manga' | 'comic' | 'anime' | 'watercolor' | 'oil-painting' | 'pixel-art';
export type ImageModel = 'flux-schnell' | 'flux-dev' | 'flux-krea-dev' | 'sdxl';

// Steps vary by model type
export const getStepsForModel = (model: ImageModel, quality: ImageQuality): number => {
  const isFlux = model.startsWith('flux');
  
  if (isFlux) {
    // Flux models: fewer steps needed
    switch (quality) {
      case 'low': return 4;
      case 'medium': return 6;
      case 'high': return 10;
      case 'ultra': return 15;
    }
  } else {
    // SDXL: more steps needed
    switch (quality) {
      case 'low': return 10;
      case 'medium': return 25;
      case 'high': return 50;
      case 'ultra': return 75;
    }
  }
};

export const MODEL_LABELS: Record<ImageModel, string> = {
  'flux-schnell': 'Flux Schnell ⚡',
  'flux-dev': 'Flux Dev',
  'flux-krea-dev': 'Flux Krea',
  'sdxl': 'SDXL (Alta Qualità)',
};

export const QUALITY_LABELS: Record<ImageQuality, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  ultra: 'Ultra',
};

export const STYLE_LABELS: Record<ImageStyle, string> = {
  photo: 'Fotorealistico',
  illustration: 'Illustrazione',
  manga: 'Manga',
  comic: 'Fumetto',
  anime: 'Anime',
  watercolor: 'Acquerello',
  'oil-painting': 'Pittura a olio',
  'pixel-art': 'Pixel Art',
};

export const STYLE_ICONS: Record<ImageStyle, string> = {
  photo: '📷',
  illustration: '🎨',
  manga: '📖',
  comic: '💥',
  anime: '🌸',
  watercolor: '💧',
  'oil-painting': '🖼️',
  'pixel-art': '👾',
};

export const STYLE_PROMPTS: Record<ImageStyle, string> = {
  photo: 'photorealistic, high detail, professional photography, sharp focus',
  illustration: 'digital illustration, detailed artwork, vibrant colors',
  manga: 'manga style, black and white, screentone shading, Japanese comic art',
  comic: 'comic book style, bold lines, cel shading, dynamic composition',
  anime: 'anime style, vibrant colors, detailed eyes, Japanese animation',
  watercolor: 'watercolor painting, soft edges, flowing colors, artistic',
  'oil-painting': 'oil painting, classical art style, rich textures, masterpiece',
  'pixel-art': 'pixel art, retro game style, 16-bit aesthetic, crisp pixels',
};

interface ImageGenerationControlsProps {
  model: ImageModel;
  quality: ImageQuality;
  style: ImageStyle;
  onModelChange: (model: ImageModel) => void;
  onQualityChange: (quality: ImageQuality) => void;
  onStyleChange: (style: ImageStyle) => void;
  compact?: boolean;
  showLabels?: boolean;
  showModel?: boolean;
}

export const ImageGenerationControls: React.FC<ImageGenerationControlsProps> = ({
  model,
  quality,
  style,
  onModelChange,
  onQualityChange,
  onStyleChange,
  compact = false,
  showLabels = true,
  showModel = true,
}) => {
  const models: ImageModel[] = ['flux-schnell', 'flux-dev', 'flux-krea-dev', 'sdxl'];
  const qualities: ImageQuality[] = ['low', 'medium', 'high', 'ultra'];
  const styles: ImageStyle[] = ['photo', 'illustration', 'manga', 'comic', 'anime', 'watercolor', 'oil-painting', 'pixel-art'];

  // Get current steps for display
  const currentSteps = getStepsForModel(model, quality);

  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        {showModel && (
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value as ImageModel)}
            className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600"
            title="Modello"
          >
            {models.map((m) => (
              <option key={m} value={m}>{MODEL_LABELS[m]}</option>
            ))}
          </select>
        )}
        <select
          value={quality}
          onChange={(e) => onQualityChange(e.target.value as ImageQuality)}
          className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600"
          title={`Qualità (${currentSteps} steps)`}
        >
          {qualities.map((q) => (
            <option key={q} value={q}>{QUALITY_LABELS[q]} ({getStepsForModel(model, q)})</option>
          ))}
        </select>
        <select
          value={style}
          onChange={(e) => onStyleChange(e.target.value as ImageStyle)}
          className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600"
          title="Stile immagine"
        >
          {styles.map((s) => (
            <option key={s} value={s}>{STYLE_LABELS[s]}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Model Selector */}
      {showModel && (
        <div>
          {showLabels && (
            <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
              <Cpu size={12} />
              Modello
            </label>
          )}
          <div className="grid grid-cols-2 gap-1">
            {models.map((m) => (
              <button
                key={m}
                onClick={() => onModelChange(m)}
                className={`px-2 py-1.5 text-xs rounded transition-colors ${
                  model === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {MODEL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quality Selector */}
      <div>
        {showLabels && (
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <Sparkles size={12} />
            Qualità ({currentSteps} steps)
          </label>
        )}
        <div className="flex gap-1">
          {qualities.map((q) => (
            <button
              key={q}
              onClick={() => onQualityChange(q)}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                quality === q
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={`${getStepsForModel(model, q)} steps`}
            >
              {q === 'low' ? '🐇' : q === 'medium' ? '⚖️' : q === 'high' ? '✨' : '💎'}
            </button>
          ))}
        </div>
      </div>

      {/* Style Selector - Dropdown */}
      <div>
        {showLabels && (
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <Palette size={12} />
            Stile
          </label>
        )}
        <select
          value={style}
          onChange={(e) => onStyleChange(e.target.value as ImageStyle)}
          className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 outline-none focus:border-blue-500"
        >
          {styles.map((s) => (
            <option key={s} value={s}>
              {STYLE_ICONS[s]} {STYLE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// Helper function to get steps from quality (legacy - use getStepsForModel instead)
export const getStepsFromQuality = (quality: ImageQuality, model: ImageModel = 'flux-schnell'): number => {
  return getStepsForModel(model, quality);
};

// Helper function to enhance prompt with style
export const enhancePromptWithStyle = (prompt: string, style: ImageStyle): string => {
  const stylePrompt = STYLE_PROMPTS[style];
  // Don't add style if prompt already contains style keywords
  if (prompt.toLowerCase().includes(style) || 
      prompt.toLowerCase().includes('style') ||
      prompt.toLowerCase().includes('manga') ||
      prompt.toLowerCase().includes('anime') ||
      prompt.toLowerCase().includes('comic')) {
    return prompt;
  }
  return `${prompt}, ${stylePrompt}`;
};

export default ImageGenerationControls;
