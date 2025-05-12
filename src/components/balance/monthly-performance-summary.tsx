// src/components/balance/monthly-performance-summary.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, MinusCircle, CalendarRange } from 'lucide-react';

interface MonthlyPerformanceSummaryProps {
  currentMonthNetProfit: number;
  previousMonthNetProfit: number;
  t: (key: string, fallback?: string) => string;
}

export function MonthlyPerformanceSummary({
  currentMonthNetProfit,
  previousMonthNetProfit,
  t,
}: MonthlyPerformanceSummaryProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  const monthlyChange = currentMonthNetProfit - previousMonthNetProfit;
  const monthlyChangePercentage = previousMonthNetProfit !== 0 
    ? (monthlyChange / Math.abs(previousMonthNetProfit)) * 100 
    : (currentMonthNetProfit !== 0 ? Infinity : 0); // Handle division by zero

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarRange className="mr-2 h-5 w-5 text-primary" />
          {t('balance.monthly.title', 'Monthly Performance')}
        </CardTitle>
        <CardDescription>{t('balance.monthly.description', 'Profit/Loss from orders this month vs last month.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">{t('balance.monthly.currentMonthNetProfit', "This Month's Net Profit (MTD)")}</p>
          <p className={`text-xl font-bold ${currentMonthNetProfit > 0 ? 'text-primary' : currentMonthNetProfit < 0 ? 'text-destructive' : ''}`}>
            {formatCurrency(currentMonthNetProfit)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t('balance.monthly.previousMonthNetProfit', "Last Month's Net Profit")}</p>
          <p className={`text-lg font-medium ${previousMonthNetProfit > 0 ? 'text-primary/80' : previousMonthNetProfit < 0 ? 'text-destructive/80' : 'text-muted-foreground'}`}>
            {formatCurrency(previousMonthNetProfit)}
          </p>
        </div>
        <div className="border-t pt-3">
          <p className="text-sm text-muted-foreground">{t('balance.monthly.changeVsLastMonth', "Change vs Last Month")}</p>
          <div className="flex items-center">
            {monthlyChange > 0 && <TrendingUp className="mr-1 h-4 w-4 text-primary" />}
            {monthlyChange < 0 && <TrendingDown className="mr-1 h-4 w-4 text-destructive" />}
            {monthlyChange === 0 && <MinusCircle className="mr-1 h-4 w-4 text-muted-foreground" />}
            <p className={`text-lg font-semibold ${monthlyChange > 0 ? 'text-primary' : monthlyChange < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatCurrency(monthlyChange)}
              {isFinite(monthlyChangePercentage) && previousMonthNetProfit !== 0 && (
                 <span className={`text-xs ml-1 ${monthlyChange > 0 ? 'text-primary/90' : monthlyChange < 0 ? 'text-destructive/90' : 'text-muted-foreground'}`}>
                  ({monthlyChangePercentage.toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
