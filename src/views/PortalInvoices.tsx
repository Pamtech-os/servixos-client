'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  SortOrder,
  ClientInvoiceSortBy,
  type ClientInvoiceFilter,
} from '@/lib/api/portal-api';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  unpaid: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabel: Record<string, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
};

const STATUS_ALL = '__all__';
const SORT_NONE = '__none__';

const PortalInvoices = () => {
  const [filter, setFilter] = useState<ClientInvoiceFilter>({});
  const { data: invoices, isPending } = usePortalInvoicesQuery(filter);

  const invoiceRows = invoices ?? [];
  const isInitialLoading = isPending && !invoices;
  const hasActiveFilter = Object.values(filter).some((v) => v !== undefined);

  const set = <K extends keyof ClientInvoiceFilter>(key: K, value: ClientInvoiceFilter[K]) =>
    setFilter((prev) => ({ ...prev, [key]: value }));

  const toggleOrder = () =>
    setFilter((prev) => ({
      ...prev,
      order: prev.order === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC,
    }));

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
        transition={{ delay: 0.05, duration: 0.4 }}
        className='flex flex-wrap items-center gap-2'
      >
        <Select
          value={filter.status ?? STATUS_ALL}
          onValueChange={(v) =>
            set('status', v === STATUS_ALL ? undefined : (v as ClientInvoiceFilter['status']))
          }
        >
          <SelectTrigger className='w-40'>
            <SelectValue placeholder='All statuses' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
            <SelectItem value='paid'>Paid</SelectItem>
            <SelectItem value='partial'>Partial</SelectItem>
            <SelectItem value='unpaid'>Unpaid</SelectItem>
          </SelectContent>
        </Select>

        <DatePicker
          value={filter.from}
          onChange={(v) => set('from', v)}
          placeholder='From'
        />

        <DatePicker
          value={filter.to}
          onChange={(v) => set('to', v)}
          placeholder='To'
        />

        <Select
          value={filter.sort ?? SORT_NONE}
          onValueChange={(v) =>
            set('sort', v === SORT_NONE ? undefined : (v as ClientInvoiceSortBy))
          }
        >
          <SelectTrigger className='w-40'>
            <SelectValue placeholder='Sort by' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SORT_NONE}>Sort by</SelectItem>
            <SelectItem value={ClientInvoiceSortBy.ISSUED_DATE}>Issued Date</SelectItem>
            <SelectItem value={ClientInvoiceSortBy.DUE_DATE}>Due Date</SelectItem>
            <SelectItem value={ClientInvoiceSortBy.AMOUNT}>Amount</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant='outline'
          size='sm'
          disabled={!filter.sort}
          onClick={toggleOrder}
          className='min-w-20'
        >
          {filter.order === SortOrder.DESC ? '↓ DESC' : '↑ ASC'}
        </Button>

        {hasActiveFilter && (
          <Button variant='ghost' size='sm' onClick={() => setFilter({})}>
            Clear
          </Button>
        )}
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
                          {statusLabel[invoice.status]}
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
