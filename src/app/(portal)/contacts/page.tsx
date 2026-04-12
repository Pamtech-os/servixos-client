import type { Metadata } from 'next';
import PortalContacts from '@/views/PortalContacts';

export const metadata: Metadata = {
  title: 'Contacts',
  description: 'View contact details for all assigned service providers.',
};

export default function ContactsPage() {
  return <PortalContacts />;
}
