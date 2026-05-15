import { clientSessionStore, type ClientProfile, type ClientSession } from '@/lib/api/client-session';

interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: ApiMeta;
}

interface ClientTokenData {
  token: string;
  expiresAt?: number;
}

interface JwtPayload {
  exp?: number;
}

const DEFAULT_API_BASE_URL = 'https://api-dev.servixos.com/api';
const CLIENT_TOKEN_PATH = '/auth/client-token';
const CLIENT_TOKEN_EXPIRY_BUFFER_MS = 5_000;
const ACCESS_TOKEN_EXPIRY_BUFFER_SEC = 30;

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const normalizeApiBaseUrl = (value: string | undefined): string => {
  if (!value) return DEFAULT_API_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '');
};

const API_BASE_URL = normalizeApiBaseUrl(rawApiBaseUrl);

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> => {
  return (
    isObject(value) &&
    typeof value.success === 'boolean' &&
    typeof value.statusCode === 'number' &&
    typeof value.message === 'string' &&
    'data' in value
  );
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

const getTokenExpiryMs = (token: string): number | null => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp || typeof payload.exp !== 'number') return null;
  return payload.exp * 1000;
};

const isAccessTokenExpired = (token: string): boolean => {
  const expiryMs = getTokenExpiryMs(token);
  if (!expiryMs) return true;

  return Date.now() >= expiryMs - ACCESS_TOKEN_EXPIRY_BUFFER_SEC * 1000;
};

const pathWithQuery = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    const parsed = new URL(path);
    return `${parsed.pathname}${parsed.search}`;
  }

  return path.startsWith('/') ? path : `/${path}`;
};

const buildCanonicalBody = (body: unknown): string => {
  if (body == null) return '';

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return '';

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isObject(parsed) && Object.keys(parsed).length === 0) return '';
      return JSON.stringify(parsed);
    } catch {
      return trimmed;
    }
  }

  if (isObject(body) && Object.keys(body).length === 0) return '';
  return JSON.stringify(body);
};

const buildCanonicalString = (
  method: string,
  path: string,
  timestamp: string,
  body: string
): string => [method.toUpperCase(), path, timestamp, body].join('\n');

const hmacSha256Hex = async (payload: string, secret: string): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable for request signing.');
  }

  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payload));

  return Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

let cachedClientToken: ClientTokenData | null = null;
let clientTokenPromise: Promise<ClientTokenData> | null = null;
let sessionRefreshPromise: Promise<ClientSession> | null = null;

const isClientTokenValid = (tokenData: ClientTokenData | null): tokenData is ClientTokenData => {
  if (!tokenData) return false;

  const expiryMs =
    tokenData.expiresAt ??
    (tokenData.token ? getTokenExpiryMs(tokenData.token) : null) ??
    Date.now() + 60_000;

  return Date.now() < expiryMs - CLIENT_TOKEN_EXPIRY_BUFFER_MS;
};

const fetchJson = async (url: string, init: RequestInit): Promise<unknown> => {
  const response = await fetch(url, init);

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      isObject(payload) && typeof payload.message === 'string'
        ? payload.message
        : response.statusText || 'Request failed';

    throw new ApiError(response.status, message);
  }

  return payload;
};

const isSignatureTokenError = (error: unknown): boolean => {
  if (!(error instanceof ApiError) || error.statusCode !== 401) return false;

  const message = error.message.toLowerCase();
  if (!message) return true;
  if (message.includes('signature')) return true;
  if (message.includes('client token')) return true;
  if (message.includes('invalid') && message.includes('token')) return true;
  if (message.includes('expired') && message.includes('token')) return true;
  return false;
};

const getClientToken = async (forceRefresh = false): Promise<ClientTokenData> => {
  if (!forceRefresh && isClientTokenValid(cachedClientToken)) {
    return cachedClientToken;
  }

  if (clientTokenPromise) return clientTokenPromise;

  clientTokenPromise = (async () => {
    const payload = await fetchJson(`${API_BASE_URL}${CLIENT_TOKEN_PATH}`, {
      method: 'GET',
    });

    if (!isApiEnvelope<ClientTokenData>(payload) || !isObject(payload.data)) {
      throw new ApiError(500, 'Failed to initialise request signing token.');
    }

    const tokenData = payload.data;
    cachedClientToken = {
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
    };

    return cachedClientToken;
  })().finally(() => {
    clientTokenPromise = null;
  });

  return clientTokenPromise;
};

interface RequestEnvelopeOptions {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipSigning?: boolean;
}

const requestEnvelope = async <T>({
  method,
  path,
  body,
  headers = {},
  skipSigning = false,
}: RequestEnvelopeOptions): Promise<ApiEnvelope<T>> => {
  const urlPath = pathWithQuery(path);
  const url = `${API_BASE_URL}${urlPath}`;
  const bodyString = body === undefined ? undefined : JSON.stringify(body);

  const send = async (forceRefreshClientToken = false): Promise<ApiEnvelope<T>> => {
    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };

    if (bodyString !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (!skipSigning) {
      const { token } = await getClientToken(forceRefreshClientToken);
      const timestamp = Date.now().toString();
      const canonical = buildCanonicalString(
        method,
        pathWithQuery(url),
        timestamp,
        buildCanonicalBody(body)
      );

      requestHeaders['x-client-token'] = token;
      requestHeaders['x-timestamp'] = timestamp;
      requestHeaders['x-signature'] = await hmacSha256Hex(canonical, token);
    }

    const payload = await fetchJson(url, {
      method,
      headers: requestHeaders,
      body: bodyString,
    });

    if (!isApiEnvelope<T>(payload)) {
      throw new ApiError(500, 'Invalid server response.');
    }

    return payload;
  };

  try {
    return await send(false);
  } catch (error) {
    if (!skipSigning && isSignatureTokenError(error)) {
      return send(true);
    }

    throw error;
  }
};

const refreshClientSession = async (): Promise<ClientSession> => {
  if (sessionRefreshPromise) return sessionRefreshPromise;

  sessionRefreshPromise = (async () => {
    const current = clientSessionStore.get();
    if (!current?.refreshToken) {
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }

    const tokens = await clientAuthApi.refresh(current.refreshToken);

    const nextSession: ClientSession = {
      ...current,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    clientSessionStore.set(nextSession);
    return nextSession;
  })().finally(() => {
    sessionRefreshPromise = null;
  });

  return sessionRefreshPromise;
};

const withAuth = async <T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown
): Promise<ApiEnvelope<T>> => {
  const session = clientSessionStore.get();
  if (!session?.accessToken) {
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  let accessToken = session.accessToken;
  if (isAccessTokenExpired(accessToken)) {
    const refreshed = await refreshClientSession();
    accessToken = refreshed.accessToken;
  }

  const requestWithToken = (token: string) =>
    requestEnvelope<T>({
      method,
      path,
      body,
      headers: { Authorization: `Bearer ${token}` },
    });

  try {
    return await requestWithToken(accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      const refreshed = await refreshClientSession();
      return requestWithToken(refreshed.accessToken);
    }

    throw error;
  }
};

export interface ClientAuthLoginInput {
  email: string;
  password: string;
}

export interface ClientAuthResetPasswordInput {
  otp: string;
  newPassword: string;
}

export interface ClientAuthSessionData {
  accessToken: string;
  refreshToken: string;
  client: ClientProfile;
}

export type ClientAuthMeData = ClientProfile;

const normalizeClientProfile = (value: unknown): ClientProfile => {
  if (!isObject(value)) {
    throw new ApiError(500, 'Invalid client profile payload.');
  }

  const clientId =
    asNonEmptyString(value.clientId) ??
    asNonEmptyString(value._id) ??
    asNonEmptyString(value.id);
  const name = asNonEmptyString(value.name);
  const email = asNonEmptyString(value.email);
  const businessId = asNonEmptyString(value.businessId);

  if (!clientId || !name || !email || !businessId) {
    throw new ApiError(500, 'Invalid client profile payload.');
  }

  return {
    _id: clientId,
    id: asNonEmptyString(value.id) ?? clientId,
    clientId,
    name,
    email,
    businessId,
    phone: asNonEmptyString(value.phone) ?? undefined,
    timezone: asNonEmptyString(value.timezone) ?? undefined,
    mustChangePassword:
      typeof value.mustChangePassword === 'boolean' ? value.mustChangePassword : undefined,
  };
};

const normalizeClientAuthSessionData = (value: unknown): ClientAuthSessionData => {
  if (!isObject(value)) {
    throw new ApiError(500, 'Invalid login response payload.');
  }

  const accessToken = asNonEmptyString(value.accessToken);
  const refreshToken = asNonEmptyString(value.refreshToken);
  const rawProfile = value.user ?? value.client;

  if (!accessToken || !refreshToken || rawProfile == null) {
    throw new ApiError(500, 'Invalid login response payload.');
  }

  return {
    accessToken,
    refreshToken,
    client: normalizeClientProfile(rawProfile),
  };
};

export const clientAuthApi = {
  login: async (input: ClientAuthLoginInput): Promise<ClientAuthSessionData> => {
    const envelope = await requestEnvelope<unknown>({
      method: 'POST',
      path: '/client-auth/login',
      body: input,
    });

    return normalizeClientAuthSessionData(envelope.data);
  },

  refresh: async (refreshToken: string): Promise<Pick<ClientSession, 'accessToken' | 'refreshToken'>> => {
    const envelope = await requestEnvelope<Record<string, unknown>>({
      method: 'POST',
      path: '/client-auth/refresh',
      body: { refreshToken },
    });

    const accessToken = asNonEmptyString(envelope.data.accessToken);
    const maybeRefreshToken = asNonEmptyString(envelope.data.refreshToken);

    if (!accessToken) {
      throw new ApiError(500, 'Invalid refresh response payload.');
    }

    return {
      accessToken,
      refreshToken: maybeRefreshToken ?? refreshToken,
    };
  },

  logout: async (refreshToken: string): Promise<void> => {
    await requestEnvelope<null>({
      method: 'POST',
      path: '/client-auth/logout',
      body: { refreshToken },
    });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await requestEnvelope<null>({
      method: 'POST',
      path: '/client-auth/forgot-password',
      body: { email },
    });
  },

  resetPassword: async (input: ClientAuthResetPasswordInput): Promise<void> => {
    await requestEnvelope<null>({
      method: 'POST',
      path: '/client-auth/reset-password',
      body: input,
    });
  },

  me: async (): Promise<ClientAuthMeData> => {
    const envelope = await withAuth<unknown>('GET', '/client-auth/me');
    return normalizeClientProfile(envelope.data);
  },
};

export interface ClientDashboardData {
  outstandingBalance: number;
  totalPaid: number;
  pendingContractsCount: number;
  recentActivities: ClientActivity[];
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  issuedDate: string;
  dueDate?: string;
  amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  currency: string;
}

export type ClientJob = Record<string, unknown>;

export interface ClientContract {
  id: string;
  name: string;
  dateSent?: string;
  amount: number;
  status: 'awaiting_signature' | 'signed' | 'expired' | 'cancelled';
  currency: string;
  content?: string;
  signedAt?: string | null;
}

export interface ClientActivity {
  id: string;
  description: string;
  type: 'invoice' | 'payment' | 'contract' | 'file' | 'message';
  referenceId?: string;
  date: string;
}

export interface ClientContact {
  id: string;
  businessName: string;
  supportEmail?: string;
  phone?: string;
  address?: string;
  website?: string;
  logoUrl: null;
}

export interface ClientFile {
  id: string;
  filename: string;
  format: 'pdf' | 'doc' | 'docx' | 'xlsx' | 'png' | 'jpg';
  filesizeBytes: number;
  generatedDate: string;
}

export interface ClientConversation {
  id: string;
  serviceProvider: {
    id: string;
    businessName: string;
    supportEmail?: string;
    avatarInitials: string;
  };
  lastMessageContent: string;
  lastMessageAt?: string;
  clientUnreadCount: number;
}

export interface ClientConversationMessage {
  id: string;
  sender: 'business' | 'client';
  senderName: string;
  content?: string;
  isRead: boolean;
  attachments: Array<{
    url: string;
    fileName?: string;
    mimeType?: string;
  }>;
  createdAt: string;
}

export interface ClientChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const clientPortalApi = {
  getDashboard: async (): Promise<ClientDashboardData> => {
    const envelope = await withAuth<ClientDashboardData>('GET', '/client/api/dashboard');
    return envelope.data;
  },

  listInvoices: async (): Promise<ClientInvoice[]> => {
    const envelope = await withAuth<ClientInvoice[]>('GET', '/client/api/invoices');
    return envelope.data;
  },

  listJobs: async (): Promise<ClientJob[]> => {
    const envelope = await withAuth<ClientJob[]>('GET', '/client/api/jobs');
    return envelope.data;
  },

  listContracts: async (): Promise<ClientContract[]> => {
    const envelope = await withAuth<ClientContract[]>('GET', '/client/api/contracts');
    return envelope.data;
  },

  signContract: async (
    contractId: string,
    signatureData: string
  ): Promise<{ id: string; status: 'signed'; signedAt: string }> => {
    const envelope = await withAuth<{ id: string; status: 'signed'; signedAt: string }>(
      'PATCH',
      `/client/api/contracts/${contractId}/sign`,
      { signatureData }
    );

    return envelope.data;
  },

  listActivities: async (): Promise<ClientActivity[]> => {
    const envelope = await withAuth<ClientActivity[]>('GET', '/client/api/activities');
    return envelope.data;
  },

  listContacts: async (): Promise<ClientContact[]> => {
    const envelope = await withAuth<ClientContact[]>('GET', '/client/api/contacts');
    return envelope.data;
  },

  listFiles: async (): Promise<ClientFile[]> => {
    const envelope = await withAuth<ClientFile[]>('GET', '/client/api/files');
    return envelope.data;
  },

  getFileDownloadUrl: async (fileId: string): Promise<{ downloadUrl: string; expiresInSeconds: number; filename: string }> => {
    const envelope = await withAuth<{ downloadUrl: string; expiresInSeconds: number; filename: string }>(
      'GET',
      `/client/api/files/${fileId}/download`
    );

    return envelope.data;
  },

  listConversations: async (): Promise<ClientConversation[]> => {
    const envelope = await withAuth<ClientConversation[]>('GET', '/client/api/messages/conversations');
    return envelope.data;
  },

  listConversationMessages: async (providerId: string): Promise<ClientConversationMessage[]> => {
    const envelope = await withAuth<ClientConversationMessage[]>(
      'GET',
      `/client/api/messages/conversations/${providerId}`
    );

    return envelope.data;
  },

  markConversationRead: async (providerId: string): Promise<void> => {
    await withAuth<null>('PATCH', `/client/api/messages/conversations/${providerId}/read`);
  },

  changePassword: async (input: ClientChangePasswordInput): Promise<void> => {
    await withAuth<null>('PATCH', '/client/api/profile/change-password', input);
  },
};

export const clientApiUtils = {
  isAccessTokenExpired,
};
