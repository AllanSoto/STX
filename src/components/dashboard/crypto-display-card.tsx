'use client';

import type { CryptoCardData } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendArrow } from '@/components/shared/TrendArrow';
import { CryptoIcon } from '@/components/shared/CryptoIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CryptoDisplayCardProps {
  data: CryptoCardData;
  isLoading: boolean;
}

export function CryptoDisplayCard({ data, isLoading }: CryptoDisplayCardProps) {
  const { symbol, value, trendAnalysis } = data;

  if (isLoading) {
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
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {trendAnalysis && (
          <p className={`text-xs ${trendAnalysis.trend === 'upward' ? 'text-primary' : trendAnalysis.trend === 'downward' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {trendAnalysis.trend.charAt(0).toUpperCase() + trendAnalysis.trend.slice(1)} trend
          </p>
        )}
         {!trendAnalysis && <p className="text-xs text-muted-foreground">Trend N/A</p>}
      </CardContent>
    </Card>
  );
}
