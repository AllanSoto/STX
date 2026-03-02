
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
import { Maximize, Minimize } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';


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
  const [showRsi6, setShowRsi6] = useState(false);
  const [showRsi14, setShowRsi14] = useState(false);
  const [showRsi24, setShowRsi24] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const [tickerData, setTickerData] = useState<{ high: string, low: string } | null>(null);
  const [isTickerLoading, setIsTickerLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !symbol) {
        setTickerData(null);
        return;
    }
    const binanceSymbol = COIN_DATA[symbol]?.binanceSymbol;
    if (!binanceSymbol) return;

    const fetch24hTicker = async () => {
        setIsTickerLoading(true);
        try {
            const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
            if (!response.ok) throw new Error('Failed to fetch 24h ticker data');
            const data = await response.json();
            setTickerData({ high: data.highPrice, low: data.lowPrice });
        } catch (error) {
            console.error('Error fetching 24h ticker:', error);
            toast({
                title: 'Error',
                description: 'Could not load 24h High/Low prices.',
                variant: 'destructive',
            });
        } finally {
            setIsTickerLoading(false);
        }
    };
    fetch24hTicker();
  }, [isOpen, symbol, toast]);

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

    ws.onerror = (event: Event) => {
        console.error("Chart WebSocket error event:", event);
        toast({
            title: 'WebSocket Error',
            description: `Live chart connection failed. Event type: ${event.type}.`,
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

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const handleToggleFullScreen = () => {
    const element = dialogContentRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err) => {
        toast({
          title: 'Error',
          description: `Could not enter full-screen mode: ${err.message}`,
          variant: 'destructive',
        });
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        ref={dialogContentRef}
        className={cn(
            "max-w-4xl h-[80vh] flex flex-col p-4 sm:p-6 landscape:h-[95vh]",
            isFullScreen && "w-screen h-screen max-w-full m-0 rounded-none border-none"
        )}
      >
        <DialogHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start pr-12 sm:pr-8">
                <div>
                    {symbol && (
                        <div className="flex items-center gap-2">
                        <CryptoIcon symbol={symbol} className="h-7 w-7" />
                        <DialogTitle className="text-2xl">{symbol}/USDT Chart</DialogTitle>
                        </div>
                    )}
                    <DialogDescription>
                        Candlestick chart with live data and technical indicators.
                    </DialogDescription>
                </div>
                <div className='text-center sm:text-right text-xs text-muted-foreground pt-1 mt-2 sm:mt-0'>
                    {isTickerLoading ? (
                        <>
                            <Skeleton className="h-4 w-40 mb-1 mx-auto sm:mx-0 sm:ml-auto" />
                            <Skeleton className="h-4 w-40 mx-auto sm:mx-0 sm:ml-auto" />
                        </>
                    ) : tickerData ? (
                        <>
                            <div>24h High: {parseFloat(tickerData.high).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</div>
                            <div>24h Low: {parseFloat(tickerData.low).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</div>
                        </>
                    ) : null}
                </div>
            </div>
           <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-14"
            onClick={handleToggleFullScreen}
            title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            <span className="sr-only">Toggle Fullscreen</span>
          </Button>
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
            <CryptoChart 
                data={chartData} 
                showRsi6={showRsi6}
                showRsi14={showRsi14}
                showRsi24={showRsi24}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No chart data available.</p>
            </div>
          )}
        </div>
        <DialogFooter className="mt-2 pt-4 border-t flex-wrap sm:justify-start gap-x-6 gap-y-2">
            <div className="flex items-center space-x-2">
                <Switch id="rsi-6-switch" checked={showRsi6} onCheckedChange={setShowRsi6} />
                <Label htmlFor="rsi-6-switch">RSI (6)</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="rsi-14-switch" checked={showRsi14} onCheckedChange={setShowRsi14} />
                <Label htmlFor="rsi-14-switch">RSI (14)</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="rsi-24-switch" checked={showRsi24} onCheckedChange={setShowRsi24} />
                <Label htmlFor="rsi-24-switch">RSI (24)</Label>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

