// ============================================================
// Sahakari Mobile - Authentication Context
// Manages user session state across the app
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from './api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string;
  branchId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved user data on mount
  useEffect(() => {
    loadSavedUser();
  }, []);

  const loadSavedUser = async () => {
    try {
      const userData = await SecureStore.getItemAsync('user_data');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (e) {
      console.error('Error loading saved user:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Use NextAuth credentials provider
      const result = await api.login(email, password);

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Fetch user session data
      const sessionResult = await api.get('/api/auth/session');
      if (sessionResult.data?.user) {
        const userData: User = {
          id: sessionResult.data.user.id || '',
          name: sessionResult.data.user.name || email,
          email: sessionResult.data.user.email || email,
          role: sessionResult.data.user.role || 'STAFF',
          organizationId: sessionResult.data.user.organizationId,
          branchId: sessionResult.data.user.branchId,
        };
        setUser(userData);
        await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
        return { success: true };
      }

      // Fallback: save basic user info
      const fallbackUser: User = {
        id: '1',
        name: email.split('@')[0],
        email,
        role: 'STAFF',
      };
      setUser(fallbackUser);
      await SecureStore.setItemAsync('user_data', JSON.stringify(fallbackUser));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign in failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const sessionResult = await api.get('/api/auth/session');
      if (sessionResult.data?.user) {
        const userData: User = {
          id: sessionResult.data.user.id || '',
          name: sessionResult.data.user.name || '',
          email: sessionResult.data.user.email || '',
          role: sessionResult.data.user.role || 'STAFF',
          organizationId: sessionResult.data.user.organizationId,
          branchId: sessionResult.data.user.branchId,
        };
        setUser(userData);
        await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
      }
    } catch (e) {
      console.error('Error refreshing user:', e);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
