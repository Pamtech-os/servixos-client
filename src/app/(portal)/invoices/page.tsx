import type { Metadata } from 'next';
import PortalInvoices from '@/views/PortalInvoices';

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'Track invoice status, due dates, and payment balances.',
};

export default function InvoicesPage() {
  return <PortalInvoices />;
}
