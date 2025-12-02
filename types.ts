export interface StoryConnection {
  id: string;
  targetNodeId: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Visual Novel sprite definition
export interface VNSprite {
  id: string;
  name: string; // Character name
  imageUri: string; // Base64 or URL
  position: 'left' | 'center' | 'right'; // Position on screen
  expression?: string; // Optional expression label
  scale?: number; // Scale factor (default 1)
  offsetY?: number; // Vertical offset in pixels
}

// Visual Novel audio definition
export interface VNAudio {
  type: 'bgm' | 'sfx'; // Background music or sound effect
  uri: string; // Audio file URI or base64
  name?: string; // Display name
  loop?: boolean; // Loop audio (default true for bgm, false for sfx)
  volume?: number; // Volume 0-1 (default 1)
}

export interface StoryNode {
  id: string;
  title: string;
  content: string;
  mediaPrompt?: string; // Prompt for image or video generation
  mediaUri?: string; // Base64 for image, or video URI
  mediaType?: 'image' | 'video'; // 'image' by default
  imageModel?: 'sd-turbo' | 'flux-schnell' | 'flux-dev' | 'flux-krea-dev' | 'sdxl'; // Image generation model
  imageWidth?: number; // Image width (default 512)
  imageHeight?: number; // Image height (default 512)
  imageSteps?: number; // Number of generation steps (default varies by model)
  uploadedImage?: boolean; // Flag to indicate if image was uploaded (not generated)
  imageSceneDescription?: string; // English description of the scene for image generation
  characterId?: string; // Reference to a character for consistent img2img generation
  interactionDescription?: string;
  interactionCode?: string; // JS Body
  codeChatHistory?: ChatMessage[]; // Chat history for iterative code editing
  connections: StoryConnection[];
  position: { x: number; y: number };
  // Visual Novel specific fields
  vnBackground?: string; // Full-screen background image URI
  vnSprites?: VNSprite[]; // Character sprites to display
  vnAudio?: VNAudio[]; // Audio tracks (BGM and SFX)
  vnSpeaker?: string; // Name of the speaking character (shown in dialogue box)
  vnTextEffect?: 'none' | 'typewriter' | 'fade'; // Text animation effect
}

export type ViewMode = 'LANDING' | 'EDITOR' | 'PLAYER';

export interface GenerationState {
  isGenerating: boolean;
  type?: 'TEXT' | 'MEDIA' | 'CODE' | 'SKELETON';
  mediaType?: 'image' | 'video'; // Added to distinguish media generation type
}

export interface WorldSettings {
  useInventory: boolean;
  useEconomy: boolean;
  useCombat: boolean;
}

// Font categories for style generation
export type FontCategory = 'modern' | 'serif' | 'calligraphic' | 'medieval' | 'fantasy' | 'typewriter' | 'handwritten';

// Layout modes for story display
export type LayoutMode = 'standard' | 'book' | 'scroll' | 'manuscript' | 'visual-novel';

// Texture/pattern types
export type TextureType = 'none' | 'paper' | 'parchment' | 'leather' | 'fabric' | 'stone' | 'wood' | 'custom';

export interface StoryStyle {
  background: string; // CSS background value (color or gradient)
  textColor: string;
  accentColor: string;
  fontFamily: string;
  animationClass: 'fade-in' | 'slide-up' | 'zoom-in' | 'blur-in';
  customCss?: string; // Optional raw CSS for advanced effects
  // Advanced typography
  titleFontSize?: string;
  textFontSize?: string;
  titleFontWeight?: string;
  textFontWeight?: string;
  textDecoration?: string;
  secondaryTextColor?: string;
  linkColor?: string;
  // New: Font category
  fontCategory?: FontCategory;
  titleFontFamily?: string;
  // New: Layout mode
  layoutMode?: LayoutMode;
  // New: Texture/Pattern
  textureType?: TextureType;
  textureOpacity?: number;
  textureColor?: string;
  customTextureSvg?: string; // SVG pattern for custom textures
  // New: Book-specific styling
  pageColor?: string;
  pageShadow?: boolean;
  pageEdgeColor?: string;
  ornamentStyle?: 'none' | 'simple' | 'elegant' | 'medieval' | 'art-nouveau';
  // New: Decorative elements
  borderStyle?: 'none' | 'simple' | 'ornate' | 'medieval' | 'modern';
  cornerOrnaments?: boolean;
  headerDecoration?: 'none' | 'simple' | 'flourish' | 'geometric';
  dividerStyle?: 'none' | 'line' | 'dots' | 'ornamental';
  // Visual Novel image generation settings
  vnBackgroundModel?: 'flux-schnell' | 'flux-dev' | 'flux-krea-dev' | 'sdxl';
  vnBackgroundWidth?: number;
  vnBackgroundHeight?: number;
  vnCharacterModel?: 'flux-schnell' | 'flux-dev' | 'flux-krea-dev' | 'sdxl';
  vnCharacterWidth?: number;
  vnCharacterHeight?: number;
  // Global image generation settings
  imageQuality?: 'low' | 'medium' | 'high' | 'ultra';
  imageStyle?: 'photo' | 'illustration' | 'manga' | 'comic' | 'anime' | 'watercolor' | 'oil-painting' | 'pixel-art';
}

export interface StoryVersion {
  id: string;
  timestamp: number;
  action: string; // Human-readable description of what changed
  nodes: StoryNode[];
  masterPrompt: string;
}

// Character reference for consistent character generation across nodes
export interface CharacterReference {
  id: string;
  name: string;
  description: string; // Text description of the character
  referenceImage: string; // Base64 or URL of reference image
  model: 'sd-turbo' | 'flux-schnell' | 'flux-dev' | 'flux-krea-dev' | 'sdxl'; // Model used for this character
  strength?: number; // img2img strength (0.3-0.8, default 0.5)
}

export interface SavedStory {
  id: string;
  userId: string; // Owner of the story
  name: string;
  masterPrompt: string;
  nodes: StoryNode[];
  worldSettings: WorldSettings;
  style?: StoryStyle; // Optional style for the story
  characters?: CharacterReference[]; // Character references for consistent generation
  createdAt: number;
  updatedAt?: number;
  versions?: StoryVersion[]; // Version history
  lastAutoSave?: number; // Timestamp of last auto-save
}

// Authentication types
export interface User {
  id: string;
  email: string;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}