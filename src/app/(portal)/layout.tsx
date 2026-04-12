import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AppLayout from '@/components/AppLayout';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
