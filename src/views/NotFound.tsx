'use client';

import Link from 'next/link';

const NotFound = () => {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center'>
      <h1 className='text-4xl font-bold'>404</h1>
      <p className='text-muted-foreground'>Sorry, this page does not exist.</p>
      <Link href='/login' className='text-primary underline-offset-4 hover:underline'>
        Return to login
      </Link>
    </div>
  );
};

export default NotFound;
