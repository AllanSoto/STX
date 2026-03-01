// src/components/dashboard/crypto-display-card.tsx
'use client';

import { useEffect, useState } from 'react';
import type { CryptoCardData } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CryptoIcon } from '@/components/shared/CryptoIcon';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { BellPlus } from 'lucide-react';

interface CryptoDisplayCardProps {
  data: CryptoCardData;
  isLoading: boolean;
  onSetAlertClick: () => void;
}

export function CryptoDisplayCard({ data, isLoading, onSetAlertClick }: CryptoDisplayCardProps) {
  const { symbol, value, previousValue } = data;
  const [priceChangeClass, setPriceChangeClass] = useState('');
  const { translations } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  useEffect(() => {
    if (previousValue !== undefined && previousValue !== 0 && value !== 0) {
      if (value > previousValue) {
        setPriceChangeClass('text-primary');
      } else if (value < previousValue) {
        setPriceChangeClass('text-destructive');
      } else {
        setPriceChangeClass('');
      }
    } else {
      setPriceChangeClass('');
    }
  }, [value, previousValue]);

  if (isLoading) {
    return (
      <Card className="shadow-lg min-h-[150px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </CardHeader>
        <CardContent className="flex-grow">
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
        <CardFooter className="p-2 pt-0 mt-auto">
          <Skeleton className="h-8 w-full" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between min-h-[150px]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center">
           <CryptoIcon symbol={symbol} className="mr-2" />
          <CardTitle className="text-sm font-medium">
            {symbol}
          </CardTitle>
        </div>
        <div className="h-5 w-5"></div> 
      </CardHeader>
      <CardContent className="flex-grow">
        <div className={`text-2xl font-bold ${priceChangeClass}`}>
          ${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: value < 1 ? 5 : 2
          })}
        </div>
        <p className="text-xs mt-1 text-muted-foreground invisible">
          {t('dashboard.cryptoCard.trend.notAvailable', 'Trend N/A')}
        </p>
      </CardContent>
      <CardFooter className="p-2 pt-0 mt-auto">
        <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={onSetAlertClick}
            title={t('dashboard.cryptoCard.alertButton.title', 'Set Price Alert')}
        >
          <BellPlus className="mr-2 h-4 w-4" />
          {t('dashboard.cryptoCard.alertButton.label', 'Set Alert')}
        </Button>
      </CardFooter>
    </Card>
  );
}
