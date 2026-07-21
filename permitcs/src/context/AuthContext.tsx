import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'student' | 'faculty' | 'hod';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  rollNumber?: string;
  semester?: number;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = (u: AuthUser) => setUser(u);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// Mock credentials
export const MOCK_CREDENTIALS = {
  student: {
    id: 'stu-001',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@college.edu',
    role: 'student' as UserRole,
    department: 'Computer Science',
    rollNumber: '24B91A0720',
    semester: 6,
    password: 'student123',
    avatarUrl: 'https://srkrexams.in/SRKR/photo/24B91A0720.jpg',
  },
  faculty: {
    id: 'fac-001',
    name: 'Dr. Priya Nair',
    email: 'priya.nair@college.edu',
    role: 'faculty' as UserRole,
    department: 'Computer Science',
    password: 'faculty123',
  },
  hod: {
    id: 'hod-001',
    name: 'Prof. Suresh Menon',
    email: 'hod.cs@college.edu',
    role: 'hod' as UserRole,
    department: 'Computer Science',
    password: 'hod123',
  },
};
