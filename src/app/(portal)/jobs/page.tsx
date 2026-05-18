import type { Metadata } from 'next';
import PortalJobs from '@/views/PortalJobs';

export const metadata: Metadata = {
  title: 'Jobs',
  description: 'View your jobs and leave reviews for completed work.',
};

export default function JobsPage() {
  return <PortalJobs />;
}
