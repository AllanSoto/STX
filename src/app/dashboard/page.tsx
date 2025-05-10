// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { CryptoDisplayCard } from '@/components/dashboard/crypto-display-card';
import { OrderOpportunitySimulator } from '@/components/dashboard/order-opportunity-simulator'; // New component
import type { CryptoCardData } from '@/components/dashboard/types';
import { initialCryptoData } from '@/components/dashboard/types';
import { analyzeCryptoTrend } from '@/ai/flows/analyze-crypto-trends';
import type { CryptoSymbol } from '@/lib/constants';
import { CRYPTO_SYMBOLS, QUOTE_CURRENCY } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const BINANCE_API_BASE_URL = 'https://api.binance.com/api/v3';
const PRICE_FETCH_INTERVAL = 5000; // 5 seconds for REST fallback
const AI_ANALYSIS_INITIAL_DELAY = 7000; // 7 seconds
const AI_ANALYSIS_INTERVAL = 60000; // 60 seconds

// Mock function to get recent price data for AI analysis (remains for historical context for AI)
// TODO: Replace with actual historical data if available, or derive from price stream
function getMockRecentPriceData(symbol: CryptoSymbol, currentPrice: number): string {
    const prices = [currentPrice];
    for (let i = 0; i < 9; i++) {
        const priceFluctuation = (Math.random() - 0.5) * 0.02 * currentPrice; // +/- 1% fluctuation
        prices.unshift(Math.max(0, currentPrice - priceFluctuation * (i + 1))); // Going back in time
    }
    return prices.map(p => p.toFixed(Math.max(2, (currentPrice < 1 ? 5 : 2)))).join(',');
}


async function updateAllAiTrends(currentCryptoData: CryptoCardData[]): Promise<CryptoCardData[]> {
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
    const symbolsToFetch = CRYPTO_SYMBOLS.map(s => `${s}${QUOTE_CURRENCY}`);
    const symbolsParam = JSON.stringify(symbolsToFetch);
    try {
      const response = await fetch(`${BINANCE_API_BASE_URL}/ticker/price?symbols=${symbolsParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Binance API error (REST):', errorData);
        throw new Error(t('dashboard.api.binance.fetchError', 'Failed to fetch prices from Binance: {status}', { status: response.statusText }));
      }
      const data: { symbol: string; price: string }[] = await response.json();
      
      setCryptoData(prevData =>
        prevData.map(crypto => {
          const pairSymbol = `${crypto.symbol}${QUOTE_CURRENCY}`;
          const foundPrice = data.find(p => p.symbol === pairSymbol);
          if (foundPrice) {
            const newPrice = parseFloat(foundPrice.price);
            return {
              ...crypto,
              previousValue: crypto.value !== 0 ? crypto.value : newPrice,
              value: newPrice,
            };
          }
          return crypto;
        })
      );
      if (isPricesLoading) setIsPricesLoading(false);
    } catch (error) {
      console.error('Error fetching Binance prices (REST):', error);
      toast({
        title: t('dashboard.api.binance.errorTitle', 'Price Fetch Error'),
        description: error instanceof Error ? error.message : t('dashboard.api.binance.unknownError', 'Could not fetch live prices from Binance.'),
        variant: "destructive",
      });
    }
  }, [t, toast, isPricesLoading]);

  const connectWebSocket = useCallback(() => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const streamNames = CRYPTO_SYMBOLS.map(s => `${s.toLowerCase()}${QUOTE_CURRENCY.toLowerCase()}@ticker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamNames}`);
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log('Binance WebSocket connected.');
      setIsPricesLoading(false);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        if (message.e === '24hrTicker') { // Check for ticker event type
          const symbol = message.s.replace(QUOTE_CURRENCY, '') as CryptoSymbol;
          const newPrice = parseFloat(message.c); // 'c' is the last price

          if (CRYPTO_SYMBOLS.includes(symbol)) {
            setCryptoData(prevData =>
              prevData.map(cd =>
                cd.symbol === symbol
                  ? { ...cd, previousValue: cd.value !== 0 ? cd.value : newPrice, value: newPrice }
                  : cd
              )
            );
            if (isPricesLoading) setIsPricesLoading(false);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
      toast({
        title: t('dashboard.websocket.errorTitle', 'WebSocket Error'),
        description: t('dashboard.websocket.errorDescription', 'Connection to live price feed failed. Falling back to periodic updates.'),
        variant: "destructive",
      });
      // Fallback to REST API polling if WebSocket fails
      fetchBinancePricesREST();
      const intervalId = setInterval(fetchBinancePricesREST, PRICE_FETCH_INTERVAL);
      // Clean up this interval if the component unmounts or WebSocket reconnects
      return () => clearInterval(intervalId); 
    };

    ws.onclose = () => {
      console.log('Binance WebSocket disconnected.');
      // Optional: Attempt to reconnect or notify user. For now, rely on REST fallback initiated by onerror.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast, fetchBinancePricesREST, isPricesLoading]); // isPricesLoading might cause re-connections, review if problematic

  useEffect(() => {
    connectWebSocket();
    const restIntervalId = setInterval(fetchBinancePricesREST, PRICE_FETCH_INTERVAL * 2); // Fetch REST less frequently if WS is primary

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      clearInterval(restIntervalId);
    };
  }, [connectWebSocket, fetchBinancePricesREST]);


  // AI Trend Analysis (periodically)
  useEffect(() => {
    let isMounted = true;
    const performAiUpdate = async () => {
      // Only run AI analysis if there's actual price data
      if (!isMounted || cryptoData.every(c => c.value === 0)) return;

      setIsAiLoading(true);
      try {
        const currentDataForAI = JSON.parse(JSON.stringify(cryptoData)) as CryptoCardData[];
        const updatedDataWithTrends = await updateAllAiTrends(currentDataForAI);
        
        if (isMounted) {
          setCryptoData(updatedDataWithTrends);
        }
      } catch (error) {
        console.error("Error in performAiUpdate:", error);
        toast({
          title: t('dashboard.ai.errorTitle', 'AI Analysis Error'),
          description: t('dashboard.ai.errorDescription', 'Could not update AI trends.'),
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setIsAiLoading(false);
        }
      }
    };
    
    const initialAiTimeoutId = setTimeout(() => {
      if (isMounted) performAiUpdate();
      const aiIntervalId = setInterval(() => {
        if (isMounted) performAiUpdate();
      }, AI_ANALYSIS_INTERVAL);
      
      // Cleanup for the interval
      if (isMounted) { // Check mount status before returning cleanup
          // This cleanup will be registered only if the timeout completes and interval starts
          // However, the outer effect cleanup already handles isMounted.
      }
       return () => { // This cleanup is for the interval started by setTimeout
          if (isMounted) clearInterval(aiIntervalId);
       }
    }, AI_ANALYSIS_INITIAL_DELAY);

    return () => {
      isMounted = false;
      clearTimeout(initialAiTimeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast]); // cryptoData removed to avoid re-triggering AI too frequently based on price updates. AI runs on its own schedule.

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
                  isLoading={isPricesLoading || (isAiLoading && !data.trendAnalysis && data.value !==0)} 
                />
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          {/* The new combined simulator replaces both OrderSimulator and OpportunityList */}
          <OrderOpportunitySimulator cryptoPrices={cryptoPricesForSimulator} />
        </section>
      </div>
    </MainLayout>
  );
}
