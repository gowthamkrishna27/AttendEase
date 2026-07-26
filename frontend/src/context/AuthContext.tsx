import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { AuthUser, UpdateProfilePayload } from '../lib/api';
import { getStoredToken, setStoredToken, clearStoredToken } from '../lib/api';
import { saveRememberedAccount } from '../lib/nativeAuth';

export type UserRole = 'student' | 'faculty' | 'hod' | 'admin';
export type { AuthUser };

interface AuthContextValue {
  user: AuthUser | null;
  login: (identifier: string, password: string, role: UserRole, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfilePayload) => Promise<AuthUser>;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Rehydrate user from stored token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      api.getMe()
        .then(u => {
          setUser(u);
          saveRememberedAccount(u);
        })
        .catch(() => clearStoredToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier: string, password: string, role: UserRole, rememberMe: boolean = true) => {
    queryClient.clear();
    const { token, user: u } = await api.login(identifier, password, role);
    setStoredToken(token, rememberMe);
    setUser(u);
    saveRememberedAccount(u);
  };

  const updateProfile = async (data: UpdateProfilePayload): Promise<AuthUser> => {
    const updated = await api.updateMe(data);
    setUser(updated);
    saveRememberedAccount(updated);
    return updated;
  };

  const logout = () => {
    queryClient.clear();
    clearStoredToken();
    setUser(null);
    api.logout().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, setUser, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
