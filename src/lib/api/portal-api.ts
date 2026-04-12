import {
  portalActivities,
  portalContracts,
  portalFiles,
  portalInvoices,
  portalMessages,
  serviceProviders,
} from '@/lib/portal-mock-data';
import type {
  PortalActivity,
  PortalContract,
  PortalFile,
  PortalInvoice,
  PortalMessage,
  ServiceProvider,
} from '@/lib/portal-mock-data';

const cloneMessages = (messages: PortalMessage[]) =>
  messages.map((message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));

const cloneContracts = (contracts: PortalContract[]) => contracts.map((contract) => ({ ...contract }));
const cloneInvoices = (invoices: PortalInvoice[]) => invoices.map((invoice) => ({ ...invoice }));
const cloneFiles = (files: PortalFile[]) => files.map((file) => ({ ...file }));
const cloneProviders = (providers: ServiceProvider[]) => providers.map((provider) => ({ ...provider }));
const cloneActivities = (activities: PortalActivity[]) => activities.map((activity) => ({ ...activity }));

export const getPortalInvoices = async (): Promise<PortalInvoice[]> => {
  return cloneInvoices(portalInvoices);
};

export const getPortalFiles = async (): Promise<PortalFile[]> => {
  return cloneFiles(portalFiles);
};

export const getPortalContracts = async (): Promise<PortalContract[]> => {
  return cloneContracts(portalContracts);
};

export const getPortalMessages = async (): Promise<PortalMessage[]> => {
  return cloneMessages(portalMessages);
};

export const getServiceProviders = async (): Promise<ServiceProvider[]> => {
  return cloneProviders(serviceProviders);
};

export const getPortalActivities = async (): Promise<PortalActivity[]> => {
  return cloneActivities(portalActivities);
};
