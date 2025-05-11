
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartDataPoint } from './balance-client';
import { format } from 'date-fns';
import { enUS, es, fr, hi, zhCN } from 'date-fns/locale';
import type { LanguageCode } from '@/providers/language-provider';

interface BalanceChartProps {
  data: ChartDataPoint[];
  viewType: 'daily' | 'monthly';
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
  currentLanguage: LanguageCode;
}

const localeMap: Record<LanguageCode, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  hi: hi,
  zh: zhCN,
};

export function BalanceChart({ data, viewType, t, currentLanguage }: BalanceChartProps) {
  const locale = localeMap[currentLanguage] || enUS;

  const formatXAxisTick = (tickItem: string) => {
    if (viewType === 'daily') {
      return format(new Date(tickItem), 'MMM d', { locale });
    }
    // Monthly view, tickItem is 'yyyy-MM'
    return format(new Date(`${tickItem}-01`), 'MMM yyyy', { locale }); // Add day for Date object validity
  };
  
  const formatTooltipLabel = (label: string) => {
     if (viewType === 'daily') {
      return format(new Date(label), 'PPP', { locale });
    }
    return format(new Date(`${label}-01`), 'MMMM yyyy', { locale });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };


  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('balance.chart.title', 'Profit/Loss Over Time')}</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">{t('balance.chart.noData', 'No data available for the selected period.')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('balance.chart.title', 'Profit/Loss Over Time')}</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxisTick}
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
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
              }}
              labelFormatter={formatTooltipLabel}
              formatter={(value: number) => [formatCurrency(value), t('balance.chart.profit', 'Profit')]}
            />
            <Bar 
              dataKey="profit" 
              radius={[4, 4, 0, 0]}
              className="fill-primary"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
