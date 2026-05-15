'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import ModernSpinner from '@/components/ModernSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePortalInvoicesQuery } from '@/lib/server-state/hooks';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  unpaid: 'bg-destructive/10 text-destructive border-destructive/20',
};

const PortalInvoices = () => {
  const { data: invoices, isPending } = usePortalInvoicesQuery();
  const invoiceRows = invoices ?? [];
  const isInitialLoading = isPending && !invoices;

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className='text-2xl font-bold'>Invoices</h1>
        <p className='text-muted-foreground'>View all your invoices</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-10'>
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        <ModernSpinner size='sm' color='primary' />
                        <span className='text-sm'>Loading invoices...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : invoiceRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-10 text-center text-muted-foreground'>
                      No invoices available yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoiceRows.map((invoice, i) => (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
                      className='border-b border-border transition-colors hover:bg-muted/50'
                    >
                      <TableCell className='font-medium'>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.issuedDate}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell className='text-right font-semibold'>
                        ${invoice.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className={statusStyles[invoice.status]}>
                          {invoice.status === 'unpaid'
                            ? 'Unpaid'
                            : invoice.status === 'partial'
                            ? 'Partial'
                            : 'Paid'}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PortalInvoices;
