// src/components/balance/DailyBalanceDisplay.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PortfolioSnapshot } from '@/lib/types';

interface DailyBalanceDisplayProps {
  todaySnapshot: PortfolioSnapshot | null;
  yesterdaySnapshot: PortfolioSnapshot | null;
  isLoading: boolean;
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
}

export function DailyBalanceDisplay({ todaySnapshot, yesterdaySnapshot, isLoading, t }: DailyBalanceDisplayProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('balance.daily.title', 'Daily Portfolio Change')}</CardTitle>
          <CardDescription>{t('balance.daily.description', 'Today vs Yesterday')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </CardContent>
      </Card>
    );
  }

  if (!todaySnapshot && !yesterdaySnapshot) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('balance.daily.title', 'Daily Portfolio Change')}</CardTitle>
           <CardDescription>{t('balance.daily.description', 'Today vs Yesterday')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('balance.daily.noData', 'No daily snapshot data available yet.')}</p>
        </CardContent>
      </Card>
    );
  }

  const todayValue = todaySnapshot?.valueUSDT ?? 0;
  const yesterdayValue = yesterdaySnapshot?.valueUSDT ?? 0;
  const change = todayValue - yesterdayValue;
  const percentageChange = yesterdayValue !== 0 ? (change / yesterdayValue) * 100 : 0;

  let ChangeIcon = Minus;
  let changeColor = 'text-muted-foreground';
  if (change > 0) {
    ChangeIcon = TrendingUp;
    changeColor = 'text-primary';
  } else if (change < 0) {
    ChangeIcon = TrendingDown;
    changeColor = 'text-destructive';
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('balance.daily.title', 'Daily Portfolio Change')}</CardTitle>
        <CardDescription>{t('balance.daily.description', 'Today vs Yesterday')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{formatCurrency(todayValue)}</div>
        <div className={`flex items-center text-sm ${changeColor}`}>
          <ChangeIcon className="mr-1 h-4 w-4" />
          <span>{formatCurrency(change)} ({percentageChange.toFixed(2)}%)</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('balance.daily.yesterdayValue', 'Yesterday: {value}', { value: formatCurrency(yesterdayValue) })}
        </p>
      </CardContent>
    </Card>
  );
}
