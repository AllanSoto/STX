
'use client';

import type { CryptoCardData } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendArrow } from '@/components/shared/TrendArrow';
import { CryptoIcon } from '@/components/shared/CryptoIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';

interface CryptoDisplayCardProps {
  data: CryptoCardData;
  isLoading: boolean; // True if (value is 0) OR (AI is globally loading AND this card's trend is not yet available)
}

export function CryptoDisplayCard({ data, isLoading }: CryptoDisplayCardProps) {
  const { symbol, value, previousValue, trendAnalysis } = data;
  const [priceChangeClass, setPriceChangeClass] = useState('');

  useEffect(() => {
    // Only apply color if previousValue is meaningful (not 0 or undefined) and value is also not 0.
    if (previousValue && previousValue !== 0 && value !== 0) {
      if (value > previousValue) {
        setPriceChangeClass('text-primary'); // Green for increase
      } else if (value < previousValue) {
        setPriceChangeClass('text-destructive'); // Red for decrease
      } else {
        setPriceChangeClass(''); // Neutral (no change)
      }
    } else {
      setPriceChangeClass(''); // No color if previous value is not set or current value is 0
    }
  }, [value, previousValue]);

  // If value is 0, it means price data hasn't arrived yet, show full card skeleton.
  if (value === 0 && isLoading) { 
    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-16" /> {/* Symbol */}
          <Skeleton className="h-6 w-6 rounded-full" /> {/* Icon */}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-1" /> {/* Value */}
          <Skeleton className="h-4 w-24" /> {/* Trend text */}
        </CardContent>
      </Card>
    );
  }

  // Determine if only the trend part is loading
  const isTrendLoading = isLoading && !trendAnalysis && value !== 0;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
           <CryptoIcon symbol={symbol} className="mr-2" />
          {symbol}
        </CardTitle>
        {trendAnalysis && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <TrendArrow trend={trendAnalysis.trend} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Reason: {trendAnalysis.reason}</p>
                <p>Confidence: {(trendAnalysis.confidence * 100).toFixed(0)}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {/* Show skeleton for trend arrow if trend is loading */}
        {isTrendLoading && !trendAnalysis && <Skeleton className="h-5 w-5 rounded-full" />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${priceChangeClass}`}>
          ${value.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: value < 1 ? 5 : 2 // More precision for small values
          })}
        </div>
        {trendAnalysis ? (
          <p className={`text-xs ${trendAnalysis.trend === 'upward' ? 'text-primary' : trendAnalysis.trend === 'downward' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {trendAnalysis.trend.charAt(0).toUpperCase() + trendAnalysis.trend.slice(1)} trend
          </p>
        ) : isTrendLoading ? ( // Show skeleton for trend text if AI is loading
            <Skeleton className="h-4 w-20 mt-1" />
        ) : (
            <p className="text-xs text-muted-foreground">Trend N/A</p>
        )}
      </CardContent>
    </Card>
  );
}
