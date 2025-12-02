import React from 'react';

export type ImageQuality = 'low' | 'medium' | 'high' | 'ultra';
export type ImageStyle = 'photo' | 'illustration' | 'manga' | 'comic' | 'anime' | 'watercolor' | 'oil-painting' | 'pixel-art';
export type ImageModel = 'flux-schnell' | 'sdxl';

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
}

export const ImageGenerationControls: React.FC<ImageGenerationControlsProps> = ({
  model,
  quality,
  style,
  onModelChange,
  onQualityChange,
  onStyleChange,
}) => {
  const models: ImageModel[] = ['flux-schnell', 'sdxl'];
  const qualities: ImageQuality[] = ['low', 'medium', 'high', 'ultra'];
  const styles: ImageStyle[] = ['photo', 'illustration', 'manga', 'comic', 'anime', 'watercolor', 'oil-painting', 'pixel-art'];

  // Get current steps for display
  const currentSteps = getStepsForModel(model, quality);

  // Always render the same compact 2-row layout with dropdowns only
  return (
    <div className="space-y-2">
      {/* Row 1: Model + Quality */}
      <div className="flex gap-2">
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value as ImageModel)}
          className="flex-1 bg-neutral-700 text-white text-xs rounded px-2 py-1.5 border border-neutral-600 outline-none"
        >
          {models.map((m) => (
            <option key={m} value={m}>{MODEL_LABELS[m]}</option>
          ))}
        </select>
        <select
          value={quality}
          onChange={(e) => onQualityChange(e.target.value as ImageQuality)}
          className="flex-1 bg-neutral-700 text-white text-xs rounded px-2 py-1.5 border border-neutral-600 outline-none"
          title={`${currentSteps} steps`}
        >
          {qualities.map((q) => (
            <option key={q} value={q}>{QUALITY_LABELS[q]} ({getStepsForModel(model, q)})</option>
          ))}
        </select>
      </div>
      {/* Row 2: Style */}
      <select
        value={style}
        onChange={(e) => onStyleChange(e.target.value as ImageStyle)}
        className="w-full bg-neutral-700 text-white text-xs rounded px-2 py-1.5 border border-neutral-600 outline-none"
      >
        {styles.map((s) => (
          <option key={s} value={s}>{STYLE_LABELS[s]}</option>
        ))}
      </select>
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
