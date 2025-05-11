
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface BalanceSummaryCardsProps {
  totalInvested: number;
  totalRecovered: number;
  netResult: number;
  t: (key: string, fallback?: string) => string;
}

export function BalanceSummaryCards({
  totalInvested,
  totalRecovered,
  netResult,
  t,
}: BalanceSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('balance.summary.totalInvested', 'Total Invested')}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('balance.summary.totalRecovered', 'Total Recovered')}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRecovered)}</div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('balance.summary.netResult', 'Net Result')}</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  );
}
