'use client';

import { type ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPortalActivities,
  getPortalContracts,
  getPortalFiles,
  getPortalInvoices,
  getPortalMessages,
  getServiceProviders,
} from '@/lib/api/portal-api';
import { queryKeys } from '@/lib/server-state/query-keys';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { auth, isHydrated } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated) return;
    if (!auth.isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`);
    }
  }, [auth.isLoggedIn, isHydrated, pathname, router]);

  useEffect(() => {
    if (!isHydrated || !auth.isLoggedIn) return;

    queryClient.prefetchQuery({ queryKey: queryKeys.invoices, queryFn: getPortalInvoices });
    queryClient.prefetchQuery({ queryKey: queryKeys.files, queryFn: getPortalFiles });
    queryClient.prefetchQuery({ queryKey: queryKeys.contracts, queryFn: getPortalContracts });
    queryClient.prefetchQuery({ queryKey: queryKeys.messages, queryFn: getPortalMessages });
    queryClient.prefetchQuery({ queryKey: queryKeys.providers, queryFn: getServiceProviders });
    queryClient.prefetchQuery({ queryKey: queryKeys.activities, queryFn: getPortalActivities });
  }, [auth.isLoggedIn, isHydrated, queryClient]);

  if (!isHydrated) {
    return <div className='min-h-screen bg-background' />;
  }

  if (!auth.isLoggedIn) {
    return null;
  }

  return (
    <div className='min-h-screen bg-background'>
      <AppSidebar />
      <div className='lg:ml-60'>
        <div className='pt-14 lg:pt-0'>
          <AppHeader />
          <main>
            <div className='container mx-auto p-3 sm:p-4 lg:p-6 2xl:p-8'>{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
