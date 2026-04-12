'use client';

import { memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const AppHeader = () => {
  const { auth } = useAuth();
  const initials = auth.userEmail ? auth.userEmail.substring(0, 2).toUpperCase() : 'CL';

  return (
    <header className='sticky top-14 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-card/95 px-3 py-2 backdrop-blur-sm sm:px-4 sm:py-3 lg:top-0 lg:px-6'>
      <div className='min-w-0 text-sm font-medium text-muted-foreground max-[380px]:text-xs'>
        Welcome back!
      </div>
      <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
        <div className='hidden text-right sm:block'>
          <p className='max-w-[14rem] truncate text-sm font-semibold'>{auth.userEmail || 'Client'}</p>
          <p className='text-xs text-muted-foreground'>Client Account</p>
        </div>
        <div className='flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-primary-foreground sm:h-10 sm:w-10'>
          {initials}
        </div>
      </div>
    </header>
  );
};

export default memo(AppHeader);
