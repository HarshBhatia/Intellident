import { Metadata } from 'next';
import EarningsClient from './EarningsClient';

export const metadata: Metadata = {
  title: 'Earnings',
};

export default function EarningsPage() {
  return <EarningsClient />;
}
