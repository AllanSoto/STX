// src/components/balance/filtered-period-summary-cards.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Landmark, PiggyBank } from 'lucide-react';

interface FilteredPeriodSummaryCardsProps {
  totalInvested: number;
  totalRecovered: number;
  netResult: number;
  t: (key: string, fallback?: string) => string;
}

export function FilteredPeriodSummaryCards({
  totalInvested,
  totalRecovered,
  netResult,
  t,
}: FilteredPeriodSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('balance.summary.totalInvested', 'Total Invested (Filtered Period)')}</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
           <p className="text-xs text-muted-foreground">
            {t('balance.summary.basedOnOrders', 'Based on orders in selected period')}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('balance.summary.totalRecovered', 'Total Recovered (Filtered Period)')}</CardTitle>
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRecovered)}</div>
           <p className="text-xs text-muted-foreground">
            {t('balance.summary.basedOnOrders', 'Based on orders in selected period')}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('balance.summary.netResult', 'Net Result (Filtered Period)')}</CardTitle>
          {netResult >= 0 ? (
            <TrendingUp className="h-4 w-4 text-primary" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netResult >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(netResult)}
          </div>
           <p className="text-xs text-muted-foreground">
            {t('balance.summary.profitOrLoss', 'Profit or loss from orders')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
