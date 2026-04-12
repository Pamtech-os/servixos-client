export default function PortalLoading() {
  return (
    <div className='space-y-4 p-4 md:p-6 lg:p-8'>
      <div className='h-8 w-48 animate-pulse rounded bg-muted' />
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <div className='h-28 animate-pulse rounded-xl bg-muted' />
        <div className='h-28 animate-pulse rounded-xl bg-muted' />
        <div className='h-28 animate-pulse rounded-xl bg-muted' />
      </div>
      <div className='h-64 animate-pulse rounded-xl bg-muted' />
    </div>
  );
}
