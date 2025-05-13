// src/components/dashboard/crypto-display-card.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { CryptoCardData } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Added CardFooter
import { Skeleton } from '@/components/ui/skeleton';
import { TrendArrow } from '@/components/shared/TrendArrow';
import { CryptoIcon } from '@/components/shared/CryptoIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button'; // Import Button
import { BellPlus } from 'lucide-react'; // Import BellPlus icon for alert button

interface CryptoDisplayCardProps {
  data: CryptoCardData;
  isLoading: boolean;
  isAiTrendLoading: boolean;
  onSetAlertClick: () => void; // Add prop for alert click
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

  const getTranslatedBaseTrendText = () => {
    if (!trendAnalysis) return t('dashboard.cryptoCard.trend.notAvailable', 'Trend N/A');
    
    let trendText = '';
    switch (trendAnalysis.trend) {
      case 'upward':
        trendText = t('dashboard.cryptoCard.trend.upward', 'Upward trend');
        break;
      case 'downward':
        trendText = t('dashboard.cryptoCard.trend.downward', 'Downward trend');
        break;
      case 'sideways':
        trendText = t('dashboard.cryptoCard.trend.sideways', 'Sideways trend');
        break;
      default:
        trendText = t('dashboard.cryptoCard.trend.notAvailable', 'Trend N/A');
    }
    return trendText;
  };
  
  const trendTextColorClass = useMemo(() => {
    if (!trendAnalysis) return 'text-muted-foreground';
    switch (trendAnalysis.trend) {
      case 'upward': return 'text-primary';
      case 'downward': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  }, [trendAnalysis]);

  if (isLoading) {
    return (
      <Card className="shadow-lg min-h-[150px] flex flex-col"> {/* Adjusted min-height for button */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </CardHeader>
        <CardContent className="flex-grow">
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
        <CardFooter className="p-2 pt-0 mt-auto"> {/* Added CardFooter for button */}
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
        {isAiTrendLoading ? (
            <Skeleton className="h-5 w-5 rounded-full" />
        ): trendAnalysis ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="focus:outline-none" aria-label={t('dashboard.cryptoCard.trend.ariaLabel', 'Trend information')}>
                  <TrendArrow trend={trendAnalysis.trend} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="w-auto max-w-xs sm:max-w-sm md:max-w-md bg-background border-border shadow-lg rounded-md p-3">
                <p className="font-semibold mb-1 text-foreground">{getTranslatedBaseTrendText()}</p>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {t('dashboard.cryptoCard.tooltip.confidence', 'Confidence:')} {(trendAnalysis.confidence * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground whitespace-normal break-words">
                  {t('dashboard.cryptoCard.tooltip.reason', 'Reason:')} {trendAnalysis.reason}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <div className="h-5 w-5"></div> 
      }
      </CardHeader>
      <CardContent className="flex-grow">
        <div className={`text-2xl font-bold ${priceChangeClass}`}>
          ${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: value < 1 ? 5 : 2
          })}
        </div>
        {isAiTrendLoading ? (
            <Skeleton className="h-4 w-full max-w-[150px] mt-1" />
        ) : (
          <>
            {trendAnalysis ? (
              <p className={`text-xs mt-1 ${trendTextColorClass}`}>
                {getTranslatedBaseTrendText()}
                {trendAnalysis.confidence > 0 && ( 
                  <span className="ml-1 opacity-75">({(trendAnalysis.confidence * 100).toFixed(0)}%)</span>
                )}
              </p>
            ) : (
              <p className="text-xs mt-1 text-muted-foreground">
                {t('dashboard.cryptoCard.trend.notAvailable', 'Trend N/A')}
              </p>
            )}
          </>
        )}
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

