import React from 'react';
import { Sparkles, Palette } from 'lucide-react';

export type ImageQuality = 'low' | 'medium' | 'high' | 'ultra';
export type ImageStyle = 'photo' | 'illustration' | 'manga' | 'comic' | 'anime' | 'watercolor' | 'oil-painting' | 'pixel-art';

export const QUALITY_STEPS: Record<ImageQuality, number> = {
  low: 4,
  medium: 8,
  high: 20,
  ultra: 35,
};

export const QUALITY_LABELS: Record<ImageQuality, string> = {
  low: 'Bassa (veloce)',
  medium: 'Media',
  high: 'Alta',
  ultra: 'Ultra (lento)',
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
  quality: ImageQuality;
  style: ImageStyle;
  onQualityChange: (quality: ImageQuality) => void;
  onStyleChange: (style: ImageStyle) => void;
  compact?: boolean;
  showLabels?: boolean;
}

export const ImageGenerationControls: React.FC<ImageGenerationControlsProps> = ({
  quality,
  style,
  onQualityChange,
  onStyleChange,
  compact = false,
  showLabels = true,
}) => {
  const qualities: ImageQuality[] = ['low', 'medium', 'high', 'ultra'];
  const styles: ImageStyle[] = ['photo', 'illustration', 'manga', 'comic', 'anime', 'watercolor', 'oil-painting', 'pixel-art'];

  if (compact) {
    return (
      <div className="flex gap-2">
        <select
          value={quality}
          onChange={(e) => onQualityChange(e.target.value as ImageQuality)}
          className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600"
          title="Qualità immagine"
        >
          {qualities.map((q) => (
            <option key={q} value={q}>{QUALITY_LABELS[q]}</option>
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
      {/* Quality Selector */}
      <div>
        {showLabels && (
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <Sparkles size={12} />
            Qualità
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
              title={`${QUALITY_STEPS[q]} steps`}
            >
              {q === 'low' ? '🐇' : q === 'medium' ? '⚖️' : q === 'high' ? '✨' : '💎'}
              <span className="ml-1 hidden sm:inline">{q.charAt(0).toUpperCase() + q.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Selector */}
      <div>
        {showLabels && (
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <Palette size={12} />
            Stile
          </label>
        )}
        <div className="grid grid-cols-4 gap-1">
          {styles.map((s) => (
            <button
              key={s}
              onClick={() => onStyleChange(s)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                style === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={STYLE_LABELS[s]}
            >
              {s === 'photo' ? '📷' : 
               s === 'illustration' ? '🎨' : 
               s === 'manga' ? '📖' : 
               s === 'comic' ? '💥' : 
               s === 'anime' ? '🌸' : 
               s === 'watercolor' ? '💧' : 
               s === 'oil-painting' ? '🖼️' : '👾'}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1 text-center">
          {STYLE_LABELS[style]}
        </div>
      </div>
    </div>
  );
};

// Helper function to get steps from quality
export const getStepsFromQuality = (quality: ImageQuality): number => {
  return QUALITY_STEPS[quality];
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
