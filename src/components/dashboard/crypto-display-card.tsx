
'use client';

import type { CryptoCardData } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendArrow } from '@/components/shared/TrendArrow';
import { CryptoIcon } from '@/components/shared/CryptoIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';

interface CryptoDisplayCardProps {
  data: CryptoCardData;
  isLoading: boolean; // True if initial price for this card is still loading
  isAiTrendLoading: boolean; // True if AI trend for this card is loading
  onSetAlertClick: (symbol: CryptoCardData['symbol'], currentPrice: number) => void; // Callback to open alert modal
}

export function CryptoDisplayCard({ data, isLoading, isAiTrendLoading, onSetAlertClick }: CryptoDisplayCardProps) {
  const { symbol, value, previousValue, trendAnalysis } = data;
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

  if (isLoading) { // Show skeleton if initial price is loading
    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-16" /> 
          <Skeleton className="h-6 w-6 rounded-full" /> 
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-1" /> 
          <Skeleton className="h-4 w-24" /> 
        </CardContent>
      </Card>
    );
  }


  const getTrendText = () => {
    if (!trendAnalysis) return t('dashboard.cryptoCard.trend.notAvailable', 'Trend N/A');
    switch (trendAnalysis.trend) {
      case 'upward':
        return t('dashboard.cryptoCard.trend.upward', 'Upward trend');
      case 'downward':
        return t('dashboard.cryptoCard.trend.downward', 'Downward trend');
      case 'sideways':
        return t('dashboard.cryptoCard.trend.sideways', 'Sideways trend');
      default:
        return t('dashboard.cryptoCard.trend.notAvailable', 'Trend N/A');
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center">
           <CryptoIcon symbol={symbol} className="mr-2" />
          <CardTitle className="text-sm font-medium">
            {symbol}
          </CardTitle>
        </div>
        {isAiTrendLoading ? (
            <Skeleton className="h-5 w-5 rounded-full" />
        ): trendAnalysis ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <TrendArrow trend={trendAnalysis.trend} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard.cryptoCard.tooltip.reason', 'Reason:')} {trendAnalysis.reason}</p>
                <p>{t('dashboard.cryptoCard.tooltip.confidence', 'Confidence:')} {(trendAnalysis.confidence * 100).toFixed(0)}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <div className="h-5 w-5"></div> /* Placeholder to maintain layout if no trend */ }
      </CardHeader>
      <CardContent className="flex-grow">
        <div className={`text-2xl font-bold ${priceChangeClass}`}>
          ${value.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: value < 1 ? 5 : 2 
          })}
        </div>
        {isAiTrendLoading ? ( 
            <Skeleton className="h-4 w-20 mt-1" />
        ) : (
            <p className={`text-xs ${trendAnalysis && trendAnalysis.trend === 'upward' ? 'text-primary' : trendAnalysis && trendAnalysis.trend === 'downward' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {getTrendText()}
            </p>
        )}
      </CardContent>
      <div className="p-4 pt-0">
        <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onSetAlertClick(symbol, value)}
            disabled={value === 0}
            title={t('dashboard.cryptoCard.alertButton.title', 'Set Price Alert')}
          >
            <Bell className="mr-2 h-4 w-4" />
            {t('dashboard.cryptoCard.alertButton.label', 'Set Alert')}
        </Button>
      </div>
    </Card>
  );
}

    
