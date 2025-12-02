import { SavedStory, User } from "../types";

const DB_NAME = 'twaine_db';
const DB_VERSION = 1;

// Store names
const USERS_STORE = 'users';
const STORIES_STORE = 'stories';
const SESSIONS_STORE = 'sessions';

let db: IDBDatabase | null = null;

// Initialize the database
export const initDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Users store
      if (!database.objectStoreNames.contains(USERS_STORE)) {
        const usersStore = database.createObjectStore(USERS_STORE, { keyPath: 'id' });
        usersStore.createIndex('email', 'email', { unique: true });
      }

      // Stories store
      if (!database.objectStoreNames.contains(STORIES_STORE)) {
        const storiesStore = database.createObjectStore(STORIES_STORE, { keyPath: 'id' });
        storiesStore.createIndex('userId', 'userId', { unique: false });
      }

      // Sessions store (for persistent login)
      if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
        database.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
      }
    };
  });
};

// Helper to get a transaction
const getStore = async (storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> => {
  const database = await initDatabase();
  const transaction = database.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

// ============ USER OPERATIONS ============

interface StoredUser extends User {
  passwordHash: string;
}

// Simple hash function (for demo - in production use bcrypt on backend)
const hashPassword = async (password: string): Promise<string> => {
  // crypto.subtle is only available on HTTPS or localhost
  if (crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for HTTP (insecure - only for development/demo)
    // Simple hash using string manipulation
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + 
           password.length.toString(16).padStart(4, '0') +
           password.split('').reduce((a, c) => a + c.charCodeAt(0), 0).toString(16).padStart(8, '0');
  }
};

export const registerUser = async (email: string, password: string): Promise<User> => {
  const store = await getStore(USERS_STORE, 'readwrite');
  
  // Check if email already exists
  return new Promise((resolve, reject) => {
    const emailIndex = store.index('email');
    const checkRequest = emailIndex.get(email.toLowerCase());
    
    checkRequest.onsuccess = async () => {
      if (checkRequest.result) {
        reject(new Error('Email already registered'));
        return;
      }

      const passwordHash = await hashPassword(password);
      const newUser: StoredUser = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        passwordHash,
        createdAt: Date.now()
      };

      const addStore = await getStore(USERS_STORE, 'readwrite');
      const addRequest = addStore.add(newUser);

      addRequest.onsuccess = () => {
        const { passwordHash: _, ...user } = newUser;
        resolve(user);
      };

      addRequest.onerror = () => {
        reject(new Error('Failed to create user'));
      };
    };

    checkRequest.onerror = () => {
      reject(new Error('Failed to check email'));
    };
  });
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  const store = await getStore(USERS_STORE);
  
  return new Promise(async (resolve, reject) => {
    const emailIndex = store.index('email');
    const request = emailIndex.get(email.toLowerCase());

    request.onsuccess = async () => {
      const storedUser: StoredUser | undefined = request.result;
      
      if (!storedUser) {
        reject(new Error('Invalid email or password'));
        return;
      }

      const passwordHash = await hashPassword(password);
      if (storedUser.passwordHash !== passwordHash) {
        reject(new Error('Invalid email or password'));
        return;
      }

      const { passwordHash: _, ...user } = storedUser;
      resolve(user);
    };

    request.onerror = () => {
      reject(new Error('Login failed'));
    };
  });
};

// ============ SESSION OPERATIONS ============

interface Session {
  id: string;
  userId: string;
  createdAt: number;
}

export const createSession = async (userId: string): Promise<void> => {
  const store = await getStore(SESSIONS_STORE, 'readwrite');
  
  return new Promise((resolve, reject) => {
    // Clear existing sessions first
    const clearRequest = store.clear();
    
    clearRequest.onsuccess = async () => {
      const sessionStore = await getStore(SESSIONS_STORE, 'readwrite');
      const session: Session = {
        id: 'current_session',
        userId,
        createdAt: Date.now()
      };
      
      const addRequest = sessionStore.add(session);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(new Error('Failed to create session'));
    };
    
    clearRequest.onerror = () => reject(new Error('Failed to clear sessions'));
  });
};

export const getCurrentSession = async (): Promise<User | null> => {
  try {
    const sessionStore = await getStore(SESSIONS_STORE);
    
    return new Promise((resolve) => {
      const request = sessionStore.get('current_session');
      
      request.onsuccess = async () => {
        const session: Session | undefined = request.result;
        
        if (!session) {
          resolve(null);
          return;
        }

        // Get the user
        const userStore = await getStore(USERS_STORE);
        const userRequest = userStore.get(session.userId);
        
        userRequest.onsuccess = () => {
          const storedUser: StoredUser | undefined = userRequest.result;
          if (storedUser) {
            const { passwordHash: _, ...user } = storedUser;
            resolve(user);
          } else {
            resolve(null);
          }
        };
        
        userRequest.onerror = () => resolve(null);
      };
      
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  const store = await getStore(SESSIONS_STORE, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear session'));
  });
};

// ============ STORY OPERATIONS ============

export const saveStory = async (story: SavedStory): Promise<void> => {
  const store = await getStore(STORIES_STORE, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const storyWithUpdate = { ...story, updatedAt: Date.now() };
    const request = store.put(storyWithUpdate);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save story'));
  });
};

export const loadUserStories = async (userId: string): Promise<SavedStory[]> => {
  const store = await getStore(STORIES_STORE);
  
  return new Promise((resolve, reject) => {
    const index = store.index('userId');
    const request = index.getAll(userId);
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => reject(new Error('Failed to load stories'));
  });
};

export const deleteStory = async (storyId: string): Promise<void> => {
  const store = await getStore(STORIES_STORE, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(storyId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete story'));
  });
};

export const getStory = async (storyId: string): Promise<SavedStory | null> => {
  const store = await getStore(STORIES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.get(storyId);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Failed to get story'));
  });
};

// Helper to generate unique story names
export const getNewStoryName = (existingNames: string[]): string => {
  let counter = 1;
  let newName = `My Story ${counter}`;
  while (existingNames.includes(newName)) {
    counter++;
    newName = `My Story ${counter}`;
  }
  return newName;
};
