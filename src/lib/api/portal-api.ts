import {
  clientPortalApi,
  type ClientActivity,
  type ClientContract,
  type ClientConversation,
  type ClientConversationMessage,
  type ClientFile,
  type ClientInvoice,
} from '@/lib/api/client-api';

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'partial' | 'unpaid';
}

export interface PortalFile {
  id: string;
  filename: string;
  format: 'pdf' | 'doc' | 'docx' | 'xlsx' | 'png' | 'jpg';
  filesize: string;
  generatedDate: string;
}

export interface PortalContract {
  id: string;
  name: string;
  dateSent: string;
  amount: number;
  status: 'signed' | 'awaiting_signature' | 'expired' | 'cancelled';
  content: string;
}

export interface PortalMessage {
  id: string;
  sender: 'client' | 'business';
  senderName: string;
  content: string;
  timestamp: Date;
  providerId: string;
}

export interface PortalConversation {
  id: string;
  providerId: string;
  businessName: string;
  supportEmail: string;
  avatarInitials: string;
  lastMessageContent: string;
  lastMessageAt: Date | null;
  clientUnreadCount: number;
}

export interface ServiceProvider {
  id: string;
  businessName: string;
  supportEmail: string;
  phone: string;
  address: string;
}

export interface PortalActivity {
  id: string;
  description: string;
  date: string;
  type: 'invoice' | 'payment' | 'contract' | 'file' | 'message';
}

export interface PortalDashboardData {
  outstandingBalance: number;
  totalPaid: number;
  pendingContracts: number;
  activities: PortalActivity[];
}

export type PortalJob = Record<string, unknown>;

const fromMinorUnits = (amount: number): number => amount / 100;

const toDateLabel = (value: string | undefined): string => {
  if (!value) return '--';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';

  return parsed.toISOString().slice(0, 10);
};

const toActivityLabel = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const fixed = size >= 10 ? size.toFixed(0) : size.toFixed(1);
  return `${fixed} ${units[unitIndex]}`;
};

const defaultContractContent = (contractName: string) =>
  `${contractName}\n\nThe contract body was not returned in the list payload. Please contact your service provider for the detailed document.`;

const mapInvoice = (invoice: ClientInvoice): PortalInvoice => ({
  id: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  issuedDate: toDateLabel(invoice.issuedDate),
  dueDate: toDateLabel(invoice.dueDate),
  amount: fromMinorUnits(invoice.amount),
  status: invoice.status,
});

const mapContract = (contract: ClientContract): PortalContract => ({
  id: contract.id,
  name: contract.name,
  dateSent: toDateLabel(contract.dateSent),
  amount: fromMinorUnits(contract.amount),
  status: contract.status,
  content: contract.content?.trim() || defaultContractContent(contract.name),
});

const mapActivity = (activity: ClientActivity): PortalActivity => ({
  id: activity.id,
  description: activity.description,
  date: toActivityLabel(activity.date),
  type: activity.type,
});

const mapFile = (file: ClientFile): PortalFile => ({
  id: file.id,
  filename: file.filename,
  format: file.format,
  filesize: formatBytes(file.filesizeBytes),
  generatedDate: toDateLabel(file.generatedDate),
});

const mapConversationsToProviders = (conversations: ClientConversation[]): ServiceProvider[] => {
  const dedupe = new Map<string, ServiceProvider>();

  conversations.forEach((conversation) => {
    const provider = conversation.serviceProvider;
    const existing = dedupe.get(provider.id);

    if (existing) return;

    dedupe.set(provider.id, {
      id: provider.id,
      businessName: provider.businessName,
      supportEmail: provider.supportEmail ?? '',
      phone: '',
      address: '',
    });
  });

  return Array.from(dedupe.values());
};

const mapConversation = (conversation: ClientConversation): PortalConversation => {
  const lastMessageAt = conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : null;

  return {
    id: conversation.id,
    providerId: conversation.serviceProvider.id,
    businessName: conversation.serviceProvider.businessName,
    supportEmail: conversation.serviceProvider.supportEmail ?? '',
    avatarInitials: conversation.serviceProvider.avatarInitials,
    lastMessageContent: conversation.lastMessageContent,
    lastMessageAt:
      lastMessageAt && !Number.isNaN(lastMessageAt.getTime()) ? lastMessageAt : null,
    clientUnreadCount: conversation.clientUnreadCount,
  };
};

const mapConversationMessages = (
  providerId: string,
  messages: ClientConversationMessage[]
): PortalMessage[] => {
  return messages.map((message) => ({
    id: message.id,
    sender: message.sender,
    senderName: message.senderName,
    content: message.content ?? '',
    timestamp: new Date(message.createdAt),
    providerId,
  }));
};

export const getPortalDashboard = async (): Promise<PortalDashboardData> => {
  const dashboard = await clientPortalApi.getDashboard();

  return {
    outstandingBalance: fromMinorUnits(dashboard.outstandingBalance),
    totalPaid: fromMinorUnits(dashboard.totalPaid),
    pendingContracts: dashboard.pendingContractsCount,
    activities: dashboard.recentActivities.map(mapActivity),
  };
};

export const getPortalInvoices = async (): Promise<PortalInvoice[]> => {
  const invoices = await clientPortalApi.listInvoices();
  return invoices.map(mapInvoice);
};

export const getPortalJobs = async (): Promise<PortalJob[]> => {
  return clientPortalApi.listJobs();
};

export const getPortalFiles = async (): Promise<PortalFile[]> => {
  const files = await clientPortalApi.listFiles();
  return files.map(mapFile);
};

export const getPortalFileDownloadUrl = async (fileId: string): Promise<string> => {
  const data = await clientPortalApi.getFileDownloadUrl(fileId);
  return data.downloadUrl;
};

export const getPortalContracts = async (): Promise<PortalContract[]> => {
  const contracts = await clientPortalApi.listContracts();
  return contracts.map(mapContract);
};

export const signPortalContract = async (
  contractId: string,
  signatureData: string
): Promise<{ id: string; status: 'signed'; signedAt: string }> => {
  return clientPortalApi.signContract(contractId, signatureData);
};

export const getPortalConversations = async (): Promise<PortalConversation[]> => {
  const conversations = await clientPortalApi.listConversations();
  return conversations.map(mapConversation);
};

export const getPortalMessages = async (): Promise<PortalMessage[]> => {
  const conversations = await clientPortalApi.listConversations();

  const messageResults = await Promise.all(
    conversations.map(async (conversation) => {
      const rows = await clientPortalApi.listConversationMessages(conversation.serviceProvider.id);
      return mapConversationMessages(conversation.serviceProvider.id, rows);
    })
  );

  return messageResults.flat();
};

export const getServiceProviders = async (): Promise<ServiceProvider[]> => {
  try {
    const contacts = await clientPortalApi.listContacts();

    return contacts.map((contact) => ({
      id: contact.id,
      businessName: contact.businessName,
      supportEmail: contact.supportEmail ?? '',
      phone: contact.phone ?? '',
      address: contact.address ?? '',
    }));
  } catch {
    const conversations = await clientPortalApi.listConversations();
    return mapConversationsToProviders(conversations);
  }
};

export const getPortalActivities = async (): Promise<PortalActivity[]> => {
  const activities = await clientPortalApi.listActivities();
  return activities.map(mapActivity);
};

export const markConversationRead = async (providerId: string): Promise<void> => {
  await clientPortalApi.markConversationRead(providerId);
};
