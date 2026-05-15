export interface ClientProfile {
  _id: string;
  id?: string;
  clientId?: string;
  name: string;
  email: string;
  phone?: string;
  businessId: string;
  timezone?: string;
  mustChangePassword?: boolean;
}

export interface ClientSession {
  accessToken: string;
  refreshToken: string;
  client: ClientProfile;
}

const STORAGE_KEY = 'servixos-client-session';

let memorySession: ClientSession | null = null;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isClientProfile = (value: unknown): value is ClientProfile => {
  if (!isObject(value)) return false;

  return (
    isNonEmptyString(value._id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.email) &&
    isNonEmptyString(value.businessId)
  );
};

const isClientSession = (value: unknown): value is ClientSession => {
  if (!isObject(value)) return false;

  return (
    isNonEmptyString(value.accessToken) &&
    isNonEmptyString(value.refreshToken) &&
    isClientProfile(value.client)
  );
};

const readFromStorage = (): ClientSession | null => {
  if (typeof window === 'undefined') return memorySession;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isClientSession(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeToStorage = (session: ClientSession | null) => {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const clientSessionStore = {
  get(): ClientSession | null {
    if (memorySession) return memorySession;

    const stored = readFromStorage();
    memorySession = stored;
    return stored;
  },

  set(session: ClientSession): void {
    memorySession = session;
    writeToStorage(session);
  },

  clear(): void {
    memorySession = null;
    writeToStorage(null);
  },

  updateTokens(tokens: Pick<ClientSession, 'accessToken' | 'refreshToken'>): ClientSession | null {
    const current = this.get();
    if (!current) return null;

    const next: ClientSession = {
      ...current,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    this.set(next);
    return next;
  },
};
