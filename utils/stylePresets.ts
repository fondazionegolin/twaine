import { FontCategory, TextureType, LayoutMode } from '../types';

// Font definitions by category
export const FONT_PRESETS: Record<FontCategory, { name: string; family: string; googleFont?: string }[]> = {
  modern: [
    { name: 'Inter', family: 'Inter, sans-serif', googleFont: 'Inter:wght@400;500;600;700' },
    { name: 'Poppins', family: 'Poppins, sans-serif', googleFont: 'Poppins:wght@400;500;600;700' },
    { name: 'Montserrat', family: 'Montserrat, sans-serif', googleFont: 'Montserrat:wght@400;500;600;700' },
    { name: 'Roboto', family: 'Roboto, sans-serif', googleFont: 'Roboto:wght@400;500;700' },
    { name: 'Open Sans', family: 'Open Sans, sans-serif', googleFont: 'Open+Sans:wght@400;600;700' },
  ],
  serif: [
    { name: 'Playfair Display', family: 'Playfair Display, serif', googleFont: 'Playfair+Display:wght@400;500;600;700' },
    { name: 'Merriweather', family: 'Merriweather, serif', googleFont: 'Merriweather:wght@400;700' },
    { name: 'Lora', family: 'Lora, serif', googleFont: 'Lora:wght@400;500;600;700' },
    { name: 'Crimson Text', family: 'Crimson Text, serif', googleFont: 'Crimson+Text:wght@400;600;700' },
    { name: 'Libre Baskerville', family: 'Libre Baskerville, serif', googleFont: 'Libre+Baskerville:wght@400;700' },
    { name: 'EB Garamond', family: 'EB Garamond, serif', googleFont: 'EB+Garamond:wght@400;500;600;700' },
  ],
  calligraphic: [
    { name: 'Great Vibes', family: 'Great Vibes, cursive', googleFont: 'Great+Vibes' },
    { name: 'Tangerine', family: 'Tangerine, cursive', googleFont: 'Tangerine:wght@400;700' },
    { name: 'Pinyon Script', family: 'Pinyon Script, cursive', googleFont: 'Pinyon+Script' },
    { name: 'Alex Brush', family: 'Alex Brush, cursive', googleFont: 'Alex+Brush' },
    { name: 'Allura', family: 'Allura, cursive', googleFont: 'Allura' },
    { name: 'Dancing Script', family: 'Dancing Script, cursive', googleFont: 'Dancing+Script:wght@400;500;600;700' },
    { name: 'Parisienne', family: 'Parisienne, cursive', googleFont: 'Parisienne' },
  ],
  medieval: [
    { name: 'Cinzel', family: 'Cinzel, serif', googleFont: 'Cinzel:wght@400;500;600;700' },
    { name: 'Cinzel Decorative', family: 'Cinzel Decorative, serif', googleFont: 'Cinzel+Decorative:wght@400;700' },
    { name: 'Uncial Antiqua', family: 'Uncial Antiqua, serif', googleFont: 'Uncial+Antiqua' },
    { name: 'MedievalSharp', family: 'MedievalSharp, cursive', googleFont: 'MedievalSharp' },
    { name: 'Almendra', family: 'Almendra, serif', googleFont: 'Almendra:wght@400;700' },
    { name: 'Pirata One', family: 'Pirata One, cursive', googleFont: 'Pirata+One' },
    { name: 'Fondamento', family: 'Fondamento, cursive', googleFont: 'Fondamento' },
  ],
  fantasy: [
    { name: 'Metamorphous', family: 'Metamorphous, cursive', googleFont: 'Metamorphous' },
    { name: 'Grenze Gotisch', family: 'Grenze Gotisch, cursive', googleFont: 'Grenze+Gotisch:wght@400;500;600;700' },
    { name: 'Creepster', family: 'Creepster, cursive', googleFont: 'Creepster' },
    { name: 'Nosifer', family: 'Nosifer, cursive', googleFont: 'Nosifer' },
    { name: 'Eater', family: 'Eater, cursive', googleFont: 'Eater' },
    { name: 'Butcherman', family: 'Butcherman, cursive', googleFont: 'Butcherman' },
    { name: 'Rye', family: 'Rye, cursive', googleFont: 'Rye' },
  ],
  typewriter: [
    { name: 'Special Elite', family: 'Special Elite, cursive', googleFont: 'Special+Elite' },
    { name: 'Courier Prime', family: 'Courier Prime, monospace', googleFont: 'Courier+Prime:wght@400;700' },
    { name: 'Cutive Mono', family: 'Cutive Mono, monospace', googleFont: 'Cutive+Mono' },
    { name: 'Anonymous Pro', family: 'Anonymous Pro, monospace', googleFont: 'Anonymous+Pro:wght@400;700' },
    { name: 'IBM Plex Mono', family: 'IBM Plex Mono, monospace', googleFont: 'IBM+Plex+Mono:wght@400;500;600' },
  ],
  handwritten: [
    { name: 'Caveat', family: 'Caveat, cursive', googleFont: 'Caveat:wght@400;500;600;700' },
    { name: 'Kalam', family: 'Kalam, cursive', googleFont: 'Kalam:wght@400;700' },
    { name: 'Indie Flower', family: 'Indie Flower, cursive', googleFont: 'Indie+Flower' },
    { name: 'Shadows Into Light', family: 'Shadows Into Light, cursive', googleFont: 'Shadows+Into+Light' },
    { name: 'Patrick Hand', family: 'Patrick Hand, cursive', googleFont: 'Patrick+Hand' },
    { name: 'Architects Daughter', family: 'Architects Daughter, cursive', googleFont: 'Architects+Daughter' },
    { name: 'Permanent Marker', family: 'Permanent Marker, cursive', googleFont: 'Permanent+Marker' },
  ],
};

// Get all fonts as a flat list
export const getAllFonts = () => {
  const fonts: { name: string; family: string; category: FontCategory; googleFont?: string }[] = [];
  Object.entries(FONT_PRESETS).forEach(([category, categoryFonts]) => {
    categoryFonts.forEach(font => {
      fonts.push({ ...font, category: category as FontCategory });
    });
  });
  return fonts;
};

// Generate Google Fonts URL for loading
export const getGoogleFontsUrl = (fontFamilies: string[]): string => {
  const allFonts = getAllFonts();
  const googleFonts = fontFamilies
    .map(family => allFonts.find(f => f.family === family)?.googleFont)
    .filter(Boolean);
  
  if (googleFonts.length === 0) return '';
  return `https://fonts.googleapis.com/css2?family=${googleFonts.join('&family=')}&display=swap`;
};

// SVG Texture patterns
export const TEXTURE_PATTERNS: Record<TextureType, { name: string; svg: string; defaultColor: string }> = {
  none: { name: 'None', svg: '', defaultColor: 'transparent' },
  paper: {
    name: 'Paper',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <filter id="paper">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
        <feDiffuseLighting in="noise" lighting-color="COLOR" surfaceScale="2">
          <feDistantLight azimuth="45" elevation="60"/>
        </feDiffuseLighting>
      </filter>
      <rect width="100%" height="100%" filter="url(#paper)"/>
    </svg>`,
    defaultColor: '#f5f5dc'
  },
  parchment: {
    name: 'Parchment',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <filter id="parchment">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" result="noise"/>
        <feColorMatrix type="saturate" values="0.1"/>
        <feDiffuseLighting in="noise" lighting-color="COLOR" surfaceScale="3">
          <feDistantLight azimuth="135" elevation="45"/>
        </feDiffuseLighting>
      </filter>
      <rect width="100%" height="100%" filter="url(#parchment)"/>
    </svg>`,
    defaultColor: '#d4c4a8'
  },
  leather: {
    name: 'Leather',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <filter id="leather">
        <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="3" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5"/>
        <feDiffuseLighting in="noise" lighting-color="COLOR" surfaceScale="4">
          <fePointLight x="50" y="50" z="100"/>
        </feDiffuseLighting>
      </filter>
      <rect width="100%" height="100%" filter="url(#leather)"/>
    </svg>`,
    defaultColor: '#8b4513'
  },
  fabric: {
    name: 'Fabric',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
      <defs>
        <pattern id="fabric" patternUnits="userSpaceOnUse" width="20" height="20">
          <rect width="20" height="20" fill="COLOR"/>
          <path d="M0 10h20M10 0v20" stroke="DARK" stroke-width="0.5" opacity="0.3"/>
          <path d="M0 0h20v20H0z" fill="none" stroke="DARK" stroke-width="0.3" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#fabric)"/>
    </svg>`,
    defaultColor: '#4a4a4a'
  },
  stone: {
    name: 'Stone',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <filter id="stone">
        <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="4" result="noise"/>
        <feColorMatrix type="saturate" values="0"/>
        <feDiffuseLighting in="noise" lighting-color="COLOR" surfaceScale="5">
          <feDistantLight azimuth="225" elevation="30"/>
        </feDiffuseLighting>
      </filter>
      <rect width="100%" height="100%" filter="url(#stone)"/>
    </svg>`,
    defaultColor: '#808080'
  },
  wood: {
    name: 'Wood',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <filter id="wood">
        <feTurbulence type="fractalNoise" baseFrequency="0.01 0.1" numOctaves="2" result="noise"/>
        <feColorMatrix type="matrix" values="0.3 0 0 0 0.4  0.2 0 0 0 0.2  0.1 0 0 0 0.1  0 0 0 1 0"/>
        <feDiffuseLighting in="noise" lighting-color="COLOR" surfaceScale="2">
          <feDistantLight azimuth="90" elevation="60"/>
        </feDiffuseLighting>
      </filter>
      <rect width="100%" height="100%" filter="url(#wood)"/>
    </svg>`,
    defaultColor: '#8b6914'
  },
  custom: { name: 'Custom', svg: '', defaultColor: '#ffffff' }
};

// Generate texture CSS
export const getTextureCss = (type: TextureType, color: string, opacity: number = 0.5): string => {
  if (type === 'none' || type === 'custom') return '';
  
  const pattern = TEXTURE_PATTERNS[type];
  const svg = pattern.svg
    .replace(/COLOR/g, color)
    .replace(/DARK/g, adjustColor(color, -30));
  
  const encoded = encodeURIComponent(svg);
  return `url("data:image/svg+xml,${encoded}")`;
};

// Helper to adjust color brightness
const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Ornament SVGs for book decorations
export const ORNAMENTS = {
  none: '',
  simple: `<svg viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="10" x2="40" y2="10" stroke="currentColor" stroke-width="1"/>
    <circle cx="50" cy="10" r="4" fill="currentColor"/>
    <line x1="60" y1="10" x2="100" y2="10" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  elegant: `<svg viewBox="0 0 200 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,15 Q25,5 50,15 T100,15 T150,15 T200,15" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="100" cy="15" r="5" fill="currentColor"/>
    <path d="M85,15 Q100,0 115,15" fill="none" stroke="currentColor" stroke-width="1"/>
    <path d="M85,15 Q100,30 115,15" fill="none" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  medieval: `<svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,20 L30,20 L40,10 L50,20 L60,10 L70,20 L100,20" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M100,20 L130,20 L140,30 L150,20 L160,30 L170,20 L200,20" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M90,10 L100,20 L110,10 M90,30 L100,20 L110,30" fill="none" stroke="currentColor" stroke-width="2"/>
  </svg>`,
  'art-nouveau': `<svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,25 C20,25 30,10 50,10 S80,25 100,25 S130,40 150,40 S180,25 200,25" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M0,25 C20,25 30,40 50,40 S80,25 100,25 S130,10 150,10 S180,25 200,25" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="100" cy="25" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="100" cy="25" r="3" fill="currentColor"/>
  </svg>`
};

// Layout configurations
export const LAYOUT_CONFIGS: Record<LayoutMode, { name: string; description: string }> = {
  standard: {
    name: 'Standard',
    description: 'Classic single-column layout with centered content'
  },
  book: {
    name: 'Open Book',
    description: 'Two-page spread with image on left, text on right'
  },
  scroll: {
    name: 'Scroll',
    description: 'Vertical scroll with decorative edges'
  },
  manuscript: {
    name: 'Manuscript',
    description: 'Illuminated manuscript style with ornate borders'
  },
  'visual-novel': {
    name: 'Visual Novel',
    description: 'Full-screen backgrounds with character sprites and dialogue box'
  }
};

// Category display names
export const FONT_CATEGORY_NAMES: Record<FontCategory, string> = {
  modern: 'Modern Sans-Serif',
  serif: 'Classic Serif',
  calligraphic: 'Calligraphic',
  medieval: 'Medieval & Gothic',
  fantasy: 'Fantasy & Horror',
  typewriter: 'Typewriter',
  handwritten: 'Handwritten'
};
