'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clientAuthApi, clientInMemoryAuth, clientPortalApi } from '@/lib/api/client-api';
import { clientSessionStore, type ClientProfile } from '@/lib/api/client-session';
import { disconnectClientMessagesSocket } from '@/lib/realtime/client-messages-socket';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>(EMPTY_AUTH);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      // Optimistically show stored profile while the server verifies the cookie.
      const stored = clientSessionStore.get();
      if (stored && isMounted) setAuth(toAuthState(stored.client));

      try {
        const profile = await clientAuthApi.me();
        if (!isMounted) return;

        clientSessionStore.set({ client: profile });
        setAuth(toAuthState(profile));
      } catch {
        if (!isMounted) return;

        clientSessionStore.clear();
        clientInMemoryAuth.clear();
        disconnectClientMessagesSocket();
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

    clientSessionStore.set({ client: data.client });
    clientInMemoryAuth.set(data.accessToken);
    setAuth(toAuthState(data.client));

    return { mustChangePassword: Boolean(data.client.mustChangePassword) };
  };

  const logout = async () => {
    try {
      await clientAuthApi.logout();
    } catch {
      // Best effort logout — local state is cleared regardless.
    } finally {
      clientSessionStore.clear();
      clientInMemoryAuth.clear();
      disconnectClientMessagesSocket();
      setAuth(EMPTY_AUTH);
    }
  };

  const refreshProfile = async () => {
    const profile = await clientAuthApi.me();
    clientSessionStore.set({ client: profile });
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
        client: {
          ...existingSession.client,
          mustChangePassword: false,
        },
      });
    }

    // Re-login with the new password to rotate cookies while keeping the session alive.
    if (auth.userEmail) {
      try {
        const relogin = await clientAuthApi.login({
          email: auth.userEmail,
          password: input.newPassword,
        });

        clientSessionStore.set({
          client: {
            ...relogin.client,
            mustChangePassword: false,
          },
        });
        clientInMemoryAuth.set(relogin.accessToken);
      } catch {
        // If re-login fails, cookies from the change-password call remain valid.
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
