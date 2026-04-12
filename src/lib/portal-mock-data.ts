// Client Portal Mock Data

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
  format: 'pdf' | 'doc' | 'xlsx' | 'png';
  filesize: string;
  generatedDate: string;
}

export interface PortalContract {
  id: string;
  name: string;
  dateSent: string;
  amount: number;
  status: 'signed' | 'awaiting_signature';
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

export const portalInvoices: PortalInvoice[] = [
  {
    id: 'pi1',
    invoiceNumber: 'INV-001',
    issuedDate: '2026-03-01',
    dueDate: '2026-03-31',
    amount: 3500,
    status: 'paid',
  },
  {
    id: 'pi2',
    invoiceNumber: 'INV-002',
    issuedDate: '2026-03-15',
    dueDate: '2026-04-15',
    amount: 4500,
    status: 'unpaid',
  },
  {
    id: 'pi3',
    invoiceNumber: 'INV-003',
    issuedDate: '2026-02-20',
    dueDate: '2026-03-20',
    amount: 2200,
    status: 'partial',
  },
  {
    id: 'pi4',
    invoiceNumber: 'INV-004',
    issuedDate: '2026-01-10',
    dueDate: '2026-02-10',
    amount: 6000,
    status: 'paid',
  },
  {
    id: 'pi5',
    invoiceNumber: 'INV-005',
    issuedDate: '2026-04-01',
    dueDate: '2026-05-01',
    amount: 1800,
    status: 'unpaid',
  },
  {
    id: 'pi6',
    invoiceNumber: 'INV-006',
    issuedDate: '2026-03-25',
    dueDate: '2026-04-25',
    amount: 3200,
    status: 'paid',
  },
  {
    id: 'pi7',
    invoiceNumber: 'INV-007',
    issuedDate: '2026-04-05',
    dueDate: '2026-05-05',
    amount: 5500,
    status: 'unpaid',
  },
  {
    id: 'pi8',
    invoiceNumber: 'INV-008',
    issuedDate: '2026-02-01',
    dueDate: '2026-03-01',
    amount: 7800,
    status: 'paid',
  },
];

export const portalFiles: PortalFile[] = [
  {
    id: 'pf1',
    filename: 'Project_Proposal',
    format: 'pdf',
    filesize: '2.4 MB',
    generatedDate: '2026-03-14',
  },
  {
    id: 'pf2',
    filename: 'Service_Agreement',
    format: 'doc',
    filesize: '1.1 MB',
    generatedDate: '2026-03-15',
  },
  {
    id: 'pf3',
    filename: 'Brand_Guidelines',
    format: 'pdf',
    filesize: '5.2 MB',
    generatedDate: '2026-02-27',
  },
  {
    id: 'pf4',
    filename: 'Invoice_Summary_Q1',
    format: 'xlsx',
    filesize: '890 KB',
    generatedDate: '2026-04-01',
  },
  {
    id: 'pf5',
    filename: 'Logo_Final',
    format: 'png',
    filesize: '3.6 MB',
    generatedDate: '2026-03-20',
  },
  {
    id: 'pf6',
    filename: 'Migration_Plan',
    format: 'doc',
    filesize: '1.6 MB',
    generatedDate: '2026-04-01',
  },
  {
    id: 'pf7',
    filename: 'Security_Audit_Report',
    format: 'pdf',
    filesize: '4.1 MB',
    generatedDate: '2026-03-30',
  },
];

export const portalContracts: PortalContract[] = [
  {
    id: 'pc1',
    name: 'Web Redesign Contract',
    dateSent: '2026-03-14',
    amount: 8000,
    status: 'signed',
    content:
      "This Web Redesign Contract ('Agreement') is entered into between Servix Solutions ('Provider') and the Client.\n\n1. SCOPE OF WORK\nThe Provider agrees to redesign the Client's website including:\n- Complete UI/UX redesign\n- Mobile responsive implementation\n- Performance optimization\n- SEO best practices implementation\n\n2. TIMELINE\nThe project shall be completed within 8 weeks from the effective date.\n\n3. PAYMENT TERMS\nTotal project cost: $8,000\n- 50% upon signing\n- 25% at midpoint milestone\n- 25% upon completion\n\n4. REVISIONS\nUp to 3 rounds of revisions are included.\n\n5. OWNERSHIP\nAll deliverables become the property of the Client upon final payment.",
  },
  {
    id: 'pc2',
    name: 'App Development Agreement',
    dateSent: '2026-03-19',
    amount: 15000,
    status: 'awaiting_signature',
    content:
      "This App Development Agreement ('Agreement') is entered into between Servix Solutions ('Provider') and the Client.\n\n1. SCOPE OF WORK\nThe Provider agrees to develop a mobile application including:\n- iOS and Android native apps\n- Backend API development\n- User authentication system\n- Push notification integration\n- Admin dashboard\n\n2. TIMELINE\nThe project shall be completed within 16 weeks from the effective date.\n\n3. PAYMENT TERMS\nTotal project cost: $15,000\n- 30% upon signing\n- 30% at alpha release\n- 20% at beta release\n- 20% upon final delivery\n\n4. MAINTENANCE\n6 months of bug fixes included post-launch.\n\n5. CONFIDENTIALITY\nBoth parties agree to maintain confidentiality of proprietary information.",
  },
  {
    id: 'pc3',
    name: 'Branding Package Deal',
    dateSent: '2026-02-27',
    amount: 6500,
    status: 'signed',
    content:
      'This Branding Package Agreement is between Servix Solutions and the Client for comprehensive branding services.',
  },
  {
    id: 'pc4',
    name: 'Cloud Services Contract',
    dateSent: '2026-04-01',
    amount: 12000,
    status: 'awaiting_signature',
    content:
      "This Cloud Services Contract ('Agreement') is entered into between Servix Solutions ('Provider') and the Client.\n\n1. SERVICES\nThe Provider will deliver:\n- Cloud infrastructure setup (AWS/GCP)\n- Database migration\n- CI/CD pipeline configuration\n- Monitoring and alerting setup\n- Security hardening\n\n2. TIMELINE\n12 weeks from the effective date.\n\n3. PAYMENT\nTotal: $12,000\n- Monthly installments of $3,000\n\n4. SLA\n99.9% uptime guarantee with 24/7 monitoring.\n\n5. TERMINATION\nEither party may terminate with 30 days written notice.",
  },
  {
    id: 'pc5',
    name: 'Content Retainer',
    dateSent: '2026-04-07',
    amount: 3000,
    status: 'awaiting_signature',
    content:
      'This Content Retainer Agreement establishes an ongoing content creation relationship between Servix Solutions and the Client.\n\nMonthly deliverables include:\n- 8 blog posts\n- 20 social media posts\n- 2 email newsletters\n- 1 case study\n\nMonthly retainer fee: $3,000\nPayment due on the 1st of each month.',
  },
];

export const portalMessages: PortalMessage[] = [
  // Servix Solutions (sp1)
  {
    id: 'pm1',
    sender: 'business',
    senderName: 'Servix Solutions Team',
    content: "Hi! Welcome to your client portal. We're excited to work with you!",
    timestamp: new Date(Date.now() - 86400000 * 2),
    providerId: 'sp1',
  },
  {
    id: 'pm2',
    sender: 'client',
    senderName: 'You',
    content: "Thank you! I'm looking forward to getting started on the project.",
    timestamp: new Date(Date.now() - 86400000 * 2 + 3600000),
    providerId: 'sp1',
  },
  {
    id: 'pm3',
    sender: 'business',
    senderName: 'Servix Solutions Team',
    content:
      "We've sent over the project proposal and contract. Please review them at your earliest convenience.",
    timestamp: new Date(Date.now() - 86400000),
    providerId: 'sp1',
  },
  {
    id: 'pm4',
    sender: 'client',
    senderName: 'You',
    content: "I've reviewed the proposal. Looks great! I have a few questions about the timeline.",
    timestamp: new Date(Date.now() - 86400000 + 7200000),
    providerId: 'sp1',
  },
  {
    id: 'pm5',
    sender: 'business',
    senderName: 'Servix Solutions Team',
    content:
      'Of course! We can hop on a call tomorrow to discuss the timeline in detail. Does 2 PM work for you?',
    timestamp: new Date(Date.now() - 43200000),
    providerId: 'sp1',
  },
  {
    id: 'pm6',
    sender: 'client',
    senderName: 'You',
    content: '2 PM works perfectly. Talk to you then!',
    timestamp: new Date(Date.now() - 36000000),
    providerId: 'sp1',
  },
  {
    id: 'pm7',
    sender: 'business',
    senderName: 'Servix Solutions Team',
    content:
      "Great! Also, we've uploaded the brand guidelines document to your Files section. Please take a look.",
    timestamp: new Date(Date.now() - 7200000),
    providerId: 'sp1',
  },
  {
    id: 'pm8',
    sender: 'client',
    senderName: 'You',
    content: 'Will do. Thanks for the update!',
    timestamp: new Date(Date.now() - 3600000),
    providerId: 'sp1',
  },
  // CloudBase Technologies (sp2)
  {
    id: 'pm9',
    sender: 'business',
    senderName: 'CloudBase Technologies Team',
    content:
      "Hello! Your cloud infrastructure setup is underway. We'll keep you posted on progress.",
    timestamp: new Date(Date.now() - 86400000 * 3),
    providerId: 'sp2',
  },
  {
    id: 'pm10',
    sender: 'client',
    senderName: 'You',
    content: 'Awesome, thanks for the heads up. How long will the migration take?',
    timestamp: new Date(Date.now() - 86400000 * 3 + 1800000),
    providerId: 'sp2',
  },
  {
    id: 'pm11',
    sender: 'business',
    senderName: 'CloudBase Technologies Team',
    content:
      "We estimate about 2 weeks for the full migration. We'll do it in phases to minimize downtime.",
    timestamp: new Date(Date.now() - 86400000 * 2.5),
    providerId: 'sp2',
  },
  {
    id: 'pm12',
    sender: 'client',
    senderName: 'You',
    content: 'That sounds reasonable. Please keep me updated on each phase.',
    timestamp: new Date(Date.now() - 86400000 * 2),
    providerId: 'sp2',
  },
  {
    id: 'pm13',
    sender: 'business',
    senderName: 'CloudBase Technologies Team',
    content:
      'Phase 1 is complete — database migration is done. Starting CI/CD pipeline setup next.',
    timestamp: new Date(Date.now() - 86400000),
    providerId: 'sp2',
  },
  // DesignCraft Studio (sp3)
  {
    id: 'pm14',
    sender: 'business',
    senderName: 'DesignCraft Studio Team',
    content:
      "Hi there! We've started working on your branding package. Excited to share the first concepts!",
    timestamp: new Date(Date.now() - 86400000 * 4),
    providerId: 'sp3',
  },
  {
    id: 'pm15',
    sender: 'client',
    senderName: 'You',
    content: "Can't wait to see them! When will the first drafts be ready?",
    timestamp: new Date(Date.now() - 86400000 * 4 + 3600000),
    providerId: 'sp3',
  },
  {
    id: 'pm16',
    sender: 'business',
    senderName: 'DesignCraft Studio Team',
    content:
      "We'll have 3 logo concepts ready by end of this week. We'll upload them to your Files section.",
    timestamp: new Date(Date.now() - 86400000 * 3),
    providerId: 'sp3',
  },
  {
    id: 'pm17',
    sender: 'client',
    senderName: 'You',
    content: 'Perfect, looking forward to it!',
    timestamp: new Date(Date.now() - 86400000 * 2.5),
    providerId: 'sp3',
  },
];

export const serviceProviders: ServiceProvider[] = [
  {
    id: 'sp1',
    businessName: 'Servix Solutions',
    supportEmail: 'support@servix.com',
    phone: '+1 (555) 100-2000',
    address: '123 Innovation Drive, San Francisco, CA 94105',
  },
  {
    id: 'sp2',
    businessName: 'CloudBase Technologies',
    supportEmail: 'help@cloudbase.io',
    phone: '+1 (555) 200-3000',
    address: '456 Tech Park Blvd, Austin, TX 78701',
  },
  {
    id: 'sp3',
    businessName: 'DesignCraft Studio',
    supportEmail: 'hello@designcraft.co',
    phone: '+1 (555) 300-4000',
    address: '789 Creative Ave, New York, NY 10001',
  },
];

export const portalActivities: PortalActivity[] = [
  { id: 'pa1', description: 'New invoice INV-007 received', date: '2026-04-05', type: 'invoice' },
  { id: 'pa2', description: 'Payment of $3,000 confirmed', date: '2026-04-04', type: 'payment' },
  {
    id: 'pa3',
    description: "Contract 'Cloud Services' sent for signature",
    date: '2026-04-01',
    type: 'contract',
  },
  {
    id: 'pa4',
    description: "File 'Invoice_Summary_Q1.xlsx' uploaded",
    date: '2026-04-01',
    type: 'file',
  },
  {
    id: 'pa5',
    description: 'New message from Servix Solutions',
    date: '2026-03-31',
    type: 'message',
  },
  { id: 'pa6', description: 'Payment of $6,000 confirmed', date: '2026-03-28', type: 'payment' },
  { id: 'pa7', description: 'Invoice INV-006 marked as paid', date: '2026-03-25', type: 'invoice' },
  {
    id: 'pa8',
    description: "Contract 'Branding Package' signed",
    date: '2026-03-22',
    type: 'contract',
  },
  { id: 'pa9', description: "File 'Logo_Final.png' uploaded", date: '2026-03-20', type: 'file' },
  {
    id: 'pa10',
    description: 'Invoice INV-003 partially paid',
    date: '2026-03-18',
    type: 'invoice',
  },
];
