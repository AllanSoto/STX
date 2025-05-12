// src/components/balance/daily-performance-summary.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, MinusCircle, CalendarDays } from 'lucide-react';

interface DailyPerformanceSummaryProps {
  todayNetProfit: number;
  yesterdayNetProfit: number;
  t: (key: string, fallback?: string) => string;
}

export function DailyPerformanceSummary({
  todayNetProfit,
  yesterdayNetProfit,
  t,
}: DailyPerformanceSummaryProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  const dailyChange = todayNetProfit - yesterdayNetProfit;
  const dailyChangePercentage = yesterdayNetProfit !== 0 
    ? (dailyChange / Math.abs(yesterdayNetProfit)) * 100 
    : (todayNetProfit !== 0 ? Infinity : 0); // Handle division by zero

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarDays className="mr-2 h-5 w-5 text-primary" />
          {t('balance.daily.title', 'Daily Performance')}
        </CardTitle>
        <CardDescription>{t('balance.daily.description', 'Profit/Loss from orders compared to yesterday.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">{t('balance.daily.todayNetProfit', "Today's Net Profit")}</p>
          <p className={`text-xl font-bold ${todayNetProfit > 0 ? 'text-primary' : todayNetProfit < 0 ? 'text-destructive' : ''}`}>
            {formatCurrency(todayNetProfit)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t('balance.daily.yesterdayNetProfit', "Yesterday's Net Profit")}</p>
          <p className={`text-lg font-medium ${yesterdayNetProfit > 0 ? 'text-primary/80' : yesterdayNetProfit < 0 ? 'text-destructive/80' : 'text-muted-foreground'}`}>
            {formatCurrency(yesterdayNetProfit)}
          </p>
        </div>
        <div className="border-t pt-3">
          <p className="text-sm text-muted-foreground">{t('balance.daily.changeVsYesterday', "Change vs Yesterday")}</p>
          <div className="flex items-center">
            {dailyChange > 0 && <TrendingUp className="mr-1 h-4 w-4 text-primary" />}
            {dailyChange < 0 && <TrendingDown className="mr-1 h-4 w-4 text-destructive" />}
            {dailyChange === 0 && <MinusCircle className="mr-1 h-4 w-4 text-muted-foreground" />}
            <p className={`text-lg font-semibold ${dailyChange > 0 ? 'text-primary' : dailyChange < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatCurrency(dailyChange)}
              {isFinite(dailyChangePercentage) && yesterdayNetProfit !== 0 && (
                <span className={`text-xs ml-1 ${dailyChange > 0 ? 'text-primary/90' : dailyChange < 0 ? 'text-destructive/90' : 'text-muted-foreground'}`}>
                  ({dailyChangePercentage.toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
