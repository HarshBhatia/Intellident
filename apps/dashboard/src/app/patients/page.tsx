import { Suspense } from 'react';
import PatientsClient from './PatientsClient';

export const dynamic = 'force-dynamic';

export default function PatientsPage() {
  return (
    <Suspense>
      <PatientsClient />
    </Suspense>
  );
}
