// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { CryptoDisplayCard } from '@/components/dashboard/crypto-display-card';
import { OrderOpportunitySimulator } from '@/components/dashboard/order-opportunity-simulator';
import type { CryptoCardData } from '@/components/dashboard/types';
import { initialCryptoData } from '@/components/dashboard/types';
import { analyzeCryptoTrend } from '@/ai/flows/analyze-crypto-trends';
import type { CryptoSymbol } from '@/lib/constants';
import { CRYPTO_SYMBOLS, QUOTE_CURRENCY } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
const BINANCE_API_REST_BASE_URL = 'https://api.binance.com/api/v3';

const BINANCE_API_REFRESH_INTERVAL = 5000; // 5 seconds for Binance REST fallback
const AI_ANALYSIS_INITIAL_DELAY = 7000; // 7 seconds
const AI_ANALYSIS_INTERVAL = 60000 * 5; // 5 minutes for AI analysis

// Mapping for CoinGecko IDs (kept for potential future use, but not active), CoinCap IDs, and Binance Symbols
const COIN_MAPPINGS: Record<CryptoSymbol, { coingeckoId: string; coincapId: string; binanceSymbol: string }> = {
  BTC: { coingeckoId: 'bitcoin', coincapId: 'bitcoin', binanceSymbol: 'BTCUSDT' },
  ETH: { coingeckoId: 'ethereum', coincapId: 'ethereum', binanceSymbol: 'ETHUSDT' },
  SOL: { coingeckoId: 'solana', coincapId: 'solana', binanceSymbol: 'SOLUSDT' },
  BNB: { coingeckoId: 'binancecoin', coincapId: 'binance-coin', binanceSymbol: 'BNBUSDT' },
  XRP: { coingeckoId: 'ripple', coincapId: 'xrp', binanceSymbol: 'XRPUSDT' },
};

const binanceSymbolsForREST = CRYPTO_SYMBOLS.map(s => COIN_MAPPINGS[s].binanceSymbol);

// Mock function to get recent price data for AI analysis
function getMockRecentPriceData(symbol: CryptoSymbol, currentPrice: number): string {
    const prices = [currentPrice];
    for (let i = 0; i < 9; i++) {
        const priceFluctuation = (Math.random() - 0.5) * 0.02 * currentPrice; // +/- 2% fluctuation
        prices.unshift(Math.max(0, currentPrice - priceFluctuation * (i + 1)));
    }
    return prices.map(p => p.toFixed(Math.max(2, (currentPrice < 1 ? 5 : 2)))).join(',');
}

async function updateAllAiTrendsExternal(currentCryptoData: CryptoCardData[]): Promise<CryptoCardData[]> {
  const dataToAnalyze = currentCryptoData.filter(crypto => crypto.value > 0);
  if (dataToAnalyze.length === 0) return currentCryptoData;

  const dataPromises = dataToAnalyze.map(async (crypto) => {
    const recentPriceData = getMockRecentPriceData(crypto.symbol, crypto.value);
    try {
      const trendAnalysis = await analyzeCryptoTrend({ cryptoSymbol: crypto.symbol, recentPriceData });
      return { ...crypto, trendAnalysis };
    } catch (error) {
      console.error(`Error analyzing trend for ${crypto.symbol}:`, error);
      return { ...crypto, trendAnalysis: crypto.trendAnalysis || null };
    }
  });
  
  const results = await Promise.all(dataPromises);
  
  return currentCryptoData.map(crypto => {
    const updatedCrypto = results.find(r => r.symbol === crypto.symbol);
    return updatedCrypto || crypto;
  });
}


export default function DashboardPage() {
  const [cryptoData, setCryptoData] = useState<CryptoCardData[]>(initialCryptoData);
  const [isPricesLoading, setIsPricesLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { translations } = useLanguage();
  const { toast } = useToast();
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
        msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return msg;
  }, [translations]);

  const fetchBinancePricesREST = useCallback(async () => {
    console.log('Fetching Binance prices via REST API...');
    try {
      const response = await fetch(`${BINANCE_API_REST_BASE_URL}/ticker/price?symbols=${JSON.stringify(binanceSymbolsForREST)}`);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Binance API error (REST):', errorData);
        throw new Error(t('dashboard.api.binance.fetchError', 'Failed to fetch prices from Binance: {status}', { status: response.statusText }));
      }
      const data: Array<{ symbol: string; price: string }> = await response.json();
      
      setCryptoData(prevData =>
        prevData.map(crypto => {
          const binanceSymbol = COIN_MAPPINGS[crypto.symbol].binanceSymbol;
          const priceData = data.find(d => d.symbol === binanceSymbol);
          if (priceData) {
            const newPrice = parseFloat(priceData.price);
            return {
              ...crypto,
              previousValue: crypto.value !== 0 ? crypto.value : newPrice,
              value: newPrice,
            };
          }
          return crypto;
        })
      );
      setIsPricesLoading(false);
    } catch (error) {
      console.error('Error fetching Binance prices (REST):', error);
      toast({
        title: t('dashboard.api.binance.errorTitle', 'Price Fetch Error (Binance)'),
        description: error instanceof Error ? error.message : t('dashboard.api.binance.unknownError', 'Could not fetch live prices from Binance.'),
        variant: "destructive",
      });
    }
  }, [t, toast]);


  const startBinanceRestFallback = useCallback(() => {
    if (binanceFallbackIntervalRef.current) clearInterval(binanceFallbackIntervalRef.current);
    fetchBinancePricesREST(); // Initial fetch
    binanceFallbackIntervalRef.current = setInterval(fetchBinancePricesREST, BINANCE_API_REFRESH_INTERVAL);
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
    }

    const ws = new WebSocket(BINANCE_WS_URL);
    webSocketRef.current = ws;
    console.log(`Attempting to connect to Binance WebSocket: ${BINANCE_WS_URL}`);

    ws.onopen = () => {
      console.log('Binance WebSocket connected.');
      setIsPricesLoading(false); // Optimistically set loading to false
      if (binanceFallbackIntervalRef.current) {
        clearInterval(binanceFallbackIntervalRef.current);
        binanceFallbackIntervalRef.current = null;
        console.log('Cleared Binance REST fallback interval as WebSocket connected.');
      }
    };

    ws.onmessage = (event) => {
      try {
        const messageArray = JSON.parse(event.data as string) as Array<{ e: string; E: number; s: string; c: string; /* other fields */ }>;
        
        setCryptoData(prevData => {
          let changed = false;
          const newData = prevData.map(cd => {
            const binanceTicker = COIN_MAPPINGS[cd.symbol].binanceSymbol; // e.g., BTCUSDT
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
          if(changed) {
             // setIsPricesLoading(false); // Already set in onopen or by REST if this is the first data
            return newData;
          }
          return prevData;
        });
      } catch (error) {
        console.error('Error processing Binance WebSocket message:', error, event.data);
      }
    };

    ws.onerror = (event: Event) => {
      console.error('Binance WebSocket error event:', event); 
      
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
        description: t('dashboard.websocket.errorDescriptionBinance', 'Connection to Binance live price feed failed. Falling back to Binance periodic updates.'),
        variant: "warning",
      });

      if (webSocketRef.current) { // Ensure we close the failed WebSocket
          webSocketRef.current.close();
      }
      startBinanceRestFallback();
    };

    ws.onclose = (event: CloseEvent) => {
      console.log(`Binance WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}, Was Clean: ${event.wasClean}`);
      if (!event.wasClean && !binanceFallbackIntervalRef.current) { 
        console.log('Binance WebSocket closed unexpectedly, attempting to set up Binance REST fallback.');
        startBinanceRestFallback();
      }
    };
  }, [t, toast, startBinanceRestFallback]);


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


  // AI Trend Analysis (periodically)
  useEffect(() => {
    let isMounted = true;
    let aiIntervalTimerId: NodeJS.Timeout | null = null;

    const performAiUpdate = async () => {
      if (!isMounted || cryptoDataRef.current.every(c => c.value === 0)) return;

      setIsAiLoading(true);
      try {
        const currentDataForAI = JSON.parse(JSON.stringify(cryptoDataRef.current)) as CryptoCardData[];
        const updatedDataWithTrends = await updateAllAiTrendsExternal(currentDataForAI);
        
        if (isMounted) {
          setCryptoData(prevData => {
            return prevData.map(currentCrypto => {
              const trendUpdate = updatedDataWithTrends.find(upd => upd.symbol === currentCrypto.symbol);
              if (trendUpdate && trendUpdate.trendAnalysis) {
                return { ...currentCrypto, trendAnalysis: trendUpdate.trendAnalysis };
              }
              return currentCrypto;
            });
          });
        }
      } catch (error) {
        console.error("Error in performAiUpdate:", error);
        if (isMounted) {
          toast({
            title: t('dashboard.ai.errorTitle', 'AI Analysis Error'),
            description: t('dashboard.ai.errorDescription', 'Could not update AI trends.'),
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setIsAiLoading(false);
        }
      }
    };
    
    const initialTimeoutId = setTimeout(() => {
        if (isMounted) {
            performAiUpdate(); 
            aiIntervalTimerId = setInterval(() => {
                if (isMounted) performAiUpdate();
            }, AI_ANALYSIS_INTERVAL);
        }
    }, AI_ANALYSIS_INITIAL_DELAY);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeoutId);
      if (aiIntervalTimerId) {
        clearInterval(aiIntervalTimerId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast]); 

  const cryptoPricesForSimulator = useMemo(() => 
    cryptoData.reduce((acc, curr) => {
      if (curr.value !== 0) {
        acc[curr.symbol] = curr.value;
      }
      return acc;
    }, {} as Record<CryptoSymbol, number>),
  [cryptoData]);

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('dashboard.title', 'Dashboard')}</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">{t('dashboard.marketOverview', 'Market Overview')}</h2>
          {isPricesLoading && cryptoData.every(c => c.value === 0) ? (
             <p>{t('dashboard.loadingPrices', 'Loading live prices...')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {cryptoData.map((data, i) => (
                <CryptoDisplayCard 
                  key={data.symbol || i} 
                  data={data} 
                  isLoading={isPricesLoading && data.value === 0} // Still loading if master flag is true AND this specific coin has no value
                  isAiTrendLoading={isAiLoading && !data.trendAnalysis && data.value !==0}
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
