'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getPortalDashboard,
  getPortalActivities,
  getPortalContracts,
  getPortalConversations,
  getPortalFiles,
  getPortalInvoices,
  getPortalMessages,
  getServiceProviders,
  type ClientInvoiceFilter,
} from '@/lib/api/portal-api';
import { queryKeys } from '@/lib/server-state/query-keys';

const STALE_TIME = 1000 * 60 * 5;

export const usePortalDashboardQuery = () =>
  useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getPortalDashboard,
    staleTime: STALE_TIME,
  });

export const usePortalInvoicesQuery = (filter?: ClientInvoiceFilter) => {
  // Normalize so an all-undefined filter hits the same cache slot as no filter,
  // allowing AppLayout's prefetch (base key) to be reused on initial load.
  const activeFilter =
    filter && Object.values(filter).some((v) => v !== undefined) ? filter : undefined;

  return useQuery({
    queryKey: activeFilter ? ([...queryKeys.invoices, activeFilter] as const) : queryKeys.invoices,
    queryFn: () => getPortalInvoices(activeFilter),
    staleTime: STALE_TIME,
  });
};

export const usePortalFilesQuery = () =>
  useQuery({
    queryKey: queryKeys.files,
    queryFn: getPortalFiles,
    staleTime: STALE_TIME,
  });

export const usePortalContractsQuery = () =>
  useQuery({
    queryKey: queryKeys.contracts,
    queryFn: getPortalContracts,
    staleTime: STALE_TIME,
  });

export const usePortalConversationsQuery = () =>
  useQuery({
    queryKey: queryKeys.conversations,
    queryFn: getPortalConversations,
    staleTime: STALE_TIME,
  });

export const usePortalMessagesQuery = () =>
  useQuery({
    queryKey: queryKeys.messages,
    queryFn: getPortalMessages,
    staleTime: STALE_TIME,
  });

export const useServiceProvidersQuery = () =>
  useQuery({
    queryKey: queryKeys.providers,
    queryFn: getServiceProviders,
    staleTime: STALE_TIME,
  });

export const usePortalActivitiesQuery = () =>
  useQuery({
    queryKey: queryKeys.activities,
    queryFn: getPortalActivities,
    staleTime: STALE_TIME,
  });
