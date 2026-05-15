'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clientAuthApi, clientPortalApi } from '@/lib/api/client-api';
import {
  clientSessionStore,
  type ClientProfile,
  type ClientSession,
} from '@/lib/api/client-session';

interface AuthState {
  isLoggedIn: boolean;
  userEmail: string;
  userName: string;
  businessId: string;
  clientId: string;
  mustChangePassword: boolean;
}

interface AuthContextType {
  auth: AuthState;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
}

const EMPTY_AUTH: AuthState = {
  isLoggedIn: false,
  userEmail: '',
  userName: '',
  businessId: '',
  clientId: '',
  mustChangePassword: false,
};

const AuthContext = createContext<AuthContextType | null>(null);

const toAuthState = (client: ClientProfile): AuthState => ({
  isLoggedIn: true,
  userEmail: client.email,
  userName: client.name,
  businessId: client.businessId,
  clientId: client._id,
  mustChangePassword: Boolean(client.mustChangePassword),
});

const withClientProfile = (session: ClientSession, client: ClientProfile): ClientSession => ({
  ...session,
  client,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>(EMPTY_AUTH);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const session = clientSessionStore.get();
      if (!session) {
        if (isMounted) {
          setAuth(EMPTY_AUTH);
          setIsHydrated(true);
        }
        return;
      }

      if (isMounted) setAuth(toAuthState(session.client));

      try {
        const profile = await clientAuthApi.me();
        if (!isMounted) return;

        clientSessionStore.set(withClientProfile(session, profile));
        setAuth(toAuthState(profile));
      } catch {
        if (!isMounted) return;

        clientSessionStore.clear();
        setAuth(EMPTY_AUTH);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await clientAuthApi.login({ email, password });

    const session: ClientSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      client: data.client,
    };

    clientSessionStore.set(session);
    setAuth(toAuthState(data.client));
    return { mustChangePassword: Boolean(data.client.mustChangePassword) };
  };

  const logout = async () => {
    const session = clientSessionStore.get();

    try {
      if (session?.refreshToken) {
        await clientAuthApi.logout(session.refreshToken);
      }
    } catch {
      // Best effort logout - local session should still be cleared.
    } finally {
      clientSessionStore.clear();
      setAuth(EMPTY_AUTH);
    }
  };

  const refreshProfile = async () => {
    const session = clientSessionStore.get();
    if (!session) {
      setAuth(EMPTY_AUTH);
      return;
    }

    const profile = await clientAuthApi.me();
    clientSessionStore.set(withClientProfile(session, profile));
    setAuth(toAuthState(profile));
  };

  const changePassword = async (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    await clientPortalApi.changePassword(input);

    const existingSession = clientSessionStore.get();
    if (existingSession) {
      clientSessionStore.set({
        ...existingSession,
        client: {
          ...existingSession.client,
          mustChangePassword: false,
        },
      });
    }

    if (auth.userEmail) {
      try {
        const relogin = await clientAuthApi.login({
          email: auth.userEmail,
          password: input.newPassword,
        });

        clientSessionStore.set({
          accessToken: relogin.accessToken,
          refreshToken: relogin.refreshToken,
          client: {
            ...relogin.client,
            mustChangePassword: false,
          },
        });
      } catch {
        // If re-login fails, keep current access token and continue this session.
      }
    }

    setAuth((previous) => ({
      ...previous,
      mustChangePassword: false,
    }));
  };

  const value = { auth, isHydrated, login, logout, refreshProfile, changePassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
