
import type { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { BalanceClient } from '@/components/balance/balance-client';

export const metadata: Metadata = {
  title: 'Balance Overview - SimulTradex',
  // description will be set in BalanceClient using translations
};

export default function BalancePage() {
  return (
    <MainLayout>
      <BalanceClient />
    </MainLayout>
  );
}
