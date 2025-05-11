// src/components/balance/MonthlyBalanceDisplay.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import type { PortfolioSnapshot } from '@/lib/types';
import type { LanguageCode } from '@/providers/language-provider';
import { enUS, es, fr, hi, zhCN } from 'date-fns/locale';

interface MonthlyBalanceDisplayProps {
  currentMonthSnapshots: PortfolioSnapshot[];
  firstDayOfMonthSnapshot: PortfolioSnapshot | null;
  latestSnapshotInMonth: PortfolioSnapshot | null;
  isLoading: boolean;
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
  currentLanguage: LanguageCode;
}

const localeMap: Record<LanguageCode, Locale> = {
  en: enUS, es: es, fr: fr, hi: hi, zh: zhCN,
};

export function MonthlyBalanceDisplay({
  currentMonthSnapshots,
  firstDayOfMonthSnapshot,
  latestSnapshotInMonth,
  isLoading,
  t,
  currentLanguage,
}: MonthlyBalanceDisplayProps) {
  const locale = localeMap[currentLanguage] || enUS;
  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle>{t('balance.monthly.title', 'Monthly Portfolio Change')}</CardTitle>
          <CardDescription>{t('balance.monthly.description', 'Current Month Performance')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (currentMonthSnapshots.length === 0 && !firstDayOfMonthSnapshot) {
     return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle>{t('balance.monthly.title', 'Monthly Portfolio Change')}</CardTitle>
          <CardDescription>{t('balance.monthly.description', 'Current Month Performance')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('balance.monthly.noData', 'No monthly snapshot data available yet.')}</p>
        </CardContent>
      </Card>
    );
  }

  const latestValue = latestSnapshotInMonth?.valueUSDT ?? 0;
  const startOfMonthValue = firstDayOfMonthSnapshot?.valueUSDT ?? 0;
  const change = latestValue - startOfMonthValue;
  const percentageChange = startOfMonthValue !== 0 ? (change / startOfMonthValue) * 100 : 0;

  let ChangeIcon = Minus;
  let changeColor = 'text-muted-foreground';
  if (change > 0) {
    ChangeIcon = TrendingUp;
    changeColor = 'text-primary';
  } else if (change < 0) {
    ChangeIcon = TrendingDown;
    changeColor = 'text-destructive';
  }
  
  const chartData = currentMonthSnapshots.map(snapshot => ({
    name: format(snapshot.date, 'MMM d', { locale }), // x-axis label for chart
    value: snapshot.valueUSDT,
    fullDate: format(snapshot.date, 'PPP', { locale }), // For tooltip
  })).sort((a,b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());


  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle>{t('balance.monthly.title', 'Monthly Portfolio Change')}</CardTitle>
        <CardDescription>{t('balance.monthly.description', 'Current Month Performance')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{formatCurrency(latestValue)}</div>
        <div className={`flex items-center text-sm ${changeColor}`}>
          <ChangeIcon className="mr-1 h-4 w-4" />
          <span>{formatCurrency(change)} ({percentageChange.toFixed(2)}%)</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('balance.monthly.startValue', 'Start of month: {value}', { value: formatCurrency(startOfMonthValue) })}
        </p>

        {chartData.length > 0 ? (
          <div className="h-[300px] mt-6 pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  labelFormatter={(label, payload) => payload?.[0]?.payload.fullDate || label}
                  formatter={(value: number) => [formatCurrency(value), t('balance.monthly.chart.value', 'Value')]}
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  className="fill-primary"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10">{t('balance.monthly.noChartData', 'Not enough data for monthly chart.')}</p>
        )}
      </CardContent>
    </Card>
  );
}
