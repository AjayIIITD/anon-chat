import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPreferences } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';
import { disconnectSocket } from '../services/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<User>;
  signup: (payload: { email: string; password: string; dob?: string; preferences: UserPreferences; chosen_username?: string }) => Promise<void>;
  logout: () => void;
  isLogoutModalOpen: boolean;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  regenerateUsername: () => Promise<string>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);

  const clearError = () => setError(null);
  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  // Initialize and verify authentication on app load
  useEffect(() => {
    async function initAuth() {
      const stored = getStoredToken();
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        setUser(res.user);
        setToken(stored);
      } catch (err: any) {
        console.warn('Session verification failed, logging out:', err.message);
        removeStoredToken();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email, password: pass });
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload: { email: string; password: string; dob?: string; preferences: UserPreferences; chosen_username?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.signup(payload);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeStoredToken();
    disconnectSocket();
    setUser(null);
    setToken(null);
    setError(null);
    setIsLogoutModalOpen(false);
  };

  const regenerateUsername = async (): Promise<string> => {
    try {
      const res = await api.regenerateUsername();
      if (user) {
        setUser({ ...user, anonymous_username: res.anonymous_username });
      }
      return res.anonymous_username;
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate username.');
      throw err;
    }
  };

  const updatePreferences = async (preferences: UserPreferences) => {
    try {
      const res = await api.updatePreferences(preferences);
      if (user) {
        setUser({ ...user, preferences: res.preferences });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences.');
      throw err;
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        signup,
        logout,
        isLogoutModalOpen,
        openLogoutModal,
        closeLogoutModal,
        regenerateUsername,
        updatePreferences,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
