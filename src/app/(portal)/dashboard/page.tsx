import type { Metadata } from 'next';
import PortalDashboard from '@/views/PortalDashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your invoices, contracts, and recent account activity.',
};

export default function DashboardPage() {
  return <PortalDashboard />;
}
