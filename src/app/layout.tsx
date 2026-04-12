import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/index.css';
import AppProviders from '@/providers/AppProviders';

export const metadata: Metadata = {
  metadataBase: new URL('https://servixos.com'),
  title: {
    default: 'ServixOS Client Portal',
    template: '%s | ServixOS Client Portal',
  },
  description:
    'Secure client portal for managing invoices, files, contracts, conversations, and provider contacts in one place.',
  applicationName: 'ServixOS Client Portal',
  keywords: [
    'client portal',
    'invoices',
    'contracts',
    'file sharing',
    'service provider dashboard',
  ],
  authors: [{ name: 'ServixOS' }],
  category: 'business',
  openGraph: {
    type: 'website',
    title: 'ServixOS Client Portal',
    description:
      'Manage billing, agreements, shared files, and service provider communications in one optimized portal.',
    siteName: 'ServixOS Client Portal',
    url: 'https://servixos.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ServixOS Client Portal',
    description:
      'Manage billing, agreements, files, and communications in one place with ServixOS Client Portal.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://servixos.com',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1120' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className='font-body antialiased' suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
