import { Metadata } from 'next';
import SchedulerClient from './SchedulerClient';
import { Suspense } from 'react';
import Skeleton from '@/components/Skeleton';

export const metadata: Metadata = {
  title: 'Scheduler',
};

function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function SchedulerPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SchedulerClient />
    </Suspense>
  );
}
