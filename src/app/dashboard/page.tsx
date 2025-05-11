
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

const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3/simple/price';
const COINCAP_WS_URL = 'wss://ws.coincap.io/prices';

const COINGECKO_API_REFRESH_INTERVAL = 60000; // 60 seconds for REST fallback
const BINANCE_API_REFRESH_INTERVAL = 5000; // 5 seconds for Binance REST fallback
const AI_ANALYSIS_INITIAL_DELAY = 7000; // 7 seconds
const AI_ANALYSIS_INTERVAL = 60000 * 5; // 5 minutes for AI analysis

// Mapping for CoinGecko IDs, CoinCap IDs, and Binance Symbols
const COIN_MAPPINGS: Record<CryptoSymbol, { coingeckoId: string; coincapId: string; binanceSymbol: string }> = {
  BTC: { coingeckoId: 'bitcoin', coincapId: 'bitcoin', binanceSymbol: 'BTCUSDT' },
  ETH: { coingeckoId: 'ethereum', coincapId: 'ethereum', binanceSymbol: 'ETHUSDT' },
  SOL: { coingeckoId: 'solana', coincapId: 'solana', binanceSymbol: 'SOLUSDT' },
  BNB: { coingeckoId: 'binancecoin', coincapId: 'binance-coin', binanceSymbol: 'BNBUSDT' },
  XRP: { coingeckoId: 'ripple', coincapId: 'xrp', binanceSymbol: 'XRPUSDT' }, // Ensured coincapId is 'xrp'
};

const coinGeckoAssetIds = CRYPTO_SYMBOLS.map(s => COIN_MAPPINGS[s].coingeckoId).join(',');
const coinCapAssetIds = CRYPTO_SYMBOLS.map(s => COIN_MAPPINGS[s].coincapId).join(',');
const binanceSymbols = CRYPTO_SYMBOLS.map(s => COIN_MAPPINGS[s].binanceSymbol);

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
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(binanceSymbols)}`);
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

  const fetchCoinGeckoPricesREST = useCallback(async () => {
    // This is a secondary fallback if Binance REST also fails or as an alternative data source.
    // For now, primary fallback from WebSocket is Binance REST.
    try {
      const response = await fetch(`${COINGECKO_API_BASE_URL}?ids=${coinGeckoAssetIds}&vs_currencies=${QUOTE_CURRENCY.toLowerCase()}`);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('CoinGecko API error (REST):', errorData);
        throw new Error(t('dashboard.api.coingecko.fetchError', 'Failed to fetch prices from CoinGecko: {status}', { status: response.statusText }));
      }
      const data: Record<string, Record<string, number>> = await response.json();
      
      setCryptoData(prevData =>
        prevData.map(crypto => {
          const coingeckoId = COIN_MAPPINGS[crypto.symbol].coingeckoId;
          const priceData = data[coingeckoId];
          if (priceData && priceData[QUOTE_CURRENCY.toLowerCase()] !== undefined) {
            const newPrice = priceData[QUOTE_CURRENCY.toLowerCase()];
             if (crypto.value === 0) { // Only update if Binance hasn't provided a value yet
              return {
                ...crypto,
                previousValue: newPrice, // Set previous value on first fetch
                value: newPrice,
              };
            }
          }
          return crypto;
        })
      );
      //setIsPricesLoading(false); // Let Binance REST control this primarily
    } catch (error) {
      console.error('Error fetching CoinGecko prices (REST):', error);
      toast({
        title: t('dashboard.api.coingecko.errorTitle', 'Price Fetch Error (CoinGecko)'),
        description: error instanceof Error ? error.message : t('dashboard.api.coingecko.unknownError', 'Could not fetch live prices from CoinGecko.'),
        variant: "warning",
      });
    }
  }, [t, toast]);

  const startBinanceRestFallback = useCallback(() => {
    if (binanceFallbackIntervalRef.current) clearInterval(binanceFallbackIntervalRef.current);
    fetchBinancePricesREST(); // Initial fetch
    binanceFallbackIntervalRef.current = setInterval(fetchBinancePricesREST, BINANCE_API_REFRESH_INTERVAL);
    console.log('Started Binance REST fallback interval.');
    // Optionally, also start CoinGecko as a deeper fallback if Binance REST fails over time
    if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current); // Clear CoinGecko if Binance REST takes over
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

    // Primary attempt: CoinCap WebSocket
    const ws = new WebSocket(`${COINCAP_WS_URL}?assets=${coinCapAssetIds}`);
    webSocketRef.current = ws;
    console.log(`Attempting to connect to CoinCap WebSocket with IDs: ${coinCapAssetIds}`);

    ws.onopen = () => {
      console.log('CoinCap WebSocket connected.');
      setIsPricesLoading(false); 
      if (binanceFallbackIntervalRef.current) {
        clearInterval(binanceFallbackIntervalRef.current);
        binanceFallbackIntervalRef.current = null;
        console.log('Cleared Binance REST fallback interval as WebSocket connected.');
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as Record<string, string>;
        setCryptoData(prevData => {
          let changed = false;
          const newData = prevData.map(cd => {
            const coinCapId = COIN_MAPPINGS[cd.symbol].coincapId;
            if (message[coinCapId]) {
              const newPrice = parseFloat(message[coinCapId]);
              if (cd.value !== newPrice) {
                changed = true;
                return { ...cd, previousValue: cd.value !== 0 ? cd.value : newPrice, value: newPrice };
              }
            }
            return cd;
          });
          if(changed) {
            setIsPricesLoading(false);
            return newData;
          }
          return prevData;
        });
      } catch (error) {
        console.error('Error processing CoinCap WebSocket message:', error, event.data);
      }
    };

    ws.onerror = (event: Event) => {
      console.error('CoinCap WebSocket error event:', event); 
      let errorDetailsMessage = t('dashboard.websocket.errorUnknownCoinCap', 'Unknown WebSocket error occurred with CoinCap.');
      if (event instanceof ErrorEvent && event.message) {
        errorDetailsMessage = t('dashboard.websocket.errorMessage', 'Error message: {message}, Type: {type}', {message: event.message, type: event.type});
      } else if (event.type) {
        errorDetailsMessage = t('dashboard.websocket.eventType', 'Event type: {type}', {type: event.type});
      }
      
      console.error(
        `CoinCap WebSocket detailed error: ${errorDetailsMessage}. WebSocket readyState: ${ws?.readyState}. Asset IDs: ${coinCapAssetIds}`
      );
      
      toast({
        title: t('dashboard.websocket.errorTitle', 'WebSocket Error'),
        description: t('dashboard.websocket.errorDescriptionCoinCap', 'Connection to CoinCap live price feed failed. Falling back to Binance periodic updates.'),
        variant: "warning",
      });

      startBinanceRestFallback(); // Fallback to Binance REST API polling
    };

    ws.onclose = (event: CloseEvent) => {
      console.log(`CoinCap WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}, Was Clean: ${event.wasClean}`);
      if (!event.wasClean && !binanceFallbackIntervalRef.current) { 
        console.log('CoinCap WebSocket closed unexpectedly, attempting to set up Binance REST fallback.');
        startBinanceRestFallback();
      }
    };
  }, [t, toast, startBinanceRestFallback]);


  useEffect(() => {
    connectWebSocket(); // Attempt WebSocket first

    // Cleanup function
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.onopen = null;
        webSocketRef.current.onmessage = null;
        webSocketRef.current.onerror = null;
        webSocketRef.current.onclose = null;
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      if (fallbackIntervalRef.current) { // CoinGecko fallback
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      if (binanceFallbackIntervalRef.current) { // Binance REST fallback
        clearInterval(binanceFallbackIntervalRef.current);
        binanceFallbackIntervalRef.current = null;
      }
    };
  }, [connectWebSocket]); // connectWebSocket is stable due to useCallback


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
                  isLoading={isPricesLoading && data.value === 0}
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
