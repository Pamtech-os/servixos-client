'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface AuthState {
  isLoggedIn: boolean;
  userEmail: string;
}

interface AuthContextType {
  auth: AuthState;
  isHydrated: boolean;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false, userEmail: '' });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('servixos-auth-state');
    if (!raw) {
      setIsHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthState>;
      setAuth({
        isLoggedIn: Boolean(parsed.isLoggedIn),
        userEmail: parsed.userEmail ?? '',
      });
    } catch {
      setAuth({ isLoggedIn: false, userEmail: '' });
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const login = (email: string) => {
    const next = { isLoggedIn: true, userEmail: email };
    localStorage.setItem('servixos-auth-state', JSON.stringify(next));
    setAuth(next);
  };

  const logout = () => {
    const next = { isLoggedIn: false, userEmail: '' };
    localStorage.setItem('servixos-auth-state', JSON.stringify(next));
    setAuth(next);
  };

  const value = useMemo(() => ({ auth, isHydrated, login, logout }), [auth, isHydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
