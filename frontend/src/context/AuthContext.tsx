import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { AuthUser, UpdateProfilePayload } from '../lib/api';
import { getStoredToken, setStoredToken, clearStoredToken, getSavedUser, setSavedUser } from '../lib/api';

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
  // Synchronously initialize user from stored state if present
  const [user, setUserState] = useState<AuthUser | null>(() => {
    const token = getStoredToken();
    if (!token) return null;
    return getSavedUser<AuthUser>();
  });

  const [isLoading, setLoading] = useState(() => {
    const token = getStoredToken();
    const saved = getSavedUser<AuthUser>();
    return token ? !saved : false;
  });

  const queryClient = useQueryClient();

  const setUser = (u: AuthUser | null) => {
    setUserState(u);
    setSavedUser(u);
  };

  // Revalidate user profile in background
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      api.getMe()
        .then(u => {
          setUserState(u);
          setSavedUser(u);
        })
        .catch((err: any) => {
          // Only clear if token is definitively rejected as invalid/expired (401)
          const msg = String(err?.message || '').toLowerCase();
          if (msg.includes('401') || msg.includes('invalid') || msg.includes('expired') || msg.includes('no token')) {
            clearStoredToken();
            setSavedUser(null);
            setUserState(null);
          }
          // On any network error (mobile offline, slow connection, timeout) still resolve loading
          // so ShareRedirectPage doesn't spin forever
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);


  const login = async (identifier: string, password: string, role: UserRole, rememberMe: boolean = true) => {
    queryClient.clear();
    const { token, user: u } = await api.login(identifier, password, role);
    setStoredToken(token, rememberMe);
    setSavedUser(u);
    setUserState(u);
  };

  const updateProfile = async (data: UpdateProfilePayload): Promise<AuthUser> => {
    const updated = await api.updateMe(data);
    setUserState(updated);
    setSavedUser(updated);
    return updated;
  };

  const logout = () => {
    queryClient.clear();
    clearStoredToken();
    setSavedUser(null);
    setUserState(null);
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
