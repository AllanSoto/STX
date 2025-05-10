// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { CryptoDisplayCard } from '@/components/dashboard/crypto-display-card';
import { OrderSimulator } from '@/components/dashboard/order-simulator';
import { OpportunityList } from '@/components/dashboard/opportunity-list';
import type { CryptoCardData } from '@/components/dashboard/types';
import { initialCryptoData } from '@/components/dashboard/types';
import { analyzeCryptoTrend } from '@/ai/flows/analyze-crypto-trends';
import type { CryptoSymbol } from '@/lib/constants';
import { CRYPTO_SYMBOLS, QUOTE_CURRENCY } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';

const BINANCE_API_BASE_URL = 'https://api.binance.com/api/v3';
const PRICE_FETCH_INTERVAL = 5000; // 5 seconds
const AI_ANALYSIS_INITIAL_DELAY = 7000; // 7 seconds
const AI_ANALYSIS_INTERVAL = 60000; // 60 seconds

// Mock function to get recent price data for AI analysis (remains for historical context for AI)
function getMockRecentPriceData(symbol: CryptoSymbol): string {
  const basePrice = Math.random() * 50000 + (symbol === 'BTC' ? 20000 : symbol === 'ETH' ? 1000 : 10); // More realistic base
  let prices = [];
  let trendFactor = Math.random(); 

  if (symbol === 'BTC') trendFactor = 0.8; 
  if (symbol === 'ETH') trendFactor = 0.7;
  if (symbol === 'SOL') trendFactor = 0.2;
  if (symbol === 'BNB') trendFactor = 0.6;
  if (symbol === 'XRP') trendFactor = 0.4;

  for (let i = 0; i < 10; i++) {
    let change;
    if (trendFactor < 0.33) { 
      change = -Math.random() * basePrice * 0.01;
    } else if (trendFactor < 0.66) { 
      change = (Math.random() - 0.5) * basePrice * 0.005;
    } else { 
      change = Math.random() * basePrice * 0.01;
    }
    prices.push((basePrice + change * i).toFixed(2));
  }
  return prices.join(',');
}

async function updateAllAiTrends(currentCryptoData: CryptoCardData[]): Promise<CryptoCardData[]> {
  const dataToAnalyze = currentCryptoData.filter(crypto => crypto.value > 0);
  if (dataToAnalyze.length === 0) return currentCryptoData; // No data with prices to analyze

  const dataPromises = dataToAnalyze.map(async (crypto) => {
    const recentPriceData = getMockRecentPriceData(crypto.symbol);
    try {
      const trendAnalysis = await analyzeCryptoTrend({ cryptoSymbol: crypto.symbol, recentPriceData });
      return { ...crypto, trendAnalysis };
    } catch (error) {
      console.error(`Error analyzing trend for ${crypto.symbol}:`, error);
      // Return crypto with existing trendAnalysis if any, or null if it failed.
      return { ...crypto, trendAnalysis: crypto.trendAnalysis || null }; 
    }
  });
  
  const results = await Promise.all(dataPromises);
  
  // Merge results back into the full currentCryptoData list
  return currentCryptoData.map(crypto => {
    const updatedCrypto = results.find(r => r.symbol === crypto.symbol);
    return updatedCrypto || crypto;
  });
}

export default function DashboardPage() {
  const [cryptoData, setCryptoData] = useState<CryptoCardData[]>(initialCryptoData);
  const [isPricesLoading, setIsPricesLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false); // AI loading is separate
  const { translations } = useLanguage();
  const { toast } = useToast();

  const t = useCallback((key: string, fallback?: string, vars?: Record<string, string | number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return msg;
  }, [translations]);

  // Fetch prices from Binance API
  const fetchBinancePrices = useCallback(async () => {
    const symbolsToFetch = CRYPTO_SYMBOLS.map(s => `${s}${QUOTE_CURRENCY}`);
    const symbolsParam = JSON.stringify(symbolsToFetch);
    try {
      const response = await fetch(`${BINANCE_API_BASE_URL}/ticker/price?symbols=${symbolsParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Binance API error:', errorData);
        throw new Error(t('dashboard.api.binance.fetchError', 'Failed to fetch prices from Binance: {status}', {status: response.statusText}));
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
              previousValue: crypto.value !== 0 ? crypto.value : newPrice, // Set previousValue correctly
              value: newPrice,
            };
          }
          return crypto;
        })
      );
      if (isPricesLoading) setIsPricesLoading(false);
    } catch (error) {
      console.error('Error fetching Binance prices:', error);
      toast({
        title: t('dashboard.api.binance.errorTitle', 'Price Fetch Error'),
        description: error instanceof Error ? error.message : t('dashboard.api.binance.unknownError', 'Could not fetch live prices from Binance.'),
        variant: "destructive",
      });
      // Optionally keep isPricesLoading true or set a retry mechanism
    }
  }, [t, toast, isPricesLoading]);

  // Effect for polling Binance API for prices
  useEffect(() => {
    fetchBinancePrices(); // Initial fetch
    const intervalId = setInterval(fetchBinancePrices, PRICE_FETCH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchBinancePrices]);

  // AI Trend Analysis (periodically)
  useEffect(() => {
    let isMounted = true;
    const performAiUpdate = async () => {
      if (!isMounted || cryptoData.every(c => c.value === 0)) return; // Don't run if no prices yet

      setIsAiLoading(true);
      try {
        // Pass a deep copy of cryptoData to avoid potential mutation issues if AI updates it directly
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
      performAiUpdate(); // Initial AI update
      const aiIntervalId = setInterval(performAiUpdate, AI_ANALYSIS_INTERVAL);
      return () => clearInterval(aiIntervalId); // Cleanup for the interval
    }, AI_ANALYSIS_INITIAL_DELAY);

    return () => {
      isMounted = false;
      clearTimeout(initialAiTimeoutId); // Cleanup for the initial timeout
      // The interval cleanup is handled by its own return function if it gets set up
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast]); // cryptoData is intentionally omitted to run AI on its own schedule

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('dashboard.title', 'Dashboard')}</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">{t('dashboard.marketOverview', 'Market Overview')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cryptoData.map((data, i) => (
              <CryptoDisplayCard 
                key={data.symbol || i} 
                data={data} 
                isLoading={isPricesLoading || (isAiLoading && !data.trendAnalysis && data.value !==0)} 
              />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground sr-only">{t('dashboard.orderSimulator', 'Order Simulator')}</h2>
          <OrderSimulator cryptoPrices={cryptoData.reduce((acc, curr) => {
            if(curr.value !== 0) { 
                acc[curr.symbol] = curr.value;
            }
            return acc;
          }, {} as Record<CryptoSymbol, number>)} />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground sr-only">{t('dashboard.opportunitySimulator', 'Opportunity Simulator')}</h2>
          <OpportunityList cryptoData={cryptoData} />
        </section>
      </div>
    </MainLayout>
  );
}
