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
import { useLanguage } from '@/hooks/use-language';

// Mock function to get recent price data for AI analysis (remains for historical context for AI)
function getMockRecentPriceData(symbol: CryptoSymbol): string {
  const basePrice = Math.random() * 1000; // This basePrice is for mock historical data, not current price
  let prices = [];
  let trendFactor = Math.random(); // 0-0.33: down, 0.33-0.66: sideways, 0.66-1: up

  // Bias trends for mock data diversity
  if (symbol === 'BTC') trendFactor = 0.8; 
  if (symbol === 'ETH') trendFactor = 0.7;
  if (symbol === 'SOL') trendFactor = 0.2;

  for (let i = 0; i < 10; i++) {
    let change;
    if (trendFactor < 0.33) { // downward
      change = -Math.random() * basePrice * 0.01;
    } else if (trendFactor < 0.66) { // sideways
      change = (Math.random() - 0.5) * basePrice * 0.005;
    } else { // upward
      change = Math.random() * basePrice * 0.01;
    }
    prices.push((basePrice + change * i).toFixed(2));
  }
  return prices.join(',');
}

async function updateAllAiTrends(currentCryptoData: CryptoCardData[]): Promise<CryptoCardData[]> {
  const dataPromises = currentCryptoData.map(async (crypto) => {
    // AI trend analysis uses mock recent price data for historical context
    const recentPriceData = getMockRecentPriceData(crypto.symbol);
    try {
      const trendAnalysis = await analyzeCryptoTrend({ cryptoSymbol: crypto.symbol, recentPriceData });
      return { ...crypto, trendAnalysis };
    } catch (error) {
      console.error(`Error analyzing trend for ${crypto.symbol}:`, error);
      return { ...crypto, trendAnalysis: crypto.trendAnalysis }; // Keep old trend on error
    }
  });
  return Promise.all(dataPromises);
}


export default function DashboardPage() {
  const [cryptoData, setCryptoData] = useState<CryptoCardData[]>(initialCryptoData);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const { translations } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  // WebSocket for real-time prices
  useEffect(() => {
    const symbols = initialCryptoData.map(c => `${c.symbol.toLowerCase()}usdt@trade`);
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${symbols.join('/')}`);

    ws.onopen = () => {
      console.log('Binance WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        if (message.stream && message.data && message.data.s && message.data.p) {
          const symbol = message.data.s.replace('USDT', '').toUpperCase() as CryptoSymbol;
          const newPrice = parseFloat(message.data.p);

          setCryptoData(prevData =>
            prevData.map(crypto => {
              if (crypto.symbol === symbol) {
                return {
                  ...crypto,
                  previousValue: crypto.value === 0 ? newPrice : crypto.value, // Set previousValue correctly on first update
                  value: newPrice,
                };
              }
              return crypto;
            })
          );
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Binance WebSocket disconnected');
      // Optionally, implement reconnection logic here
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  // AI Trend Analysis (periodically)
  useEffect(() => {
    const performAiUpdate = async () => {
      // Only set AI loading if there's data to analyze trends for (prices have started coming in)
      if (cryptoData.some(c => c.value !== 0)) {
          setIsAiLoading(true);
      } else if (!cryptoData.some(c=> c.trendAnalysis)){ // If no prices and no trends, AI is loading
          setIsAiLoading(true);
      }


      // Create a stable copy of cryptoData for the async operation by accessing state directly in updater
      try {
        // Pass the current state directly to avoid stale closures with setInterval
        const currentDataForAI = await new Promise<CryptoCardData[]>(resolve => setCryptoData(prev => {
          resolve(JSON.parse(JSON.stringify(prev))); // Deep copy
          return prev; 
        }));

        const updatedDataWithTrends = await updateAllAiTrends(currentDataForAI);
        
        setCryptoData(prevData => 
          prevData.map(pd => {
            const trendUpdate = updatedDataWithTrends.find(ud => ud.symbol === pd.symbol);
            return {
              ...pd, // keep latest price from websocket
              trendAnalysis: trendUpdate ? trendUpdate.trendAnalysis : pd.trendAnalysis,
            };
          })
        );
      } catch (error) {
        console.error("Error in performAiUpdate:", error);
      } finally {
        setIsAiLoading(false);
      }
    };

    performAiUpdate(); // Initial AI analysis
    const intervalId = setInterval(performAiUpdate, 30000); // Update AI trends every 30 seconds

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

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
                // Card is loading if price is 0 (initial) OR if AI is loading and no trend yet for this specific card
                isLoading={data.value === 0 || (isAiLoading && !data.trendAnalysis)} 
              />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground sr-only">{t('dashboard.orderSimulator', 'Order Simulator')}</h2>
          <OrderSimulator cryptoPrices={cryptoData.reduce((acc, curr) => {
            acc[curr.symbol] = curr.value;
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
