import { Metadata } from 'next';
import EarningsClient from './EarningsClient';
import { Suspense } from 'react';
import Skeleton from '@/components/Skeleton';

export const metadata: Metadata = {
  title: 'Earnings',
};

function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function EarningsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EarningsClient />
    </Suspense>
  );
}
