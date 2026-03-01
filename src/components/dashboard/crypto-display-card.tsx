'use client';

import { useEffect, useState } from 'react';
import type { CryptoCardData } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CryptoIcon } from '@/components/shared/CryptoIcon';
import { useLanguage } from '@/hooks/use-language';
import type { CryptoSymbol } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CryptoDisplayCardProps {
  data: CryptoCardData;
  isLoading: boolean;
  onRemove: (symbol: CryptoSymbol) => void;
}

export function CryptoDisplayCard({ data, isLoading, onRemove }: CryptoDisplayCardProps) {
  const { symbol, value, previousValue, priceChangePercent24h } = data;
  const [priceChangeClass, setPriceChangeClass] = useState('');
  const { t } = useLanguage();

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
      </Card>
    );
  }

  const isPositiveChange = priceChangePercent24h >= 0;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between min-h-[150px] relative group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={() => onRemove(symbol)}
        aria-label={t('dashboard.cryptoCard.removeAriaLabel', 'Remove {symbol}', { symbol })}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pr-8">
        <div className="flex items-center">
           <CryptoIcon symbol={symbol} className="mr-2" />
          <CardTitle className="text-sm font-medium">
            {symbol}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className={`text-2xl font-bold ${priceChangeClass}`}>
          ${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: value < 1 ? 10 : 2
          })}
        </div>
        <p className={`text-sm font-medium ${isPositiveChange ? 'text-primary' : 'text-destructive'}`}>
          {isPositiveChange ? '+' : ''}{priceChangePercent24h.toFixed(2)}% (24h)
        </p>
      </CardContent>
    </Card>
  );
}
