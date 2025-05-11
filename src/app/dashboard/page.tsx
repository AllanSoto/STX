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

const COINGECKO_API_REFRESH_INTERVAL = 60000; // 60 seconds for REST fallback if WS fails completely
const AI_ANALYSIS_INITIAL_DELAY = 7000; // 7 seconds
const AI_ANALYSIS_INTERVAL = 60000; // 60 seconds

// Mapping for CoinGecko IDs and CoinCap IDs
const COIN_MAPPINGS: Record<CryptoSymbol, { coingeckoId: string; coincapId: string }> = {
  BTC: { coingeckoId: 'bitcoin', coincapId: 'bitcoin' },
  ETH: { coingeckoId: 'ethereum', coincapId: 'ethereum' },
  SOL: { coingeckoId: 'solana', coincapId: 'solana' },
  BNB: { coingeckoId: 'binancecoin', coincapId: 'binance-coin' },
  XRP: { coingeckoId: 'ripple', coincapId: 'xrp' },
};

const coinGeckoAssetIds = CRYPTO_SYMBOLS.map(s => COIN_MAPPINGS[s].coingeckoId).join(',');
const coinCapAssetIds = CRYPTO_SYMBOLS.map(s => COIN_MAPPINGS[s].coincapId).join(',');


// Mock function to get recent price data for AI analysis
function getMockRecentPriceData(symbol: CryptoSymbol, currentPrice: number): string {
    const prices = [currentPrice];
    for (let i = 0; i < 9; i++) {
        const priceFluctuation = (Math.random() - 0.5) * 0.02 * currentPrice;
        prices.unshift(Math.max(0, currentPrice - priceFluctuation * (i + 1)));
    }
    return prices.map(p => p.toFixed(Math.max(2, (currentPrice < 1 ? 5 : 2)))).join(',');
}

// This function is defined outside the component, so it's stable
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

  const fetchCoinGeckoPricesREST = useCallback(async () => {
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
            return {
              ...crypto,
              previousValue: crypto.value !== 0 ? crypto.value : newPrice,
              value: newPrice,
            };
          }
          return crypto;
        })
      );
      setIsPricesLoading(false); // Successfully fetched, turn off initial loading
    } catch (error) {
      console.error('Error fetching CoinGecko prices (REST):', error);
      toast({
        title: t('dashboard.api.coingecko.errorTitle', 'Price Fetch Error (CoinGecko)'),
        description: error instanceof Error ? error.message : t('dashboard.api.coingecko.unknownError', 'Could not fetch live prices from CoinGecko.'),
        variant: "destructive",
      });
      // isPricesLoading remains true or is handled by WebSocket status
    }
  }, [t, toast, setCryptoData, setIsPricesLoading]);


  const connectWebSocket = useCallback(() => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      return; 
    }
    if (webSocketRef.current) { // Clean up existing socket before reconnecting
        webSocketRef.current.close();
    }

    const ws = new WebSocket(`${COINCAP_WS_URL}?assets=${coinCapAssetIds}`);
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log('CoinCap WebSocket connected.');
      setIsPricesLoading(false); // Connected, turn off initial loading
      if (fallbackIntervalRef.current) { // Clear CoinGecko fallback if WebSocket connects
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
        console.log('Cleared CoinGecko REST fallback interval as WebSocket connected.');
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as Record<string, string>;
        const updatedSymbols: CryptoSymbol[] = [];

        setCryptoData(prevData => {
          let changed = false;
          const newData = prevData.map(cd => {
            const coinCapId = COIN_MAPPINGS[cd.symbol].coincapId;
            if (message[coinCapId]) {
              const newPrice = parseFloat(message[coinCapId]);
              if (cd.value !== newPrice) {
                updatedSymbols.push(cd.symbol);
                changed = true;
                return { ...cd, previousValue: cd.value !== 0 ? cd.value : newPrice, value: newPrice };
              }
            }
            return cd;
          });
          if(changed) return newData;
          return prevData; // No change, return previous state to avoid unnecessary re-render
        });
        
        if (updatedSymbols.length > 0) {
          setIsPricesLoading(false); // Prices received, turn off initial loading if it was on
        }

      } catch (error) {
        console.error('Error processing CoinCap WebSocket message:', error, event.data);
      }
    };

    ws.onerror = (event: Event) => {
      console.error('CoinCap WebSocket error event:', event); 
      
      let errorDetailsMessage = 'Unknown WebSocket error occurred with CoinCap.';
      if (event instanceof ErrorEvent && event.message) { // ErrorEvent is more specific
        errorDetailsMessage = `Error message: ${event.message}, Type: ${event.type}`;
      } else if (event.type) {
        errorDetailsMessage = `Event type: ${event.type}`;
      }
      
      console.error(
        `CoinCap WebSocket detailed error: ${errorDetailsMessage}. WebSocket readyState: ${ws?.readyState}. Asset IDs: ${coinCapAssetIds}`
      );
      
      toast({
        title: t('dashboard.websocket.errorTitle', 'WebSocket Error'),
        description: t('dashboard.websocket.errorDescriptionCoinCap', 'Connection to CoinCap live price feed failed. Falling back to CoinGecko periodic updates.'),
        variant: "warning", // Changed to warning as fallback exists
      });

      // Fallback to CoinGecko REST API polling if WebSocket fails
      if (!fallbackIntervalRef.current) { // Start fallback only if not already running
        fetchCoinGeckoPricesREST(); // Initial fetch for fallback
        fallbackIntervalRef.current = setInterval(fetchCoinGeckoPricesREST, COINGECKO_API_REFRESH_INTERVAL);
        console.log('Started CoinGecko REST fallback interval due to WebSocket error.');
      }
    };

    ws.onclose = (event: CloseEvent) => {
      console.log(`CoinCap WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
      // Optionally attempt to reconnect or rely on onerror to setup fallback
      if (!event.wasClean && !fallbackIntervalRef.current) { // If not a clean close and no fallback active
        console.log('WebSocket closed unexpectedly, attempting to set up CoinGecko fallback.');
        fetchCoinGeckoPricesREST(); // Initial fetch for fallback
        fallbackIntervalRef.current = setInterval(fetchCoinGeckoPricesREST, COINGECKO_API_REFRESH_INTERVAL);
      }
    };
  }, [t, toast, setCryptoData, setIsPricesLoading, fetchCoinGeckoPricesREST]);


  useEffect(() => {
    connectWebSocket();

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
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
        // Use the ref for the most current data without adding cryptoData to dependencies
        const currentDataForAI = JSON.parse(JSON.stringify(cryptoDataRef.current)) as CryptoCardData[];
        const updatedDataWithTrends = await updateAllAiTrendsExternal(currentDataForAI);
        
        if (isMounted) {
          // Merge AI results carefully, cryptoData might have newer prices
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
            performAiUpdate(); // First call
            aiIntervalTimerId = setInterval(() => { // Subsequent calls
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
  }, [t, toast, setIsAiLoading, setCryptoData]); // updateAllAiTrendsExternal is stable

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
                  isLoading={isPricesLoading && data.value === 0} // Simplified isLoading for card
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

