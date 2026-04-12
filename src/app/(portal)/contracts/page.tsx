import type { Metadata } from 'next';
import PortalContracts from '@/views/PortalContracts';

export const metadata: Metadata = {
  title: 'Contracts',
  description: 'Review and sign pending agreements securely in your portal.',
};

export default function ContractsPage() {
  return <PortalContracts />;
}
