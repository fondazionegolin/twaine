import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authAPI, checkServerHealth } from '../services/apiService';
import * as DatabaseService from '../services/databaseService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean; // Whether backend is available
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  // Check server health and existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if backend API URL is configured
        const apiUrl = import.meta.env.VITE_API_URL;
        let serverOnline = false;
        
        // Only check server health if API URL is explicitly configured
        if (apiUrl) {
          serverOnline = await checkServerHealth();
        }
        setIsOnline(serverOnline);

        if (serverOnline) {
          // Try to get user from backend using session cookie
          try {
            const { user: apiUser } = await authAPI.getCurrentUser();
            setUser({
              id: apiUser.id,
              email: apiUser.email,
              displayName: apiUser.displayName,
            });
          } catch {
            // Session expired or invalid - user will need to login
            console.log('No active session');
          }
        } else {
          // Fallback to local IndexedDB
          console.log('Backend not available, using local storage');
          const sessionUser = await DatabaseService.getCurrentSession();
          setUser(sessionUser);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth expiration events
    const handleAuthExpired = () => {
      setUser(null);
      setError('Session expired. Please log in again.');
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Use backend API
        const response = await authAPI.login(email, password);
        setUser({
          id: response.user.id,
          email: response.user.email,
          displayName: response.user.displayName,
        });
      } else {
        // Fallback to local IndexedDB
        const loggedInUser = await DatabaseService.loginUser(email, password);
        await DatabaseService.createSession(loggedInUser.id);
        setUser(loggedInUser);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Use backend API
        const response = await authAPI.register(email, password);
        setUser({
          id: response.user.id,
          email: response.user.email,
          displayName: response.user.displayName,
        });
      } else {
        // Fallback to local IndexedDB
        const newUser = await DatabaseService.registerUser(email, password);
        await DatabaseService.createSession(newUser.id);
        setUser(newUser);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        authAPI.logout();
      } else {
        await DatabaseService.clearSession();
      }
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, isOnline, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
