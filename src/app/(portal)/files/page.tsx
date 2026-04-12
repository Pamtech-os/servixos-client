import type { Metadata } from 'next';
import PortalFiles from '@/views/PortalFiles';

export const metadata: Metadata = {
  title: 'Files',
  description: 'Access and download all files shared by your service providers.',
};

export default function FilesPage() {
  return <PortalFiles />;
}
