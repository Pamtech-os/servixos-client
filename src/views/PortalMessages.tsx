'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { usePortalMessagesQuery, useServiceProvidersQuery } from '@/lib/server-state/hooks';
import { queryKeys } from '@/lib/server-state/query-keys';
import type { PortalMessage } from '@/lib/portal-mock-data';
import { useIsMobile } from '@/hooks/useMobile';

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
  const { data: messages = [] } = usePortalMessagesQuery();
  const { data: providers = [] } = useServiceProvidersQuery();

  const [input, setInput] = useState('');
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeMessages = messages.filter((m) => m.providerId === activeProvider);
  const activeProviderData = providers.find((provider) => provider.id === activeProvider);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

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
    const providerMsgs = messages.filter((message) => message.providerId === providerId);
    return providerMsgs[providerMsgs.length - 1];
  };

  const showList = !activeProvider || !isMobile;
  const showChat = Boolean(activeProvider);

  return (
    <div className='flex h-[calc(100vh-10rem)] flex-col space-y-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className='text-2xl font-bold'>Messages</h1>
        <p className='text-muted-foreground'>Chat with your service providers</p>
      </motion.div>

      <div className='flex flex-1 gap-4 overflow-hidden'>
        <AnimatePresence mode='wait'>
          {showList && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`overflow-hidden rounded-xl border border-border bg-card ${
                isMobile ? 'w-full' : 'w-80 shrink-0'
              } flex flex-col`}
            >
              <div className='border-b border-border p-3'>
                <h2 className='text-sm font-semibold text-muted-foreground'>Conversations</h2>
              </div>
              <div className='flex-1 overflow-y-auto'>
                {providers.map((provider, i) => {
                  const lastMsg = getLastMessage(provider.id);
                  const isActive = activeProvider === provider.id;
                  return (
                    <motion.button
                      key={provider.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      onClick={() => setActiveProvider(provider.id)}
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
                })}
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
                {isMobile && (
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
                <div>
                  <p className='text-sm font-semibold'>{activeProviderData?.businessName} Team</p>
                  <p className='text-[11px] text-muted-foreground'>{activeProviderData?.supportEmail}</p>
                </div>
              </div>

              <div className='flex-1 space-y-4 overflow-y-auto p-4'>
                {activeMessages.map((msg, i) => {
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
                      <div className={`max-w-[70%] space-y-1 ${isClient ? 'items-end text-right' : ''}`}>
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
                })}
                <div ref={bottomRef} />
              </div>

              <div className='flex items-center gap-2 border-t border-border p-3'>
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

        {!activeProvider && !isMobile && (
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
