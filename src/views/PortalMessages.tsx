'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ModernSpinner from '@/components/ModernSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalConversationsQuery, usePortalMessagesQuery } from '@/lib/server-state/hooks';
import { queryKeys } from '@/lib/server-state/query-keys';
import {
  markConversationRead,
  type PortalConversation,
  type PortalMessage,
} from '@/lib/api/portal-api';
import {
  connectClientMessagesSocket,
  getClientMessagesSocket,
  type ClientMessagesConversationUpdatedPayload,
  type ClientMessagesMessageReadPayload,
  type ClientMessagesNewMessagePayload,
  type ClientMessagesTypingPayload,
  type ClientMessagesSocket,
  type ClientMessagesErrorPayload,
} from '@/lib/realtime/client-messages-socket';
import { useIsMobile } from '@/hooks/useMobile';

const TABLET_BREAKPOINT = 1024;
const TYPING_STOP_DELAY_MS = 1200;

const formatTimestamp = (date: Date) => {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const parseDate = (value: string | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const appendMessage = (messages: PortalMessage[], next: PortalMessage): PortalMessage[] => {
  if (messages.some((message) => message.id === next.id)) return messages;

  return [...messages, next].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

const PortalMessages = () => {
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const { data: conversations, isPending: isConversationsPending } = usePortalConversationsQuery();
  const { data: messages, isPending: isMessagesPending } = usePortalMessagesQuery();

  const conversationRows = useMemo(() => conversations ?? [], [conversations]);
  const messageRows = useMemo(() => messages ?? [], [messages]);
  const isLoadingConversations = isConversationsPending && !conversations;
  const isLoadingMessages = isMessagesPending && !messages;

  const [input, setInput] = useState('');
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [isTablet, setIsTablet] = useState(false);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [isProviderTyping, setIsProviderTyping] = useState(false);

  const activeProviderRef = useRef<string | null>(null);
  const joinedProviderRef = useRef<string | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTypingStartedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeProviderExists = activeProvider
    ? conversationRows.some((conversation) => conversation.providerId === activeProvider)
    : false;
  const resolvedActiveProvider = activeProviderExists ? activeProvider : null;
  const activeMessages = messageRows.filter(
    (message) => message.providerId === resolvedActiveProvider
  );
  const activeConversation =
    conversationRows.find((conversation) => conversation.providerId === resolvedActiveProvider) ?? null;

  const updateConversationPreview = useCallback(
    (
      providerId: string,
      update: Partial<
        Pick<PortalConversation, 'lastMessageContent' | 'lastMessageAt' | 'clientUnreadCount'>
      >
    ) => {
      let didUpdate = false;

      queryClient.setQueryData<PortalConversation[]>(queryKeys.conversations, (previous = []) => {
        const index = previous.findIndex((conversation) => conversation.providerId === providerId);
        if (index < 0) return previous;

        didUpdate = true;
        const next = [...previous];
        next[index] = {
          ...next[index],
          ...update,
        };
        return next;
      });

      if (!didUpdate) {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations }).catch(() => undefined);
      }
    },
    [queryClient]
  );

  const emitMarkRead = useCallback(
    (providerId: string) => {
      const socket = getClientMessagesSocket();
      if (socket?.connected) {
        socket.emit('mark_read', { providerId });
      }

      updateConversationPreview(providerId, { clientUnreadCount: 0 });
      void markConversationRead(providerId).catch(() => undefined);
    },
    [updateConversationPreview]
  );

  const stopTyping = useCallback((providerIdOverride?: string) => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    const providerId = providerIdOverride ?? activeProviderRef.current;
    if (!providerId || !hasTypingStartedRef.current) return;

    const socket = getClientMessagesSocket();
    if (socket?.connected) {
      socket.emit('typing_stop', { providerId });
    }

    hasTypingStartedRef.current = false;
  }, []);

  const scheduleTypingStop = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_STOP_DELAY_MS);
  }, [stopTyping]);

  const handleSocketNewMessage = useCallback(
    (payload: ClientMessagesNewMessagePayload) => {
      const providerId = payload.providerId ?? payload.businessId ?? activeProviderRef.current;
      if (!providerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.messages }).catch(() => undefined);
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations }).catch(() => undefined);
        return;
      }

      const timestamp = parseDate(payload.createdAt) ?? new Date();
      const newMessage: PortalMessage = {
        id: payload.id,
        sender: payload.sender,
        senderName: payload.senderName || (payload.sender === 'client' ? 'You' : 'Support'),
        content: payload.content ?? '',
        timestamp,
        providerId,
      };

      queryClient.setQueryData<PortalMessage[]>(queryKeys.messages, (previous = []) =>
        appendMessage(previous, newMessage)
      );

      const shouldMarkRead =
        payload.sender === 'business' && providerId === activeProviderRef.current && document.hasFocus();
      const nextUnreadCount = shouldMarkRead ? 0 : undefined;

      updateConversationPreview(providerId, {
        lastMessageContent: newMessage.content,
        lastMessageAt: timestamp,
        ...(typeof nextUnreadCount === 'number' ? { clientUnreadCount: nextUnreadCount } : {}),
      });

      if (shouldMarkRead) {
        emitMarkRead(providerId);
      }
    },
    [emitMarkRead, queryClient, updateConversationPreview]
  );

  const handleSocketMessageRead = useCallback(
    (payload: ClientMessagesMessageReadPayload) => {
      updateConversationPreview(payload.providerId, { clientUnreadCount: 0 });
    },
    [updateConversationPreview]
  );

  const handleSocketConversationUpdated = useCallback(
    (payload: ClientMessagesConversationUpdatedPayload) => {
      const nextLastMessageAt = parseDate(payload.lastMessageAt);
      let didUpdate = false;

      queryClient.setQueryData<PortalConversation[]>(queryKeys.conversations, (previous = []) => {
        const index = previous.findIndex((conversation) => conversation.id === payload.id);
        if (index < 0) return previous;

        didUpdate = true;
        const next = [...previous];
        next[index] = {
          ...next[index],
          lastMessageContent: payload.lastMessageContent,
          lastMessageAt: nextLastMessageAt,
          clientUnreadCount: payload.clientUnreadCount,
        };
        return next;
      });

      if (!didUpdate) {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations }).catch(() => undefined);
      }
    },
    [queryClient]
  );

  const handleSocketTyping = useCallback(
    (payload: ClientMessagesTypingPayload) => {
      if (payload.clientId && payload.clientId === auth.clientId) return;

      const providerId = payload.providerId ?? payload.businessId ?? activeProviderRef.current;
      if (!providerId || providerId !== activeProviderRef.current) return;
      setIsProviderTyping(Boolean(payload.isTyping));
    },
    [auth.clientId]
  );

  const handleSocketError = useCallback((payload: ClientMessagesErrorPayload) => {
    const message = payload.message?.trim();
    if (!message) return;
    toast.error(message);
  }, []);

  useEffect(() => {
    activeProviderRef.current = resolvedActiveProvider;
  }, [resolvedActiveProvider]);

  useEffect(() => {
    let isMounted = true;
    let cleanup = () => undefined;

    const bindSocketListeners = (socket: ClientMessagesSocket) => {
      const handleConnect = () => setIsSocketReady(true);
      const handleDisconnect = () => setIsSocketReady(false);

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('new_message', handleSocketNewMessage);
      socket.on('message_read', handleSocketMessageRead);
      socket.on('conversation_updated', handleSocketConversationUpdated);
      socket.on('typing', handleSocketTyping);
      socket.on('error', handleSocketError);
      setIsSocketReady(socket.connected);

      cleanup = () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('new_message', handleSocketNewMessage);
        socket.off('message_read', handleSocketMessageRead);
        socket.off('conversation_updated', handleSocketConversationUpdated);
        socket.off('typing', handleSocketTyping);
        socket.off('error', handleSocketError);
      };
    };

    const attach = async () => {
      const existing = getClientMessagesSocket();
      if (existing) {
        bindSocketListeners(existing);
        return;
      }

      const connected = await connectClientMessagesSocket();
      if (!isMounted || !connected) return;
      bindSocketListeners(connected);
    };

    void attach();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [
    handleSocketConversationUpdated,
    handleSocketError,
    handleSocketMessageRead,
    handleSocketNewMessage,
    handleSocketTyping,
  ]);

  useEffect(() => {
    if (!isSocketReady) return;

    const socket = getClientMessagesSocket();
    if (!socket?.connected) return;

    const previousProvider = joinedProviderRef.current;
    if (previousProvider && previousProvider !== resolvedActiveProvider) {
      socket.emit('leave_conversation', { providerId: previousProvider });
      stopTyping(previousProvider);
    }

    if (!resolvedActiveProvider) {
      joinedProviderRef.current = null;
      return;
    }

    if (joinedProviderRef.current !== resolvedActiveProvider) {
      socket.emit('join_conversation', { providerId: resolvedActiveProvider });
      joinedProviderRef.current = resolvedActiveProvider;
    }

    emitMarkRead(resolvedActiveProvider);
  }, [emitMarkRead, isSocketReady, resolvedActiveProvider, stopTyping]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, isProviderTyping]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT}px)`);
    const onChange = () => {
      setIsTablet(window.innerWidth <= TABLET_BREAKPOINT);
    };

    mediaQuery.addEventListener('change', onChange);
    onChange();
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!resolvedActiveProvider) return;

    const onFocus = () => emitMarkRead(resolvedActiveProvider);
    const onVisibilityChange = () => {
      if (!document.hidden) emitMarkRead(resolvedActiveProvider);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [emitMarkRead, resolvedActiveProvider]);

  useEffect(
    () => () => {
      const joinedProviderId = joinedProviderRef.current;
      const socket = getClientMessagesSocket();

      stopTyping(joinedProviderId ?? undefined);
      if (joinedProviderId && socket?.connected) {
        socket.emit('leave_conversation', { providerId: joinedProviderId });
      }
    },
    [stopTyping]
  );

  const handleSend = () => {
    const content = input.trim();
    if (!content || !resolvedActiveProvider) return;

    const socket = getClientMessagesSocket();
    if (!socket?.connected) {
      toast.error('Messaging is reconnecting. Please try again in a moment.');
      return;
    }

    socket.emit('send_message', { providerId: resolvedActiveProvider, content });
    stopTyping(resolvedActiveProvider);
    setInput('');
  };

  const handleInputChange = (value: string) => {
    setInput(value);

    if (!resolvedActiveProvider) return;

    const socket = getClientMessagesSocket();
    if (!socket?.connected) return;

    if (!value.trim()) {
      stopTyping(resolvedActiveProvider);
      return;
    }

    if (!hasTypingStartedRef.current) {
      socket.emit('typing_start', { providerId: resolvedActiveProvider });
      hasTypingStartedRef.current = true;
    }

    scheduleTypingStop();
  };

  const isCompactLayout = isMobile || isTablet;
  const showList = !resolvedActiveProvider || !isCompactLayout;
  const showChat = Boolean(resolvedActiveProvider);

  return (
    <div className='flex h-[calc(100dvh-9.5rem)] min-h-[28rem] flex-col space-y-3 sm:space-y-4 lg:h-[calc(100dvh-8.5rem)]'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className='text-xl font-bold sm:text-2xl'>Messages</h1>
        <p className='text-sm text-muted-foreground sm:text-base'>Chat with your service providers</p>
      </motion.div>

      <div className='flex flex-1 gap-4 overflow-hidden'>
        <AnimatePresence mode='wait'>
          {showList && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`overflow-hidden rounded-xl border border-border bg-card ${
                isCompactLayout ? 'w-full' : 'w-72 shrink-0 xl:w-80'
              } flex flex-col`}
            >
              <div className='border-b border-border p-3'>
                <h2 className='text-sm font-semibold text-muted-foreground'>Conversations</h2>
              </div>
              <div className='flex-1 overflow-y-auto'>
                {isLoadingConversations ? (
                  <div className='flex h-full min-h-52 items-center justify-center p-6 text-center'>
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <ModernSpinner size='sm' color='primary' />
                      <p className='text-sm'>Loading conversations...</p>
                    </div>
                  </div>
                ) : conversationRows.length === 0 ? (
                  <div className='flex h-full min-h-52 items-center justify-center p-6 text-center'>
                    <p className='text-sm text-muted-foreground'>No conversations yet.</p>
                  </div>
                ) : (
                  conversationRows.map((conversation, i) => {
                        const isActive = resolvedActiveProvider === conversation.providerId;
                    return (
                      <motion.button
                        key={conversation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        onClick={() => {
                          setActiveProvider(conversation.providerId);
                          setIsProviderTyping(false);
                        }}
                        className={`w-full border-b border-border/50 p-3.5 text-left transition-colors hover:bg-muted/50 flex items-center gap-3 ${
                          isActive ? 'border-l-2 border-l-primary bg-primary/5' : ''
                        }`}
                      >
                        <Avatar className='h-10 w-10 shrink-0'>
                          <AvatarFallback className='bg-primary/10 text-xs font-medium text-primary'>
                            {conversation.avatarInitials || getInitials(conversation.businessName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center justify-between gap-2'>
                            <span className='truncate text-sm font-semibold'>
                              {conversation.businessName}
                            </span>
                            <div className='flex items-center gap-1.5'>
                              {conversation.clientUnreadCount > 0 && (
                                <Badge className='h-5 min-w-5 rounded-full px-1.5 text-[10px]'>
                                  {conversation.clientUnreadCount}
                                </Badge>
                              )}
                              {conversation.lastMessageAt && (
                                <span className='shrink-0 text-[10px] text-muted-foreground'>
                                  {formatTimestamp(conversation.lastMessageAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          {conversation.lastMessageContent && (
                            <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                              {conversation.lastMessageContent}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode='wait'>
          {showChat ? (
            <motion.div
              key={resolvedActiveProvider}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className='flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card'
            >
              <div className='flex items-center gap-3 border-b border-border p-3'>
                {isCompactLayout && (
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => {
                      setActiveProvider(null);
                      setIsProviderTyping(false);
                    }}
                    className='shrink-0'
                  >
                    <ArrowLeft size={18} />
                  </Button>
                )}
                <Avatar className='h-8 w-8 shrink-0'>
                  <AvatarFallback className='bg-primary/10 text-xs text-primary'>
                    {activeConversation
                      ? activeConversation.avatarInitials || getInitials(activeConversation.businessName)
                      : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold'>
                    {activeConversation?.businessName} Team
                  </p>
                  <p className='truncate text-[11px] text-muted-foreground'>
                    {activeConversation?.supportEmail}
                  </p>
                </div>
              </div>

              <div className='flex-1 space-y-4 overflow-y-auto p-3 sm:p-4'>
                {isLoadingMessages ? (
                  <div className='flex h-full min-h-44 items-center justify-center text-center'>
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <ModernSpinner size='sm' color='primary' />
                      <p className='text-sm'>Loading messages...</p>
                    </div>
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className='flex h-full min-h-44 items-center justify-center text-center'>
                    <p className='text-sm text-muted-foreground'>
                      No messages in this conversation yet.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((message, i) => {
                    const isClient = message.sender === 'client';
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.3 }}
                        className={`flex gap-3 ${isClient ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className='h-8 w-8 shrink-0'>
                          <AvatarFallback
                            className={
                              isClient
                                ? 'bg-primary/10 text-xs text-primary'
                                : 'bg-secondary/10 text-xs text-secondary'
                            }
                          >
                            {isClient
                              ? 'YO'
                              : activeConversation
                              ? activeConversation.avatarInitials ||
                                getInitials(activeConversation.businessName)
                              : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[82%] space-y-1 sm:max-w-[75%] ${
                            isClient ? 'items-end text-right' : ''
                          }`}
                        >
                          <div className={`flex items-center gap-2 ${isClient ? 'justify-end' : ''}`}>
                            <span className='text-xs font-medium'>{message.senderName}</span>
                            <span className='text-[10px] text-muted-foreground'>
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          <div
                            className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                              isClient
                                ? 'rounded-br-md bg-primary text-primary-foreground'
                                : 'rounded-bl-md bg-muted text-foreground'
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                {isProviderTyping && (
                  <div className='text-xs text-muted-foreground'>
                    {activeConversation?.businessName || 'Provider'} is typing...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className='flex items-center gap-2 border-t border-border p-2.5 sm:p-3'>
                <Button variant='ghost' size='icon' className='shrink-0 text-muted-foreground'>
                  <Paperclip size={18} />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder='Type a message...'
                  className='flex-1'
                />
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    onClick={handleSend}
                    size='icon'
                    className='gradient-bg shrink-0 text-primary-foreground'
                  >
                    <Send size={16} />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!resolvedActiveProvider && !isCompactLayout && conversationRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='flex flex-1 items-center justify-center rounded-xl border border-border bg-card'
          >
            <div className='space-y-2 text-center'>
              <MessageSquare className='mx-auto h-10 w-10 text-muted-foreground/40' />
              <p className='text-sm text-muted-foreground'>Select a conversation to start chatting</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PortalMessages;
