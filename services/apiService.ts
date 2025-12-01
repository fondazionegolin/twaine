/**
 * API Service for communicating with the backend server
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic fetch wrapper with auth (cookies)
const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Important: Send cookies with request
  });

  // Handle session expiration
  if (response.status === 401) {
    // Only dispatch if we're not already on the login page or trying to login/register
    if (!window.location.pathname.includes('/login') &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register')) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }

  return data;
};

// ============ Auth API ============

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
}

export const authAPI = {
  register: async (email: string, password: string, displayName?: string): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout failed', e);
    }
  },

  getCurrentUser: async (): Promise<{ user: AuthUser }> => {
    return apiFetch<{ user: AuthUser }>('/auth/me');
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// ============ Stories API ============

export interface StoryNode {
  id: string;
  title: string;
  content: string;
  mediaUri?: string;
  mediaType: 'image' | 'video';
  position: { x: number; y: number };
  connections: Array<{
    id: string;
    targetNodeId: string;
    label: string;
  }>;
  interactionCode?: string;
}

export interface WorldSettings {
  useInventory: boolean;
  useEconomy: boolean;
  useCombat: boolean;
}

export interface StoryStyle {
  background: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  titleFontFamily?: string;
  fontCategory?: string;
  animationClass?: string;
  layoutMode?: string;
  textureType?: string;
  textureColor?: string;
  textureOpacity?: number;
  pageColor?: string;
  pageEdgeColor?: string;
  pageShadow?: boolean;
  ornamentStyle?: string;
  titleFontSize?: string;
  textFontSize?: string;
  customCss?: string;
}

export interface StoryVersion {
  id: string;
  timestamp: Date;
  nodes: StoryNode[];
  description?: string;
}

export interface Story {
  id: string;
  name: string;
  prompt: string;
  nodes: StoryNode[];
  worldSettings: WorldSettings;
  style?: StoryStyle;
  versions: StoryVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryListItem {
  id: string;
  name: string;
  prompt: string;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export const storiesAPI = {
  getAll: async (): Promise<StoryListItem[]> => {
    const response = await apiFetch<{ stories: StoryListItem[] }>('/stories');
    return response.stories;
  },

  getById: async (id: string): Promise<Story> => {
    const response = await apiFetch<{ story: Story }>(`/stories/${id}`);
    return response.story;
  },

  create: async (story: {
    name: string;
    prompt?: string;
    nodes?: StoryNode[];
    worldSettings?: WorldSettings;
    style?: StoryStyle;
  }): Promise<Story> => {
    const response = await apiFetch<{ story: Story }>('/stories', {
      method: 'POST',
      body: JSON.stringify(story),
    });
    return response.story;
  },

  update: async (id: string, updates: Partial<{
    name: string;
    prompt: string;
    nodes: StoryNode[];
    worldSettings: WorldSettings;
    style: StoryStyle;
    versions: StoryVersion[];
  }>): Promise<Story> => {
    const response = await apiFetch<{ story: Story }>(`/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.story;
  },

  delete: async (id: string): Promise<void> => {
    await apiFetch<{ message: string }>(`/stories/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ Health Check ============

export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/health`);
    return response.ok;
  } catch {
    return false;
  }
};
