'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getPortalActivities,
  getPortalContracts,
  getPortalFiles,
  getPortalInvoices,
  getPortalMessages,
  getServiceProviders,
} from '@/lib/api/portal-api';
import { queryKeys } from '@/lib/server-state/query-keys';

const STALE_TIME = 1000 * 60 * 5;

export const usePortalInvoicesQuery = () =>
  useQuery({
    queryKey: queryKeys.invoices,
    queryFn: getPortalInvoices,
    staleTime: STALE_TIME,
  });

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
