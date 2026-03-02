'use client';

import { useState, useEffect, useMemo } from 'react';
import type { CryptoSymbol } from '@/lib/constants';
import { COIN_DATA } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CryptoChart } from './crypto-chart';
import type { CandlestickData, Time } from 'lightweight-charts';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CryptoIcon } from '../shared/CryptoIcon';

interface CryptoChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: CryptoSymbol | null;
}

type KlineInterval = '15m' | '1h' | '4h' | '1d' | '1w';

const intervals: KlineInterval[] = ['15m', '1h', '4h', '1d', '1w'];

// Binance API returns: [open time, open, high, low, close, volume, close time, ...]
type BinanceKline = [number, string, string, string, string, string, number, ...any[]];

export function CryptoChartDialog({ isOpen, onClose, symbol }: CryptoChartDialogProps) {
  const [interval, setInterval] = useState<KlineInterval>('1d');
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !symbol) {
      setChartData([]);
      return;
    }

    const fetchKlineData = async () => {
      setIsLoading(true);
      setChartData([]);
      const binanceSymbol = COIN_DATA[symbol]?.binanceSymbol;
      if (!binanceSymbol) {
        console.error(`Binance symbol not found for ${symbol}`);
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=500`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch chart data from Binance.');
        }
        const data: BinanceKline[] = await response.json();
        
        const formattedData: CandlestickData<Time>[] = data.map(d => ({
            time: (d[0] / 1000) as Time, // lightweight-charts needs seconds
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
        }));

        setChartData(formattedData);
      } catch (error) {
        console.error('Error fetching kline data:', error);
        toast({
          title: 'Error',
          description: 'Could not load chart data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchKlineData();
  }, [isOpen, symbol, interval, toast]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[70vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          {symbol && (
            <div className="flex items-center gap-2">
              <CryptoIcon symbol={symbol} className="h-7 w-7" />
              <DialogTitle className="text-2xl">{symbol}/USDT Chart</DialogTitle>
            </div>
          )}
          <DialogDescription>
            Candlestick chart showing price movement over time.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={interval} onValueChange={(value) => setInterval(value as KlineInterval)} className="mt-2">
          <TabsList>
            {intervals.map(int => (
              <TabsTrigger key={int} value={int}>{int.toUpperCase()}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex-1 relative mt-4">
          {isLoading ? (
            <Skeleton className="absolute inset-0 w-full h-full" />
          ) : chartData.length > 0 ? (
            <CryptoChart data={chartData} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No chart data available.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
