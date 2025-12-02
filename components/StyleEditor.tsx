import React, { useState, useEffect } from 'react';
import { X, Type, Palette, Layout, Layers, Sparkles, ChevronDown, ChevronRight, ImageIcon, User } from 'lucide-react';
import { StoryStyle, FontCategory, LayoutMode, TextureType } from '../types';
import { 
  FONT_PRESETS, 
  FONT_CATEGORY_NAMES, 
  TEXTURE_PATTERNS, 
  LAYOUT_CONFIGS,
  getGoogleFontsUrl,
  getAllFonts
} from '../utils/stylePresets';
import { ImageGenerationControls, ImageQuality, ImageStyle, QUALITY_LABELS, STYLE_LABELS } from './ImageGenerationControls';

interface StyleEditorProps {
  style?: StoryStyle;
  onStyleChange: (style: StoryStyle) => void;
  onClose: () => void;
  onGenerateStyle?: (prompt: string) => void;
  isGenerating?: boolean;
}

const StyleEditor: React.FC<StyleEditorProps> = ({
  style,
  onStyleChange,
  onClose,
  onGenerateStyle,
  isGenerating = false
}) => {
  const [activeTab, setActiveTab] = useState<'fonts' | 'colors' | 'layout' | 'texture' | 'vn' | 'ai'>('fonts');
  const [expandedCategory, setExpandedCategory] = useState<FontCategory | null>('serif');
  const [aiPrompt, setAiPrompt] = useState('');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  // Default style values
  const currentStyle: StoryStyle = {
    background: style?.background || '#1a1a2e',
    textColor: style?.textColor || '#eaeaea',
    accentColor: style?.accentColor || '#e94560',
    fontFamily: style?.fontFamily || 'Inter, sans-serif',
    animationClass: style?.animationClass || 'fade-in',
    fontCategory: style?.fontCategory || 'modern',
    titleFontFamily: style?.titleFontFamily || style?.fontFamily || 'Inter, sans-serif',
    layoutMode: style?.layoutMode || 'standard',
    textureType: style?.textureType || 'none',
    textureOpacity: style?.textureOpacity || 0.3,
    textureColor: style?.textureColor || '#d4c4a8',
    pageColor: style?.pageColor || '#f5f0e6',
    pageShadow: style?.pageShadow !== false,
    pageEdgeColor: style?.pageEdgeColor || '#d4c4a8',
    ornamentStyle: style?.ornamentStyle || 'elegant',
    titleFontSize: style?.titleFontSize || '2rem',
    textFontSize: style?.textFontSize || '1.1rem',
    ...style
  };

  // Load Google Font when selected
  const loadFont = (fontFamily: string) => {
    if (loadedFonts.has(fontFamily)) return;
    
    const url = getGoogleFontsUrl([fontFamily]);
    if (url) {
      const link = document.createElement('link');
      link.href = url;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      setLoadedFonts(prev => new Set([...prev, fontFamily]));
    }
  };

  // Load current fonts on mount
  useEffect(() => {
    if (currentStyle.fontFamily) loadFont(currentStyle.fontFamily);
    if (currentStyle.titleFontFamily) loadFont(currentStyle.titleFontFamily);
  }, []);

  const updateStyle = (updates: Partial<StoryStyle>) => {
    onStyleChange({ ...currentStyle, ...updates });
  };

  const handleFontSelect = (fontFamily: string, isTitle: boolean = false) => {
    loadFont(fontFamily);
    if (isTitle) {
      updateStyle({ titleFontFamily: fontFamily });
    } else {
      updateStyle({ fontFamily: fontFamily });
    }
  };

  const tabs = [
    { id: 'fonts', label: 'Fonts', icon: Type },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'texture', label: 'Texture', icon: Layers },
    { id: 'vn', label: 'Visual Novel', icon: ImageIcon },
    { id: 'ai', label: 'AI Generate', icon: Sparkles },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-neutral-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-xl font-bold text-white">Style Editor</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Fonts Tab */}
          {activeTab === 'fonts' && (
            <div className="space-y-6">
              {/* Body Font Selection */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-300 mb-3">Body Font</h3>
                <div className="space-y-2">
                  {(Object.keys(FONT_PRESETS) as FontCategory[]).map(category => (
                    <div key={category} className="border border-neutral-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                        className="w-full flex items-center justify-between p-3 bg-neutral-800 hover:bg-neutral-750 transition-colors"
                      >
                        <span className="font-medium text-neutral-200">{FONT_CATEGORY_NAMES[category]}</span>
                        {expandedCategory === category ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      
                      {expandedCategory === category && (
                        <div className="p-3 grid grid-cols-2 gap-2 bg-neutral-850">
                          {FONT_PRESETS[category].map(font => {
                            // Load font for preview
                            loadFont(font.family);
                            return (
                              <button
                                key={font.name}
                                onClick={() => handleFontSelect(font.family)}
                                className={`p-3 rounded-lg text-left transition-all ${
                                  currentStyle.fontFamily === font.family
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                                }`}
                              >
                                <span 
                                  className="block text-lg mb-1"
                                  style={{ fontFamily: font.family }}
                                >
                                  {font.name}
                                </span>
                                <span 
                                  className="text-xs opacity-60"
                                  style={{ fontFamily: font.family }}
                                >
                                  The quick brown fox jumps...
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Title Font Selection */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-300 mb-3">Title Font</h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="sameAsBody"
                    checked={currentStyle.titleFontFamily === currentStyle.fontFamily}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateStyle({ titleFontFamily: currentStyle.fontFamily });
                      }
                    }}
                    className="rounded border-neutral-600"
                  />
                  <label htmlFor="sameAsBody" className="text-sm text-neutral-400">
                    Same as body font
                  </label>
                </div>
                
                {currentStyle.titleFontFamily !== currentStyle.fontFamily && (
                  <select
                    value={currentStyle.titleFontFamily}
                    onChange={(e) => handleFontSelect(e.target.value, true)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white"
                  >
                    {getAllFonts().map(font => (
                      <option key={font.family} value={font.family}>
                        {font.name} ({FONT_CATEGORY_NAMES[font.category]})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Font Sizes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Title Size</label>
                  <select
                    value={currentStyle.titleFontSize}
                    onChange={(e) => updateStyle({ titleFontSize: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white"
                  >
                    <option value="1.5rem">Small</option>
                    <option value="2rem">Medium</option>
                    <option value="2.5rem">Large</option>
                    <option value="3rem">Extra Large</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Text Size</label>
                  <select
                    value={currentStyle.textFontSize}
                    onChange={(e) => updateStyle({ textFontSize: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white"
                  >
                    <option value="0.9rem">Small</option>
                    <option value="1rem">Medium</option>
                    <option value="1.1rem">Large</option>
                    <option value="1.25rem">Extra Large</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Background</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentStyle.background.startsWith('#') ? currentStyle.background : '#1a1a2e'}
                      onChange={(e) => updateStyle({ background: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-neutral-700"
                    />
                    <input
                      type="text"
                      value={currentStyle.background}
                      onChange={(e) => updateStyle({ background: e.target.value })}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 text-white text-sm"
                      placeholder="Color or gradient CSS"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Text Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentStyle.textColor}
                      onChange={(e) => updateStyle({ textColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-neutral-700"
                    />
                    <input
                      type="text"
                      value={currentStyle.textColor}
                      onChange={(e) => updateStyle({ textColor: e.target.value })}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentStyle.accentColor}
                      onChange={(e) => updateStyle({ accentColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-neutral-700"
                    />
                    <input
                      type="text"
                      value={currentStyle.accentColor}
                      onChange={(e) => updateStyle({ accentColor: e.target.value })}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Page Color (Book Mode)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentStyle.pageColor}
                      onChange={(e) => updateStyle({ pageColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-neutral-700"
                    />
                    <input
                      type="text"
                      value={currentStyle.pageColor}
                      onChange={(e) => updateStyle({ pageColor: e.target.value })}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Gradient Presets */}
              <div>
                <label className="text-sm font-semibold text-neutral-300 mb-3 block">Background Presets</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'Dark', value: '#0f0f1a' },
                    { name: 'Warm Dark', value: '#1a1510' },
                    { name: 'Ocean', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
                    { name: 'Forest', value: 'linear-gradient(135deg, #1a2e1a 0%, #0f1f0f 100%)' },
                    { name: 'Sunset', value: 'linear-gradient(135deg, #2e1a1a 0%, #1f0f0f 100%)' },
                    { name: 'Royal', value: 'linear-gradient(135deg, #1a1a2e 0%, #2e1a2e 100%)' },
                    { name: 'Parchment', value: '#d4c4a8' },
                    { name: 'Cream', value: '#f5f0e6' },
                  ].map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => updateStyle({ background: preset.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentStyle.background === preset.value
                          ? 'border-indigo-500'
                          : 'border-neutral-700 hover:border-neutral-500'
                      }`}
                      style={{ background: preset.value }}
                    >
                      <span className="text-xs font-medium text-white drop-shadow-lg">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Layout Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-neutral-300 mb-3 block">Layout Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  {(Object.entries(LAYOUT_CONFIGS) as [LayoutMode, typeof LAYOUT_CONFIGS[LayoutMode]][]).map(([mode, config]) => (
                    <button
                      key={mode}
                      onClick={() => updateStyle({ layoutMode: mode })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        currentStyle.layoutMode === mode
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {/* Layout preview icon */}
                        <div className="w-12 h-8 rounded border border-neutral-600 flex overflow-hidden">
                          {mode === 'standard' && (
                            <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                              <div className="w-6 h-4 bg-neutral-500 rounded-sm" />
                            </div>
                          )}
                          {mode === 'book' && (
                            <>
                              <div className="w-1/2 h-full bg-neutral-600 flex items-center justify-center">
                                <div className="w-4 h-4 bg-neutral-400 rounded-sm" />
                              </div>
                              <div className="w-1/2 h-full bg-neutral-700 flex items-center justify-center">
                                <div className="w-4 h-1 bg-neutral-500 rounded-sm" />
                              </div>
                            </>
                          )}
                          {mode === 'scroll' && (
                            <div className="w-full h-full bg-neutral-700 flex flex-col items-center justify-center gap-0.5 py-1">
                              <div className="w-6 h-0.5 bg-neutral-500 rounded-sm" />
                              <div className="w-6 h-0.5 bg-neutral-500 rounded-sm" />
                              <div className="w-4 h-0.5 bg-neutral-500 rounded-sm" />
                            </div>
                          )}
                          {mode === 'manuscript' && (
                            <div className="w-full h-full bg-amber-900/30 border-2 border-amber-700/50 flex items-center justify-center">
                              <div className="w-4 h-4 bg-amber-600/30 rounded-sm" />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-white">{config.name}</span>
                      </div>
                      <p className="text-xs text-neutral-400">{config.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Book-specific options */}
              {currentStyle.layoutMode === 'book' && (
                <div className="space-y-4 p-4 bg-neutral-800 rounded-xl">
                  <h4 className="font-semibold text-white">Book Options</h4>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="pageShadow"
                      checked={currentStyle.pageShadow}
                      onChange={(e) => updateStyle({ pageShadow: e.target.checked })}
                      className="rounded border-neutral-600"
                    />
                    <label htmlFor="pageShadow" className="text-sm text-neutral-300">
                      Page shadows (3D effect)
                    </label>
                  </div>

                  <div>
                    <label className="text-sm text-neutral-300 mb-2 block">Ornament Style</label>
                    <select
                      value={currentStyle.ornamentStyle}
                      onChange={(e) => updateStyle({ ornamentStyle: e.target.value as StoryStyle['ornamentStyle'] })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg p-2 text-white"
                    >
                      <option value="none">None</option>
                      <option value="simple">Simple</option>
                      <option value="elegant">Elegant</option>
                      <option value="medieval">Medieval</option>
                      <option value="art-nouveau">Art Nouveau</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-neutral-300 mb-2 block">Page Edge Color</label>
                    <input
                      type="color"
                      value={currentStyle.pageEdgeColor}
                      onChange={(e) => updateStyle({ pageEdgeColor: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer border-2 border-neutral-600"
                    />
                  </div>
                </div>
              )}

              {/* Animation */}
              <div>
                <label className="text-sm font-semibold text-neutral-300 mb-3 block">Page Transition</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['fade-in', 'slide-up', 'zoom-in', 'blur-in'] as const).map(anim => (
                    <button
                      key={anim}
                      onClick={() => updateStyle({ animationClass: anim })}
                      className={`p-3 rounded-lg border-2 capitalize transition-all ${
                        currentStyle.animationClass === anim
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                      }`}
                    >
                      {anim.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Texture Tab */}
          {activeTab === 'texture' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-neutral-300 mb-3 block">Texture Type</label>
                <div className="grid grid-cols-4 gap-3">
                  {(Object.entries(TEXTURE_PATTERNS) as [TextureType, typeof TEXTURE_PATTERNS[TextureType]][]).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => updateStyle({ 
                        textureType: type,
                        textureColor: config.defaultColor
                      })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        currentStyle.textureType === type
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      <div 
                        className="w-full h-16 rounded-lg mb-2 border border-neutral-600"
                        style={{
                          background: type === 'none' 
                            ? 'repeating-linear-gradient(45deg, #333 0, #333 10px, #444 10px, #444 20px)'
                            : config.defaultColor
                        }}
                      />
                      <span className="text-sm font-medium text-neutral-200">{config.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {currentStyle.textureType !== 'none' && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 block">Texture Color</label>
                    <input
                      type="color"
                      value={currentStyle.textureColor}
                      onChange={(e) => updateStyle({ textureColor: e.target.value })}
                      className="w-full h-12 rounded-lg cursor-pointer border-2 border-neutral-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-neutral-300 mb-2 block">
                      Texture Opacity: {Math.round((currentStyle.textureOpacity || 0.3) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentStyle.textureOpacity}
                      onChange={(e) => updateStyle({ textureOpacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Visual Novel Tab */}
          {activeTab === 'vn' && (
            <div className="space-y-6">
              <p className="text-sm text-neutral-400">
                Configure default image generation settings for Visual Novel mode. These settings will be used when generating backgrounds and character sprites.
              </p>

              {/* Global Quality & Style Settings */}
              <div className="p-4 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl space-y-4 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={18} className="text-purple-400" />
                  <h4 className="font-semibold text-white">Default Quality & Style</h4>
                </div>
                <p className="text-xs text-neutral-400 mb-3">
                  These settings apply to all image generation in the story.
                </p>
                <ImageGenerationControls
                  quality={(currentStyle.imageQuality as ImageQuality) || 'medium'}
                  style={(currentStyle.imageStyle as ImageStyle) || 'illustration'}
                  onQualityChange={(q) => updateStyle({ imageQuality: q })}
                  onStyleChange={(s) => updateStyle({ imageStyle: s })}
                />
              </div>

              {/* Background Settings */}
              <div className="p-4 bg-neutral-800 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon size={18} className="text-indigo-400" />
                  <h4 className="font-semibold text-white">Background Generation</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-300 mb-2 block">Model</label>
                    <select
                      value={currentStyle.vnBackgroundModel || 'flux-schnell'}
                      onChange={(e) => updateStyle({ vnBackgroundModel: e.target.value as StoryStyle['vnBackgroundModel'] })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg p-2.5 text-white text-sm"
                    >
                      <option value="sd-turbo">SD Turbo ⚡ (Fast)</option>
                      <option value="flux-schnell">Flux Schnell (Balanced)</option>
                      <option value="flux-dev">Flux Dev (Quality)</option>
                      <option value="sdxl">SDXL (High Quality)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-neutral-300 mb-2 block">Format</label>
                    <div className="flex gap-2">
                      {[
                        { w: 1024, h: 576, label: '16:9' },
                        { w: 768, h: 512, label: '3:2' },
                        { w: 512, h: 512, label: '1:1' },
                      ].map(({ w, h, label }) => (
                        <button
                          key={label}
                          onClick={() => updateStyle({ vnBackgroundWidth: w, vnBackgroundHeight: h })}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            (currentStyle.vnBackgroundWidth || 1024) === w && (currentStyle.vnBackgroundHeight || 576) === h
                              ? 'bg-indigo-600 text-white'
                              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border border-neutral-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Character Settings */}
              <div className="p-4 bg-neutral-800 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={18} className="text-pink-400" />
                  <h4 className="font-semibold text-white">Character Sprite Generation</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-300 mb-2 block">Model</label>
                    <select
                      value={currentStyle.vnCharacterModel || 'flux-dev'}
                      onChange={(e) => updateStyle({ vnCharacterModel: e.target.value as StoryStyle['vnCharacterModel'] })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg p-2.5 text-white text-sm"
                    >
                      <option value="sd-turbo">SD Turbo ⚡ (Fast)</option>
                      <option value="flux-schnell">Flux Schnell (Balanced)</option>
                      <option value="flux-dev">Flux Dev (Quality)</option>
                      <option value="sdxl">SDXL (High Quality)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-neutral-300 mb-2 block">Format</label>
                    <div className="flex gap-2">
                      {[
                        { w: 512, h: 768, label: '2:3' },
                        { w: 512, h: 512, label: '1:1' },
                        { w: 768, h: 512, label: '3:2' },
                      ].map(({ w, h, label }) => (
                        <button
                          key={label}
                          onClick={() => updateStyle({ vnCharacterWidth: w, vnCharacterHeight: h })}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            (currentStyle.vnCharacterWidth || 512) === w && (currentStyle.vnCharacterHeight || 768) === h
                              ? 'bg-pink-600 text-white'
                              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border border-neutral-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-500">
                  Tip: Use 2:3 portrait format for character sprites to fit the visual novel layout.
                </p>
              </div>
            </div>
          )}

          {/* AI Generate Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-neutral-300 mb-2 block">
                  Describe the style you want
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., 'Ancient medieval manuscript with parchment texture and gothic fonts' or 'Modern sci-fi with neon accents and futuristic typography'"
                  className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-white placeholder-neutral-500 resize-none"
                />
              </div>

              <button
                onClick={() => onGenerateStyle?.(aiPrompt)}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Style with AI
                  </>
                )}
              </button>

              {/* Quick presets */}
              <div>
                <label className="text-sm font-semibold text-neutral-300 mb-3 block">Quick Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Medieval Fantasy', prompt: 'Medieval fantasy book with parchment pages, gothic calligraphy, and ornate decorations' },
                    { name: 'Victorian Gothic', prompt: 'Victorian gothic novel with dark elegant fonts, sepia tones, and art nouveau ornaments' },
                    { name: 'Fairy Tale', prompt: 'Enchanted fairy tale with whimsical handwritten fonts, soft pastel colors, and magical sparkles' },
                    { name: 'Horror', prompt: 'Dark horror story with creepy distorted fonts, blood red accents, and grungy textures' },
                    { name: 'Sci-Fi', prompt: 'Futuristic sci-fi with clean modern fonts, neon blue accents, and holographic effects' },
                    { name: 'Ancient Manuscript', prompt: 'Ancient illuminated manuscript with calligraphic fonts, gold accents, and aged parchment' },
                  ].map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => setAiPrompt(preset.prompt)}
                      className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-left transition-colors"
                    >
                      <span className="text-sm font-medium text-white">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with preview */}
        <div className="border-t border-neutral-800 p-4">
          <div 
            className="rounded-xl p-6 mb-4"
            style={{
              background: currentStyle.background,
              fontFamily: currentStyle.fontFamily,
            }}
          >
            <h3 
              className="text-xl mb-2"
              style={{ 
                color: currentStyle.textColor,
                fontFamily: currentStyle.titleFontFamily,
                fontSize: currentStyle.titleFontSize,
              }}
            >
              Preview Title
            </h3>
            <p 
              style={{ 
                color: currentStyle.textColor,
                fontSize: currentStyle.textFontSize,
              }}
            >
              This is how your story text will appear with the current style settings.
            </p>
            <button
              className="mt-3 px-4 py-2 rounded-lg font-medium"
              style={{
                background: currentStyle.accentColor,
                color: currentStyle.background.startsWith('#') && currentStyle.background.length === 7 
                  ? (parseInt(currentStyle.background.slice(1), 16) > 0x7fffff ? '#000' : '#fff')
                  : '#fff'
              }}
            >
              Choice Button
            </button>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
            >
              Apply Style
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleEditor;
