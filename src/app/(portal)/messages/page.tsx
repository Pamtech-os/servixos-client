import type { Metadata } from 'next';
import PortalMessages from '@/views/PortalMessages';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Chat with service providers and keep project communication organized.',
};

export default function MessagesPage() {
  return <PortalMessages />;
}
