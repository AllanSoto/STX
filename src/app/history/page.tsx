import type { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { OrderHistoryClient } from '@/components/history/order-history-client';

export const metadata: Metadata = {
  title: 'Order History - SimulTradex',
};

export default function HistoryPage() {
  return (
    <MainLayout>
      <OrderHistoryClient />
    </MainLayout>
  );
}
