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

export interface StoryNode {
  id: string;
  title: string;
  content: string;
  mediaPrompt?: string; // Prompt for image or video generation
  mediaUri?: string; // Base64 for image, or video URI
  mediaType?: 'image' | 'video'; // 'image' by default
  interactionDescription?: string;
  interactionCode?: string; // JS Body
  codeChatHistory?: ChatMessage[]; // Chat history for iterative code editing
  connections: StoryConnection[];
  position: { x: number; y: number };
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
export type LayoutMode = 'standard' | 'book' | 'scroll' | 'manuscript';

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
}

export interface StoryVersion {
  id: string;
  timestamp: number;
  action: string; // Human-readable description of what changed
  nodes: StoryNode[];
  masterPrompt: string;
}

export interface SavedStory {
  id: string;
  userId: string; // Owner of the story
  name: string;
  masterPrompt: string;
  nodes: StoryNode[];
  worldSettings: WorldSettings;
  style?: StoryStyle; // Optional style for the story
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