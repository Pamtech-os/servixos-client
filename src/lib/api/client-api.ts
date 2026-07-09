import { type ClientProfile } from '@/lib/api/client-session';

export interface ApiMeta {
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
  // 30-second buffer to avoid using a token that's about to expire
  return Date.now() >= expiryMs - 30_000;
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
let sessionRefreshPromise: Promise<void> | null = null;

// In-memory access token for socket auth — not persisted to localStorage.
// Tokens in httpOnly cookies can't be read by JS, so we keep a copy in memory
// solely for the Socket.io handshake. Cleared on logout and page refresh.
let inMemoryAccessToken: string | null = null;

export const clientInMemoryAuth = {
  get: () => inMemoryAccessToken,
  set: (token: string) => { inMemoryAccessToken = token; },
  clear: () => { inMemoryAccessToken = null; },
};

const isClientTokenValid = (tokenData: ClientTokenData | null): tokenData is ClientTokenData => {
  if (!tokenData) return false;

  const expiryMs =
    tokenData.expiresAt ??
    (tokenData.token ? getTokenExpiryMs(tokenData.token) : null) ??
    Date.now() + 60_000;

  return Date.now() < expiryMs - CLIENT_TOKEN_EXPIRY_BUFFER_MS;
};

const fetchJson = async (url: string, init: RequestInit): Promise<unknown> => {
  const response = await fetch(url, { ...init, credentials: 'include' });

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
      'x-channel': 'web',
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

// Refreshes the session by calling the refresh endpoint. The server rotates the
// c_refresh_token cookie and sets a new c_access_token cookie automatically.
// Returns the new access token from the response body (used for socket auth).
const refreshClientSession = async (): Promise<string> => {
  if (sessionRefreshPromise) return sessionRefreshPromise as unknown as Promise<string>;

  let resolvedToken = '';

  sessionRefreshPromise = (async () => {
    const envelope = await requestEnvelope<Record<string, unknown>>({
      method: 'POST',
      path: '/client-auth/refresh',
    });

    const accessToken = asNonEmptyString(envelope.data.accessToken);
    if (!accessToken) throw new ApiError(500, 'Invalid refresh response payload.');

    inMemoryAccessToken = accessToken;
    resolvedToken = accessToken;
  })().finally(() => {
    sessionRefreshPromise = null;
  });

  await sessionRefreshPromise;
  return resolvedToken;
};

// Makes an authenticated request. Cookies are sent automatically by the browser.
// On 401, refreshes the session once (rotating the refresh cookie) and retries.
const withAuth = async <T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown
): Promise<ApiEnvelope<T>> => {
  const makeRequest = () => requestEnvelope<T>({ method, path, body });

  try {
    return await makeRequest();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      await refreshClientSession();
      return makeRequest();
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

export interface ClientAuthLoginResult {
  accessToken: string;
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

const normalizeLoginResponse = (value: unknown): ClientAuthLoginResult => {
  if (!isObject(value)) {
    throw new ApiError(500, 'Invalid login response payload.');
  }

  // accessToken is returned in the body for all channels; we keep it in memory for socket auth.
  const accessToken = asNonEmptyString(value.accessToken);
  const rawProfile = value.user ?? value.client;

  if (!accessToken || rawProfile == null) {
    throw new ApiError(500, 'Invalid login response payload.');
  }

  return {
    accessToken,
    client: normalizeClientProfile(rawProfile),
  };
};

export const clientAuthApi = {
  login: async (input: ClientAuthLoginInput): Promise<ClientAuthLoginResult> => {
    const envelope = await requestEnvelope<unknown>({
      method: 'POST',
      path: '/client-auth/login',
      body: input,
    });

    return normalizeLoginResponse(envelope.data);
  },

  // Rotates the refresh cookie and returns the new access token for socket auth.
  refresh: async (): Promise<{ accessToken: string }> => {
    const accessToken = await refreshClientSession();
    return { accessToken };
  },

  // Clears auth cookies server-side. Cookies are sent automatically for x-channel: web.
  logout: async (): Promise<void> => {
    await requestEnvelope<null>({
      method: 'POST',
      path: '/client-auth/logout',
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

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ClientInvoiceSortBy {
  DUE_DATE = 'dueDate',
  AMOUNT = 'amount',
  ISSUED_DATE = 'issuedDate',
}

export interface ClientInvoiceFilter {
  status?: 'paid' | 'partial' | 'unpaid';
  from?: string;
  to?: string;
  sort?: ClientInvoiceSortBy;
  order?: SortOrder;
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

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ClientJobFilter {
  status?: JobStatus;
  page?: number;
  limit?: number;
}

export interface ClientJob {
  id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  location?: string;
  price?: number;
  status: JobStatus;
}

export interface ClientJobDetail extends ClientJob {
  notes?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ClientReview {
  _id: string;
  businessId: string;
  clientId: string;
  jobId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface ClientSubmitReviewInput {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

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

  listInvoices: async (filter?: ClientInvoiceFilter): Promise<ClientInvoice[]> => {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);
    if (filter?.from) params.set('from', filter.from);
    if (filter?.to) params.set('to', filter.to);
    if (filter?.sort) params.set('sort', filter.sort);
    if (filter?.order) params.set('order', filter.order);

    const qs = params.toString();
    const envelope = await withAuth<ClientInvoice[]>('GET', qs ? `/client/api/invoices?${qs}` : '/client/api/invoices');
    return envelope.data;
  },

  listJobs: async (filter?: ClientJobFilter): Promise<{ jobs: ClientJob[]; meta?: ApiMeta }> => {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);
    if (filter?.page) params.set('page', String(filter.page));
    if (filter?.limit) params.set('limit', String(filter.limit));

    const qs = params.toString();
    const envelope = await withAuth<ClientJob[]>('GET', qs ? `/client/api/jobs?${qs}` : '/client/api/jobs');
    return { jobs: envelope.data, meta: envelope.meta };
  },

  getJob: async (jobId: string): Promise<ClientJobDetail> => {
    const envelope = await withAuth<ClientJobDetail>('GET', `/client/api/jobs/${jobId}`);
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

  getJobReview: async (jobId: string): Promise<ClientReview> => {
    const envelope = await withAuth<ClientReview>('GET', `/client/api/jobs/${jobId}/review`);
    return envelope.data;
  },

  submitJobReview: async (jobId: string, input: ClientSubmitReviewInput): Promise<ClientReview> => {
    const envelope = await withAuth<ClientReview>('POST', `/client/api/jobs/${jobId}/review`, input);
    return envelope.data;
  },
};

export const clientApiUtils = {
  isAccessTokenExpired,
};
