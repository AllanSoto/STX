'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { CryptoDisplayCard } from '@/components/dashboard/crypto-display-card';
import { OrderOpportunitySimulator } from '@/components/dashboard/order-opportunity-simulator';
import type { CryptoCardData } from '@/components/dashboard/types';
import { initialCryptoData } from '@/components/dashboard/types';
import type { CryptoSymbol } from '@/lib/constants';
import { CRYPTO_SYMBOLS, COIN_DATA } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
const BINANCE_API_REST_BASE_URL = 'https://api.binance.com/api/v3';
const BINANCE_API_REFRESH_INTERVAL = 5000;

const binanceSymbolsForREST = CRYPTO_SYMBOLS.map(s => COIN_DATA[s]?.binanceSymbol).filter(Boolean) as string[];

const INITIAL_SYMBOLS_TO_DISPLAY: CryptoSymbol[] = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];

export default function DashboardPage() {
  const [cryptoData, setCryptoData] = useState<CryptoCardData[]>(initialCryptoData);
  const [isPricesLoading, setIsPricesLoading] = useState(true);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const { translations, language, hydrated: languageHydrated } = useLanguage();
  const { toast } = useToast();

  const [displayedSymbols, setDisplayedSymbols] = useState<CryptoSymbol[]>(INITIAL_SYMBOLS_TO_DISPLAY);
  const [symbolToAdd, setSymbolToAdd] = useState<CryptoSymbol | ''>('');

  const webSocketRef = useRef<WebSocket | null>(null);
  const binanceFallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cryptoDataRef = useRef<CryptoCardData[]>(initialCryptoData);

  useEffect(() => {
    cryptoDataRef.current = cryptoData;
  }, [cryptoData]);

  const t = useCallback((key: string, fallback?: string, vars?: Record<string, string | number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        if (typeof msg === 'string') {
            msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
        }
      });
    }
    return String(msg);
  }, [translations]);

  const fetchBinancePricesREST = useCallback(async (showToastOnError = true) => {
    if (binanceSymbolsForREST.length === 0) {
      console.warn("No symbols configured for Binance REST API fetch.");
      if (isPricesLoading) setIsPricesLoading(false);
      return;
    }
    try {
      const symbolsParam = encodeURIComponent(JSON.stringify(binanceSymbolsForREST));
      const url = `${BINANCE_API_REST_BASE_URL}/ticker/price?symbols=${symbolsParam}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Binance API error (REST):', errorData, 'Status:', response.status, 'URL:', url);
        throw new Error(t('dashboard.api.binance.fetchError', 'Failed to fetch prices from Binance: {status}', { status: response.statusText }));
      }
      const data: Array<{ symbol: string; price: string }> = await response.json();
      
      setCryptoData(prevData => {
        let pricesActuallyChanged = false;
        const updatedData = prevData.map(crypto => {
            const binanceSymbolInfo = COIN_DATA[crypto.symbol];
            if (!binanceSymbolInfo) return crypto;
            const binanceSymbol = binanceSymbolInfo.binanceSymbol;
            const priceData = data.find(d => d.symbol === binanceSymbol);
            if (priceData) {
                const newPrice = parseFloat(priceData.price);
                if (crypto.value !== newPrice) {
                    pricesActuallyChanged = true;
                    return {
                        ...crypto,
                        previousValue: crypto.value !== 0 ? crypto.value : newPrice,
                        value: newPrice,
                    };
                }
            }
            return crypto;
        });

        if (pricesActuallyChanged) {
            if (isPricesLoading) setIsPricesLoading(false);
            return updatedData;
        }
        if (isPricesLoading) setIsPricesLoading(false);
        return prevData; 
      });
      if (isPricesLoading && data.length === 0 && binanceSymbolsForREST.length > 0) {
        setIsPricesLoading(false); 
      }

    } catch (error) {
      console.error('Error fetching Binance prices (REST):', error);
      if (showToastOnError) {
        toast({
          title: t('dashboard.api.binance.errorTitle', 'Price Fetch Error (Binance)'),
          description: error instanceof Error ? error.message : t('dashboard.api.binance.unknownError', 'Could not fetch live prices from Binance.'),
          variant: "destructive",
        });
      }
      if (isPricesLoading) setIsPricesLoading(false);
    }
  }, [t, toast, isPricesLoading]); 

  const startBinanceRestFallback = useCallback(() => {
    if (binanceFallbackIntervalRef.current) clearInterval(binanceFallbackIntervalRef.current);
    fetchBinancePricesREST(); 
    binanceFallbackIntervalRef.current = setInterval(() => fetchBinancePricesREST(false), BINANCE_API_REFRESH_INTERVAL);
    console.log('Started Binance REST fallback interval.');
  }, [fetchBinancePricesREST]);

  const connectWebSocket = useCallback(() => {
    if (webSocketRef.current && (webSocketRef.current.readyState === WebSocket.OPEN || webSocketRef.current.readyState === WebSocket.CONNECTING)) {
      return; 
    }
    if (webSocketRef.current) {
        webSocketRef.current.onopen = null;
        webSocketRef.current.onmessage = null;
        webSocketRef.current.onerror = null;
        webSocketRef.current.onclose = null;
        webSocketRef.current.close();
        webSocketRef.current = null;
    }

    console.log(`Attempting to connect to Binance WebSocket: ${BINANCE_WS_URL}`);
    const ws = new WebSocket(BINANCE_WS_URL);
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log('Binance WebSocket connected.');
      setIsWebSocketConnected(true);
      if (isPricesLoading) setIsPricesLoading(false); 
      if (binanceFallbackIntervalRef.current) {
        clearInterval(binanceFallbackIntervalRef.current);
        binanceFallbackIntervalRef.current = null;
        console.log('Cleared Binance REST fallback interval as WebSocket connected.');
      }
    };

    ws.onmessage = (event) => {
      try {
        const messageArray = JSON.parse(event.data as string) as Array<{ e: string; E: number; s: string; c: string; }>;
        
        setCryptoData(prevData => {
          let changed = false;
          const newData = prevData.map(cd => {
            const binanceSymbolInfo = COIN_DATA[cd.symbol];
            if (!binanceSymbolInfo) return cd;
            const binanceTicker = binanceSymbolInfo.binanceSymbol;
            
            const tickerData = messageArray.find(item => item.s === binanceTicker);
            if (tickerData) {
              const newPrice = parseFloat(tickerData.c);
              if (cd.value !== newPrice) {
                changed = true;
                return { ...cd, previousValue: cd.value !== 0 ? cd.value : newPrice, value: newPrice };
              }
            }
            return cd;
          });
          if(changed) return newData;
          return prevData;
        });
      } catch (error) {
        console.error('Error processing Binance WebSocket message:', error, event.data);
      }
    };

    ws.onerror = (event: Event) => {
      console.error('Binance WebSocket error event:', event); 
      setIsWebSocketConnected(false);
      
      let errorDetailsMessage = t('dashboard.websocket.errorDescriptionBinance', 'Connection to Binance live price feed failed. Falling back to periodic updates.');
      if (event instanceof ErrorEvent && event.message) {
         errorDetailsMessage = t('dashboard.websocket.errorMessage', 'Error message: {message}, Type: {type}', {message: event.message, type: event.type});
      } else if (event.type) {
         errorDetailsMessage = t('dashboard.websocket.eventType', 'Event type: {type}', {type: event.type});
      }
      
      console.error(
        `Binance WebSocket detailed error: ${errorDetailsMessage}. WebSocket readyState: ${ws?.readyState}.`
      );
      
      toast({
        title: t('dashboard.websocket.errorTitle', 'WebSocket Error'),
        description: t('dashboard.websocket.errorDescriptionBinanceFallback', 'Binance WebSocket failed. Using REST fallback.'),
        variant: "warning",
      });

      if (webSocketRef.current) {
          webSocketRef.current.close(); 
          webSocketRef.current = null;
      }
      startBinanceRestFallback();
    };

    ws.onclose = (event: CloseEvent) => {
      console.log(`Binance WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}, Was Clean: ${event.wasClean}`);
      setIsWebSocketConnected(false);
      if (!event.wasClean && !binanceFallbackIntervalRef.current) { 
        console.log('Binance WebSocket closed unexpectedly, attempting to set up Binance REST fallback.');
        startBinanceRestFallback();
      }
    };
  }, [t, toast, startBinanceRestFallback, isPricesLoading]); 

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.onopen = null;
        webSocketRef.current.onmessage = null;
        webSocketRef.current.onerror = null;
        webSocketRef.current.onclose = null;
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      if (binanceFallbackIntervalRef.current) {
        clearInterval(binanceFallbackIntervalRef.current);
        binanceFallbackIntervalRef.current = null;
      }
    };
  }, [connectWebSocket]);

  const cryptoPricesForSimulator = useMemo(() => 
    cryptoData.reduce((acc, curr) => {
      if (curr.value !== 0) {
        acc[curr.symbol] = curr.value;
      }
      return acc;
    }, {} as Record<CryptoSymbol, number>),
  [cryptoData]);
  
  const filteredCryptoDataForDisplay = useMemo(() => {
    return displayedSymbols
        .map(symbol => cryptoData.find(cd => cd.symbol === symbol))
        .filter((data): data is CryptoCardData => data !== undefined);
  }, [cryptoData, displayedSymbols]);

  const availableSymbolsToAdd = useMemo(() => {
    return CRYPTO_SYMBOLS.filter(s => !displayedSymbols.includes(s));
  }, [displayedSymbols]);

  const handleAddSymbol = () => {
    if (symbolToAdd && !displayedSymbols.includes(symbolToAdd)) {
        setDisplayedSymbols(prevSymbols => [...prevSymbols, symbolToAdd]);
        setSymbolToAdd(''); // Reset selection
    }
  };

  const handleRemoveSymbol = (symbolToRemove: CryptoSymbol) => {
    setDisplayedSymbols(prevSymbols => prevSymbols.filter(symbol => symbol !== symbolToRemove));
  };


  if (!languageHydrated) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="mb-8">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('dashboard.title', 'Tablero')}</h1>
        
        {!isWebSocketConnected && !binanceFallbackIntervalRef.current && (
          <Card className="mb-8 bg-destructive/10 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">{t('dashboard.connectionStatus.title', 'Problema de Conexión')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive-foreground">
                {t('dashboard.connectionStatus.noFeed', 'Actualmente no se reciben actualizaciones de precios en vivo. Intentando conectar...')}
              </p>
            </CardContent>
          </Card>
        )}
         {!isWebSocketConnected && binanceFallbackIntervalRef.current && (
          <Card className="mb-8 bg-yellow-500/10 border-yellow-500/50">
            <CardHeader>
              <CardTitle className="text-yellow-600 dark:text-yellow-400">{t('dashboard.connectionStatus.fallbackTitle', 'Usando Conexión de Respaldo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 dark:text-yellow-300">
                {t('dashboard.connectionStatus.restFallbackActive', 'Falló la conexión WebSocket. Usando actualizaciones periódicas de API REST para precios.')}
              </p>
            </CardContent>
          </Card>
        )}

        <section className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 className="text-2xl font-semibold text-foreground mb-2 sm:mb-0">{t('dashboard.marketOverview', 'Resumen del Mercado')}</h2>
                {availableSymbolsToAdd.length > 0 && (
                    <div className="flex items-center gap-2">
                    <Select onValueChange={(value) => setSymbolToAdd(value as CryptoSymbol)} value={symbolToAdd}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={t('dashboard.addPairPlaceholder', 'Añadir Cripto')} />
                        </SelectTrigger>
                        <SelectContent>
                        {availableSymbolsToAdd.map(symbol => (
                            <SelectItem key={symbol} value={symbol}>
                            {symbol}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddSymbol} disabled={!symbolToAdd}>
                        {t('dashboard.addPairButton', 'Añadir')}
                    </Button>
                    </div>
                )}
            </div>

          {isPricesLoading && filteredCryptoDataForDisplay.every(c => c.value === 0) ? (
             <p>{t('dashboard.loadingPrices', 'Cargando precios en vivo...')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredCryptoDataForDisplay.map((data, i) => (
                <CryptoDisplayCard 
                  key={data.symbol || i} 
                  data={data} 
                  isLoading={isPricesLoading && data.value === 0}
                  onRemove={handleRemoveSymbol}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <OrderOpportunitySimulator cryptoPrices={cryptoPricesForSimulator} />
        </section>
      </div>
    </MainLayout>
  );
}
