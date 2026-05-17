'use client';

import { io, type Socket } from 'socket.io-client';
import { clientApiUtils, clientAuthApi } from '@/lib/api/client-api';
import { clientSessionStore, type ClientSession } from '@/lib/api/client-session';

const DEFAULT_API_BASE_URL = 'https://api-dev.servixos.com/api';

const normalizeApiBaseUrl = (value: string | undefined): string => {
  if (!value) return DEFAULT_API_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '');
};

const toSocketBaseUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    const cleanedPath = parsed.pathname.replace(/\/+$/, '');
    parsed.pathname = cleanedPath.endsWith('/api') ? cleanedPath.slice(0, -4) || '/' : cleanedPath;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return value.replace(/\/api$/, '');
  }
};

const SOCKET_BASE_URL = toSocketBaseUrl(
  normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL)
);

export interface ClientMessagesNewMessagePayload {
  id: string;
  sender: 'business' | 'client';
  senderName: string;
  content: string;
  isRead: boolean;
  attachments: Array<{
    url: string;
    fileName?: string;
    mimeType?: string;
  }>;
  createdAt: string;
  providerId?: string;
  businessId?: string;
}

export interface ClientMessagesMessageReadPayload {
  clientId: string;
  providerId: string;
}

export interface ClientMessagesConversationUpdatedPayload {
  id: string;
  providerId?: string;
  lastMessageContent: string;
  lastMessageAt: string;
  clientUnreadCount: number;
}

export interface ClientMessagesTypingPayload {
  clientId?: string;
  providerId?: string;
  businessId?: string;
  isTyping: boolean;
}

export interface ClientMessagesErrorPayload {
  message?: string;
  code?: string;
}

export interface ClientMessagesProviderStatusPayload {
  providerId: string;
  isOnline: boolean;
}

type ServerToClientEvents = {
  connected: (payload: { clientId: string; message: string }) => void;
  new_message: (payload: ClientMessagesNewMessagePayload) => void;
  message_read: (payload: ClientMessagesMessageReadPayload) => void;
  conversation_updated: (payload: ClientMessagesConversationUpdatedPayload) => void;
  typing: (payload: ClientMessagesTypingPayload) => void;
  provider_status: (payload: ClientMessagesProviderStatusPayload) => void;
  error: (payload: ClientMessagesErrorPayload) => void;
};

type ClientToServerEvents = {
  join_conversation: (payload: { providerId: string }) => void;
  leave_conversation: (payload: { providerId: string }) => void;
  send_message: (payload: { providerId: string; content: string }) => void;
  mark_read: (payload: { providerId: string }) => void;
  typing_start: (payload: { providerId: string }) => void;
  typing_stop: (payload: { providerId: string }) => void;
};

export type ClientMessagesSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ClientMessagesSocket | null = null;
let connectPromise: Promise<ClientMessagesSocket | null> | null = null;
let refreshPromise: Promise<ClientSession | null> | null = null;

const refreshSessionForSocket = async (): Promise<ClientSession | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const current = clientSessionStore.get();
    if (!current?.refreshToken) return null;

    try {
      const tokens = await clientAuthApi.refresh(current.refreshToken);
      return clientSessionStore.updateTokens(tokens);
    } catch {
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const getSocketToken = async (): Promise<string | null> => {
  const session = clientSessionStore.get();
  if (!session?.accessToken) return null;

  if (!clientApiUtils.isAccessTokenExpired(session.accessToken)) {
    return session.accessToken;
  }

  const refreshed = await refreshSessionForSocket();
  return refreshed?.accessToken ?? null;
};

export const getClientMessagesSocket = (): ClientMessagesSocket | null => socket;

export const connectClientMessagesSocket = async (): Promise<ClientMessagesSocket | null> => {
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const token = await getSocketToken();
    if (!token) return null;

    if (socket) {
      socket.auth = { token };
      if (!socket.connected) socket.connect();
      return socket;
    }

    socket = io(`${SOCKET_BASE_URL}/client-messages`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
    });

    return socket;
  })().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
};

export const disconnectClientMessagesSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};
