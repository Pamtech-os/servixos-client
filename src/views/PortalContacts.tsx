'use client';

import { motion } from 'framer-motion';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useServiceProvidersQuery } from '@/lib/server-state/hooks';

const PortalContacts = () => {
  const { data: providers = [] } = useServiceProvidersQuery();

  return (
    <div className='space-y-5 sm:space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className='text-xl font-bold sm:text-2xl'>Contacts</h1>
        <p className='text-sm text-muted-foreground sm:text-base'>Your service providers</p>
      </motion.div>

      <div className='grid gap-4 sm:grid-cols-2 2xl:grid-cols-3'>
        {providers.map((provider, i) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card className='border border-border transition-shadow hover:shadow-lg'>
              <CardContent className='space-y-4 p-4 sm:p-5 lg:p-6'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-11 sm:w-11'>
                    <Building2 className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='min-w-0 truncate text-base font-semibold sm:text-lg'>
                    {provider.businessName}
                  </h3>
                </div>
                <div className='space-y-2.5 text-sm'>
                  <div className='flex items-center gap-2 text-muted-foreground'>
                    <Mail size={14} className='shrink-0' />
                    <span className='min-w-0 break-all'>{provider.supportEmail}</span>
                  </div>
                  <div className='flex items-center gap-2 text-muted-foreground'>
                    <Phone size={14} className='shrink-0' />
                    <span className='min-w-0'>{provider.phone}</span>
                  </div>
                  <div className='flex items-start gap-2 text-muted-foreground'>
                    <MapPin size={14} className='mt-0.5 shrink-0' />
                    <span className='min-w-0 break-words'>{provider.address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PortalContacts;
