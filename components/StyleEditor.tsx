import React, { useState, useEffect } from 'react';
import { X, BookOpen, Monitor, Gamepad2, ChevronDown, ChevronRight } from 'lucide-react';
import { StoryStyle, FontCategory, LayoutMode } from '../types';
import { 
  FONT_PRESETS, 
  FONT_CATEGORY_NAMES, 
  getGoogleFontsUrl,
  getAllFonts,
  ORNAMENTS
} from '../utils/stylePresets';

interface StyleEditorProps {
  style?: StoryStyle;
  onStyleChange: (style: StoryStyle) => void;
  onClose: () => void;
  onGenerateStyle?: (prompt: string) => void;
  isGenerating?: boolean;
}

// Sample data for preview
interface PreviewChoice {
  id: string;
  text: string;
}

interface PreviewNode {
  title: string;
  content: string;
  choices: PreviewChoice[];
  mediaUri: string;
}

const SAMPLE_NODE: PreviewNode = {
  title: 'Il Viaggio Inizia',
  content: `La luna piena illuminava il sentiero attraverso la foresta antica. I rami degli alberi secolari si intrecciavano sopra di te, creando un arco naturale che sembrava condurti verso l'ignoto.

Un fruscio tra le foglie attirò la tua attenzione. Qualcosa si muoveva nell'ombra, troppo grande per essere un semplice animale del bosco.

"Chi va là?" chiamasti, la voce che tremava leggermente.`,
  choices: [
    { id: 'c1', text: 'Avanzare con cautela verso il rumore' },
    { id: 'c2', text: 'Nasconderti dietro un albero' },
    { id: 'c3', text: 'Chiamare di nuovo, più forte' }
  ],
  mediaUri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=600&fit=crop'
};

const COLOR_PRESETS = {
  backgrounds: [
    { name: 'Nero', value: '#0a0a0f' },
    { name: 'Antracite', value: '#1a1a2e' },
    { name: 'Blu Notte', value: '#0f1729' },
    { name: 'Verde Scuro', value: '#0f1f0f' },
    { name: 'Bordeaux', value: '#1f0f0f' },
    { name: 'Seppia', value: '#2a2015' },
    { name: 'Pergamena', value: '#f5f0e6' },
    { name: 'Crema', value: '#faf8f0' },
  ],
  text: [
    { name: 'Bianco', value: '#ffffff' },
    { name: 'Avorio', value: '#f5f5dc' },
    { name: 'Grigio Chiaro', value: '#d0d0d0' },
    { name: 'Seppia', value: '#8b7355' },
    { name: 'Nero', value: '#1a1a1a' },
    { name: 'Marrone', value: '#3d2914' },
  ],
  accent: [
    { name: 'Oro', value: '#d4af37' },
    { name: 'Rosso', value: '#e94560' },
    { name: 'Blu', value: '#4a90d9' },
    { name: 'Verde', value: '#4a9d4a' },
    { name: 'Viola', value: '#9b59b6' },
    { name: 'Arancio', value: '#e67e22' },
  ],
  page: [
    { name: 'Pergamena', value: '#f5f0e6' },
    { name: 'Crema', value: '#faf8f0' },
    { name: 'Avorio', value: '#fffff0' },
    { name: 'Beige', value: '#f5f5dc' },
    { name: 'Grigio', value: '#e8e8e8' },
    { name: 'Bianco', value: '#ffffff' },
  ]
};

const StyleEditor: React.FC<StyleEditorProps> = ({
  style,
  onStyleChange,
  onClose,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<FontCategory | null>('serif');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  // Generate 216 web-safe colors + grayscale
  const allColors = React.useMemo(() => {
    const colors: string[] = [];
    const values = ['00', '33', '66', '99', 'cc', 'ff'];
    for (const r of values) {
      for (const g of values) {
        for (const b of values) {
          colors.push(`#${r}${g}${b}`);
        }
      }
    }
    for (let i = 0; i <= 255; i += 17) {
      const hex = i.toString(16).padStart(2, '0');
      const gray = `#${hex}${hex}${hex}`;
      if (!colors.includes(gray)) colors.push(gray);
    }
    return colors;
  }, []);

  // Default style values
  const currentStyle: StoryStyle = {
    background: style?.background || '#1a1a2e',
    textColor: style?.textColor || '#eaeaea',
    accentColor: style?.accentColor || '#e94560',
    fontFamily: style?.fontFamily || 'Lora, serif',
    animationClass: style?.animationClass || 'fade-in',
    titleFontFamily: style?.titleFontFamily || 'Playfair Display, serif',
    layoutMode: style?.layoutMode || 'standard',
    pageColor: style?.pageColor || '#f5f0e6',
    pageShadow: style?.pageShadow !== false,
    ornamentStyle: style?.ornamentStyle || 'elegant',
    titleFontSize: style?.titleFontSize || '2rem',
    textFontSize: style?.textFontSize || '1.1rem',
    vnDialogPosition: style?.vnDialogPosition || 'bottom',
    vnDialogStyle: style?.vnDialogStyle || 'modern',
    ...style
  };

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

  const handleLayoutChange = (mode: LayoutMode) => {
    updateStyle({ layoutMode: mode });
  };

  // Color Swatch Component with 256 color picker
  const ColorSwatch = ({ colors, selected, onChange, pickerId }: { 
    colors: { name: string; value: string }[]; 
    selected: string; 
    onChange: (value: string) => void;
    pickerId: string;
  }) => (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {colors.map(c => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            className={`w-6 h-6 rounded border-2 transition-all ${
              selected === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-neutral-500'
            }`}
            style={{ background: c.value }}
            title={c.name}
          />
        ))}
        <button
          onClick={() => setShowColorPicker(showColorPicker === pickerId ? null : pickerId)}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
            showColorPicker === pickerId ? 'border-indigo-500 bg-indigo-500/20' : 'border-neutral-600 bg-neutral-700'
          }`}
          title="Palette completa"
        >
          <span className="text-neutral-300">+</span>
        </button>
        <div 
          className="w-6 h-6 rounded border-2 border-white/50"
          style={{ background: selected }}
          title={`Attuale: ${selected}`}
        />
      </div>
      {showColorPicker === pickerId && (
        <div className="mt-2 p-2 bg-neutral-800 rounded-lg border border-neutral-600">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(18, 1fr)' }}>
            {allColors.map((color, i) => (
              <button
                key={i}
                onClick={() => { onChange(color); setShowColorPicker(null); }}
                className={`w-4 h-4 rounded-sm transition-transform hover:scale-150 hover:z-10 ${
                  selected === color ? 'ring-2 ring-white' : ''
                }`}
                style={{ background: color }}
                title={color}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={selected.startsWith('#') ? selected : '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-6 rounded cursor-pointer"
            />
            <input
              type="text"
              value={selected}
              onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value); }}
              className="flex-1 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-xs text-white font-mono"
              placeholder="#000000"
            />
          </div>
        </div>
      )}
    </div>
  );

  // Standard Page Preview
  const StandardPreview = () => (
    <div 
      className="rounded-lg overflow-hidden shadow-2xl h-full flex flex-col"
      style={{ background: currentStyle.background }}
    >
      {SAMPLE_NODE.mediaUri && (
        <div className="relative h-32 flex-shrink-0">
          <img src={SAMPLE_NODE.mediaUri} alt="Scene" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 50%, ${currentStyle.background} 100%)` }} />
        </div>
      )}
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="mb-3" style={{ fontFamily: currentStyle.titleFontFamily, fontSize: currentStyle.titleFontSize, color: currentStyle.textColor }}>
          {SAMPLE_NODE.title}
        </h2>
        <div className="leading-relaxed whitespace-pre-line mb-4 text-sm" style={{ fontFamily: currentStyle.fontFamily, fontSize: currentStyle.textFontSize, color: currentStyle.textColor }}>
          {SAMPLE_NODE.content}
        </div>
        <div className="space-y-2">
          {SAMPLE_NODE.choices.map((choice, i) => (
            <button
              key={choice.id}
              className="w-full text-left p-2 rounded-lg border transition-all text-sm"
              style={{ 
                borderColor: currentStyle.accentColor,
                color: currentStyle.textColor,
                fontFamily: currentStyle.fontFamily
              }}
            >
              <span style={{ color: currentStyle.accentColor }}>{i + 1}.</span> {choice.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Book Preview
  const BookPreview = () => {
    const ornament = ORNAMENTS[currentStyle.ornamentStyle || 'elegant'];
    return (
      <div className="h-full flex items-center justify-center p-2" style={{ background: currentStyle.background }}>
        <div className="flex shadow-2xl" style={{ transform: 'perspective(1000px) rotateY(-5deg)' }}>
          {/* Left page */}
          <div 
            className="w-36 h-48 p-3 relative"
            style={{ 
              background: currentStyle.pageColor,
              boxShadow: currentStyle.pageShadow ? 'inset -10px 0 20px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {ornament && <div className="absolute top-1 left-1 right-1 h-4 opacity-30" dangerouslySetInnerHTML={{ __html: ornament }} />}
            <img src={SAMPLE_NODE.mediaUri} alt="" className="w-full h-20 object-cover rounded mt-4" />
            {ornament && <div className="absolute bottom-1 left-1 right-1 h-4 opacity-30 rotate-180" dangerouslySetInnerHTML={{ __html: ornament }} />}
          </div>
          {/* Spine */}
          <div className="w-2 bg-gradient-to-r from-amber-900 to-amber-800" />
          {/* Right page */}
          <div 
            className="w-36 h-48 p-3 relative"
            style={{ 
              background: currentStyle.pageColor,
              boxShadow: currentStyle.pageShadow ? 'inset 10px 0 20px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <h3 className="text-xs font-bold mb-1" style={{ fontFamily: currentStyle.titleFontFamily, color: '#2a2015' }}>
              {SAMPLE_NODE.title}
            </h3>
            <p className="text-[8px] leading-tight" style={{ fontFamily: currentStyle.fontFamily, color: '#3d2914' }}>
              {SAMPLE_NODE.content.substring(0, 200)}...
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Visual Novel Preview
  const VisualNovelPreview = () => {
    const dialogPosition = currentStyle.vnDialogPosition || 'bottom';
    const dialogStyle = currentStyle.vnDialogStyle || 'modern';
    
    const dialogStyles = {
      modern: 'bg-black/80 backdrop-blur-sm border-t border-white/20',
      classic: 'bg-gradient-to-b from-neutral-900/95 to-black/95 border-2 border-amber-600/50',
      minimal: 'bg-black/60'
    };

    return (
      <div className="h-full relative rounded-lg overflow-hidden">
        <img src={SAMPLE_NODE.mediaUri} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        <div className={`absolute left-0 right-0 p-3 ${dialogPosition === 'top' ? 'top-0' : 'bottom-0'} ${dialogStyles[dialogStyle]}`}>
          <div className="text-xs font-bold mb-1" style={{ color: currentStyle.accentColor }}>
            Narratore
          </div>
          <p className="text-xs leading-relaxed text-white" style={{ fontFamily: currentStyle.fontFamily }}>
            {SAMPLE_NODE.content.substring(0, 150)}...
          </p>
          <div className="mt-2 space-y-1">
            {SAMPLE_NODE.choices.slice(0, 2).map((choice) => (
              <div key={choice.id} className="text-[10px] py-1 px-2 bg-white/10 rounded text-white/90">
                → {choice.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render controls based on layout type
  const renderLayoutControls = () => {
    const commonControls = (
      <>
        {/* Colors */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Colori</h4>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Sfondo</label>
            <ColorSwatch colors={COLOR_PRESETS.backgrounds} selected={currentStyle.background} onChange={(v) => updateStyle({ background: v })} pickerId="bg" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Testo</label>
            <ColorSwatch colors={COLOR_PRESETS.text} selected={currentStyle.textColor} onChange={(v) => updateStyle({ textColor: v })} pickerId="text" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Accento</label>
            <ColorSwatch colors={COLOR_PRESETS.accent} selected={currentStyle.accentColor} onChange={(v) => updateStyle({ accentColor: v })} pickerId="accent" />
          </div>
        </div>

        {/* Font Testo */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Font Testo</h4>
          <div className="space-y-1.5 max-h-24 overflow-y-auto">
            {(Object.keys(FONT_PRESETS) as FontCategory[]).map(category => (
              <div key={category} className="border border-neutral-700 rounded overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="w-full flex items-center justify-between p-2 bg-neutral-800 hover:bg-neutral-750 transition-colors text-xs"
                >
                  <span className="font-medium text-neutral-200">{FONT_CATEGORY_NAMES[category]}</span>
                  {expandedCategory === category ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {expandedCategory === category && (
                  <div className="p-1.5 grid grid-cols-2 gap-1 bg-neutral-850">
                    {FONT_PRESETS[category].map(font => {
                      loadFont(font.family);
                      return (
                        <button
                          key={font.name}
                          onClick={() => handleFontSelect(font.family)}
                          className={`p-1.5 rounded text-left transition-all text-xs ${
                            currentStyle.fontFamily === font.family ? 'bg-indigo-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                          }`}
                        >
                          <span style={{ fontFamily: font.family }}>{font.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Dimensione</label>
            <select value={currentStyle.textFontSize} onChange={(e) => updateStyle({ textFontSize: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded p-1.5 text-white text-xs">
              <option value="0.9rem">Piccolo</option>
              <option value="1rem">Medio</option>
              <option value="1.1rem">Grande</option>
              <option value="1.25rem">Molto Grande</option>
            </select>
          </div>
        </div>

        {/* Font Titoli */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Font Titoli</h4>
          <div className="flex items-center gap-2 mb-1">
            <input 
              type="checkbox" 
              id="sameFont" 
              checked={currentStyle.titleFontFamily === currentStyle.fontFamily}
              onChange={(e) => { if (e.target.checked) updateStyle({ titleFontFamily: currentStyle.fontFamily }); }}
              className="rounded border-neutral-600 w-3.5 h-3.5" 
            />
            <label htmlFor="sameFont" className="text-xs text-neutral-400">Stesso del testo</label>
          </div>
          {currentStyle.titleFontFamily !== currentStyle.fontFamily && (
            <select 
              value={currentStyle.titleFontFamily} 
              onChange={(e) => handleFontSelect(e.target.value, true)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded p-1.5 text-white text-xs"
            >
              {getAllFonts().map(font => {
                loadFont(font.family);
                return <option key={font.family} value={font.family}>{font.name}</option>;
              })}
            </select>
          )}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Dimensione</label>
            <select value={currentStyle.titleFontSize} onChange={(e) => updateStyle({ titleFontSize: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded p-1.5 text-white text-xs">
              <option value="1.5rem">Piccolo</option>
              <option value="2rem">Medio</option>
              <option value="2.5rem">Grande</option>
              <option value="3rem">Molto Grande</option>
            </select>
          </div>
        </div>
      </>
    );

    if (currentStyle.layoutMode === 'book') {
      return (
        <>
          {commonControls}
          <div className="space-y-3 pt-2 border-t border-neutral-700">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Opzioni Libro</h4>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Colore Pagina</label>
              <ColorSwatch colors={COLOR_PRESETS.page} selected={currentStyle.pageColor || '#f5f0e6'} onChange={(v) => updateStyle({ pageColor: v })} pickerId="page" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pageShadow" checked={currentStyle.pageShadow}
                onChange={(e) => updateStyle({ pageShadow: e.target.checked })} className="rounded border-neutral-600 w-3.5 h-3.5" />
              <label htmlFor="pageShadow" className="text-xs text-neutral-400">Ombre 3D</label>
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Ornamenti</label>
              <select value={currentStyle.ornamentStyle} onChange={(e) => updateStyle({ ornamentStyle: e.target.value as StoryStyle['ornamentStyle'] })}
                className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-white text-xs">
                <option value="none">Nessuno</option>
                <option value="simple">Semplice</option>
                <option value="elegant">Elegante</option>
                <option value="medieval">Medievale</option>
                <option value="art-nouveau">Art Nouveau</option>
              </select>
            </div>
          </div>
        </>
      );
    }

    if (currentStyle.layoutMode === 'visual-novel') {
      return (
        <>
          {commonControls}
          <div className="space-y-3 pt-2 border-t border-neutral-700">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Opzioni Visual Novel</h4>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Posizione Dialogo</label>
              <select value={currentStyle.vnDialogPosition || 'bottom'} onChange={(e) => updateStyle({ vnDialogPosition: e.target.value as 'top' | 'bottom' })}
                className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-white text-xs">
                <option value="bottom">In basso</option>
                <option value="top">In alto</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Stile Dialogo</label>
              <select value={currentStyle.vnDialogStyle || 'modern'} onChange={(e) => updateStyle({ vnDialogStyle: e.target.value as 'modern' | 'classic' | 'minimal' })}
                className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-white text-xs">
                <option value="modern">Moderno</option>
                <option value="classic">Classico</option>
                <option value="minimal">Minimale</option>
              </select>
            </div>
          </div>
        </>
      );
    }

    return commonControls;
  };

  const renderPreview = () => {
    switch (currentStyle.layoutMode) {
      case 'book':
        return <BookPreview />;
      case 'visual-novel':
        return <VisualNovelPreview />;
      default:
        return <StandardPreview />;
    }
  };

  const layoutTabs: { mode: LayoutMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'standard', label: 'Pagina Intera', icon: <Monitor size={16} /> },
    { mode: 'book', label: 'Libro', icon: <BookOpen size={16} /> },
    { mode: 'visual-novel', label: 'Visual Novel', icon: <Gamepad2 size={16} /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-neutral-700 shadow-2xl flex flex-col">
        {/* Header with Layout Tabs */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <div className="flex items-center gap-1">
            {layoutTabs.map(tab => (
              <button
                key={tab.mode}
                onClick={() => handleLayoutChange(tab.mode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  currentStyle.layoutMode === tab.mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content: Controls + Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Controls Panel */}
          <div className="w-80 border-r border-neutral-700 p-4 overflow-y-auto space-y-4">
            {renderLayoutControls()}
          </div>

          {/* Preview Panel */}
          <div className="flex-1 p-4 bg-neutral-950 overflow-hidden">
            <div className="h-full">
              {renderPreview()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors text-sm"
          >
            Annulla
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-sm font-medium"
          >
            Applica Stile
          </button>
        </div>
      </div>
    </div>
  );
};

export default StyleEditor;
