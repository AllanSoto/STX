'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { CryptoSymbol } from '@/lib/constants';
import { COIN_DATA } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CryptoChart } from './crypto-chart';
import type { CandlestickData, Time } from 'lightweight-charts';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CryptoIcon } from '../shared/CryptoIcon';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CryptoChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: CryptoSymbol | null;
}

type KlineInterval = '1m' | '15m' | '1h' | '4h' | '1d' | '1w';

const intervals: KlineInterval[] = ['1m', '15m', '1h', '4h', '1d', '1w'];

// Binance API returns: [open time, open, high, low, close, volume, close time, ...]
type BinanceKline = [number, string, string, string, string, string, number, ...any[]];

// Binance WebSocket kline stream data structure
interface BinanceWsKline {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
}

export function CryptoChartDialog({ isOpen, onClose, symbol }: CryptoChartDialogProps) {
  const [interval, setInterval] = useState<KlineInterval>('1h');
  const [chartData, setChartData] = useState<CandlestickData<Time>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isOpen || !symbol) {
      setChartData([]);
      // Clean up WebSocket connection when dialog is closed or there's no symbol
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const binanceSymbol = COIN_DATA[symbol]?.binanceSymbol;
    if (!binanceSymbol) {
      console.error(`Binance symbol not found for ${symbol}`);
      return;
    }

    // Function to fetch historical data
    const fetchKlineData = async () => {
      setIsLoading(true);
      setChartData([]);
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=500`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch chart data from Binance.');
        }
        const data: BinanceKline[] = await response.json();
        
        const formattedData: CandlestickData<Time>[] = data.map(d => ({
            time: (d[0] / 1000) as Time,
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

    // Set up WebSocket connection for live updates
    if (wsRef.current) {
        wsRef.current.close();
    }
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${interval}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const kline: BinanceWsKline = message.k;

        const newCandle: CandlestickData<Time> = {
            time: (kline.t / 1000) as Time,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
        };

        setChartData(prevData => {
            if (prevData.length === 0) {
                return [newCandle];
            }
            const lastCandle = prevData[prevData.length - 1];
            if (newCandle.time === lastCandle.time) {
                // Update the last candle
                const newData = [...prevData];
                newData[newData.length - 1] = newCandle;
                return newData;
            } else {
                // Append new candle
                return [...prevData, newCandle];
            }
        });
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast({
            title: 'WebSocket Error',
            description: 'Live chart connection failed.',
            variant: 'destructive'
        })
    };

    // Cleanup on component unmount or dependency change
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };

  }, [isOpen, symbol, interval, toast]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          {symbol && (
            <div className="flex items-center gap-2">
              <CryptoIcon symbol={symbol} className="h-7 w-7" />
              <DialogTitle className="text-2xl">{symbol}/USDT Chart</DialogTitle>
            </div>
          )}
          <DialogDescription>
            Candlestick chart with live data and technical indicators.
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
            <CryptoChart data={chartData} showRSI={showRSI} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No chart data available.</p>
            </div>
          )}
        </div>
        <DialogFooter className="mt-2 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              id="rsi-switch"
              checked={showRSI}
              onCheckedChange={setShowRSI}
            />
            <Label htmlFor="rsi-switch">Show RSI (14)</Label>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
