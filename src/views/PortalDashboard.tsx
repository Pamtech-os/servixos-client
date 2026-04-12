'use client';

import { motion } from 'framer-motion';
import {
  DollarSign,
  CreditCard,
  ScrollText,
  FileText,
  MessageSquare,
  FolderOpen,
  Banknote,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  usePortalActivitiesQuery,
  usePortalContractsQuery,
  usePortalInvoicesQuery,
} from '@/lib/server-state/hooks';

const PortalDashboard = () => {
  const { data: invoices = [] } = usePortalInvoicesQuery();
  const { data: contracts = [] } = usePortalContractsQuery();
  const { data: activities = [] } = usePortalActivitiesQuery();

  const outstandingBalance = invoices
    .filter((invoice) => invoice.status !== 'paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const totalPaid = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const pendingContracts = contracts.filter((contract) => contract.status === 'awaiting_signature').length;

  const statCards = [
    {
      label: 'Outstanding Balance',
      value: `$${outstandingBalance.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Total Paid',
      value: `$${totalPaid.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Pending Contracts',
      value: pendingContracts.toString(),
      icon: ScrollText,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
  ];

  const activityIcons: Record<string, typeof FileText> = {
    invoice: Receipt,
    payment: Banknote,
    contract: ScrollText,
    file: FolderOpen,
    message: MessageSquare,
  };

  return (
    <div className='space-y-5 sm:space-y-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className='text-xl font-bold sm:text-2xl'>Dashboard</h1>
        <p className='text-sm text-muted-foreground sm:text-base'>Overview of your account</p>
      </motion.div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card className='border border-border'>
              <CardContent className='flex items-center gap-3 p-4 sm:gap-4 sm:p-6'>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${card.bg}`}
                >
                  <card.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs text-muted-foreground sm:text-sm'>{card.label}</p>
                  <p className='text-xl font-bold leading-tight [overflow-wrap:anywhere] sm:text-2xl'>
                    {card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {activities.slice(0, 10).map((activity, i) => {
                const Icon = activityIcons[activity.type] || FileText;
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                    className='flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 sm:items-center'
                  >
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                      <Icon className='h-4 w-4 text-primary' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium leading-snug sm:truncate'>
                        {activity.description}
                      </p>
                      <span className='mt-1 block text-xs text-muted-foreground sm:hidden'>
                        {activity.date}
                      </span>
                    </div>
                    <span className='hidden shrink-0 text-xs text-muted-foreground sm:block'>
                      {activity.date}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PortalDashboard;
