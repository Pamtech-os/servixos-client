'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ModernSpinner from '@/components/ModernSpinner';
import { usePortalMessagesQuery, useServiceProvidersQuery } from '@/lib/server-state/hooks';
import { queryKeys } from '@/lib/server-state/query-keys';
import { markConversationRead, type PortalMessage } from '@/lib/api/portal-api';
import { useIsMobile } from '@/hooks/useMobile';

const TABLET_BREAKPOINT = 1024;

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

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const PortalMessages = () => {
  const queryClient = useQueryClient();
  const { data: messages, isPending: isMessagesPending } = usePortalMessagesQuery();
  const { data: providers, isPending: isProvidersPending } = useServiceProvidersQuery();
  const messageRows = messages ?? [];
  const providerRows = providers ?? [];
  const isLoadingConversations = isProvidersPending && !providers;
  const isLoadingMessages = isMessagesPending && !messages;

  const [input, setInput] = useState('');
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [isTablet, setIsTablet] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeMessages = messageRows.filter((m) => m.providerId === activeProvider);
  const activeProviderData = providerRows.find((provider) => provider.id === activeProvider);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT}px)`);
    const onChange = () => {
      setIsTablet(window.innerWidth <= TABLET_BREAKPOINT);
    };

    mediaQuery.addEventListener('change', onChange);
    onChange();
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  const handleSend = () => {
    if (!input.trim() || !activeProvider) return;

    const newMsg: PortalMessage = {
      id: `pm-${Date.now()}`,
      sender: 'client',
      senderName: 'You',
      content: input.trim(),
      timestamp: new Date(),
      providerId: activeProvider,
    };

    queryClient.setQueryData<PortalMessage[]>(queryKeys.messages, (previous = []) => [
      ...previous,
      newMsg,
    ]);

    setInput('');
  };

  const getLastMessage = (providerId: string) => {
    const providerMsgs = messageRows.filter((message) => message.providerId === providerId);
    return providerMsgs[providerMsgs.length - 1];
  };

  const isCompactLayout = isMobile || isTablet;
  const showList = !activeProvider || !isCompactLayout;
  const showChat = Boolean(activeProvider);

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
                ) : providerRows.length === 0 ? (
                  <div className='flex h-full min-h-52 items-center justify-center p-6 text-center'>
                    <p className='text-sm text-muted-foreground'>No conversations yet.</p>
                  </div>
                ) : (
                  providerRows.map((provider, i) => {
                    const lastMsg = getLastMessage(provider.id);
                    const isActive = activeProvider === provider.id;
                    return (
                      <motion.button
                        key={provider.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        onClick={() => {
                          setActiveProvider(provider.id);
                          void markConversationRead(provider.id);
                        }}
                        className={`w-full border-b border-border/50 p-3.5 text-left transition-colors hover:bg-muted/50 flex items-center gap-3 ${
                          isActive ? 'border-l-2 border-l-primary bg-primary/5' : ''
                        }`}
                      >
                        <Avatar className='h-10 w-10 shrink-0'>
                          <AvatarFallback className='bg-primary/10 text-xs font-medium text-primary'>
                            {getInitials(provider.businessName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center justify-between'>
                            <span className='truncate text-sm font-semibold'>{provider.businessName}</span>
                            {lastMsg && (
                              <span className='ml-2 shrink-0 text-[10px] text-muted-foreground'>
                                {formatTimestamp(lastMsg.timestamp)}
                              </span>
                            )}
                          </div>
                          {lastMsg && (
                            <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                              {lastMsg.sender === 'client' ? 'You: ' : ''}
                              {lastMsg.content}
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
              key={activeProvider}
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
                    onClick={() => setActiveProvider(null)}
                    className='shrink-0'
                  >
                    <ArrowLeft size={18} />
                  </Button>
                )}
                <Avatar className='h-8 w-8 shrink-0'>
                  <AvatarFallback className='bg-primary/10 text-xs text-primary'>
                    {activeProviderData ? getInitials(activeProviderData.businessName) : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold'>
                    {activeProviderData?.businessName} Team
                  </p>
                  <p className='truncate text-[11px] text-muted-foreground'>
                    {activeProviderData?.supportEmail}
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
                  activeMessages.map((msg, i) => {
                    const isClient = msg.sender === 'client';
                    return (
                      <motion.div
                        key={msg.id}
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
                            {isClient ? 'YO' : getInitials(activeProviderData?.businessName || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[82%] space-y-1 sm:max-w-[75%] ${
                            isClient ? 'items-end text-right' : ''
                          }`}
                        >
                          <div className={`flex items-center gap-2 ${isClient ? 'justify-end' : ''}`}>
                            <span className='text-xs font-medium'>{msg.senderName}</span>
                            <span className='text-[10px] text-muted-foreground'>
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          </div>
                          <div
                            className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                              isClient
                                ? 'rounded-br-md bg-primary text-primary-foreground'
                                : 'rounded-bl-md bg-muted text-foreground'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className='flex items-center gap-2 border-t border-border p-2.5 sm:p-3'>
                <Button variant='ghost' size='icon' className='shrink-0 text-muted-foreground'>
                  <Paperclip size={18} />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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

        {!activeProvider && !isCompactLayout && providerRows.length > 0 && (
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
