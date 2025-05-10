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
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';

// Mock function to get recent price data for AI analysis
function getMockRecentPriceData(symbol: CryptoSymbol): string {
  // Simulate some price fluctuations
  const basePrice = Math.random() * 1000;
  let prices = [];
  let trendFactor = Math.random(); // 0-0.33: down, 0.33-0.66: sideways, 0.66-1: up

  if (symbol === 'BTC') trendFactor = 0.8; // Bias BTC to upward
  if (symbol === 'ETH') trendFactor = 0.7;
  if (symbol === 'SOL') trendFactor = 0.2; // Bias SOL to downward

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

// Mock function to fetch current crypto values
async function fetchDashboardData(currentData: CryptoCardData[]): Promise<CryptoCardData[]> {
    // Simulate API delay for initial load only, subsequent loads are faster
    if (currentData.every(d => d.value === 0)) {
        await new Promise(resolve => setTimeout(resolve, 1500)); 
    } else {
        await new Promise(resolve => setTimeout(resolve, 500)); // Faster update
    }
    
    const dataPromises = initialCryptoData.map(async (crypto) => {
        let price;
        // Simplified mock prices with more dynamic changes
        const oldCrypto = currentData.find(c => c.symbol === crypto.symbol);
        const basePrice = oldCrypto && oldCrypto.value > 0 ? oldCrypto.value : 
            (crypto.symbol === 'BTC' ? 103000 : // Updated BTC base price
             crypto.symbol === 'ETH' ? 3000 :
             crypto.symbol === 'SOL' ? 150 :
             crypto.symbol === 'BNB' ? 580 :
             crypto.symbol === 'XRP' ? 0.5 : 0);
        
        // Simulate small percentage change
        const changePercentage = (Math.random() - 0.45) * 0.01; // +/- 0.45% change
        price = basePrice * (1 + changePercentage);
        if (price < 0) price = 0; // Ensure price is not negative

        try {
            // Only run AI trend analysis periodically, not on every price update to save resources
            // For this example, let's assume trend analysis is less frequent or triggered by larger changes
            // Here, we'll reuse existing trendAnalysis if available, or fetch it if not.
            let trendAnalysis = oldCrypto?.trendAnalysis || null;
            if (!trendAnalysis || Math.random() < 0.1) { // 10% chance to re-fetch trend
                 const recentPriceData = getMockRecentPriceData(crypto.symbol);
                 trendAnalysis = await analyzeCryptoTrend({ cryptoSymbol: crypto.symbol, recentPriceData });
            }
            return { ...crypto, value: parseFloat(price.toFixed(2)), trendAnalysis };
        } catch (error) {
            console.error(`Error analyzing trend for ${crypto.symbol}:`, error);
            // Keep old trend analysis on error if available
            return { ...crypto, value: parseFloat(price.toFixed(2)), trendAnalysis: oldCrypto?.trendAnalysis || null };
        }
    });

    return Promise.all(dataPromises);
}


export default function DashboardPage() {
  const [cryptoData, setCryptoData] = useState<CryptoCardData[]>(initialCryptoData);
  const [isLoading, setIsLoading] = useState(true);
  const { translations } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const loadData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsLoading(true);
    }
    // Pass the current cryptoData to fetchDashboardData so it can use current prices as base for next calculation
    const data = await fetchDashboardData(cryptoData); 
    setCryptoData(data);
    if (isInitialLoad) {
      setIsLoading(false);
    }
  }, [cryptoData]); // cryptoData is a dependency now

  useEffect(() => {
    loadData(true); // Initial load

    const intervalId = setInterval(() => {
      loadData(false); // Subsequent updates
    }, 5000); // Refresh data every 5 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]); // loadData is memoized

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('dashboard.title', 'Dashboard')}</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">{t('dashboard.marketOverview', 'Market Overview')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {isLoading && cryptoData.every(d => d.value === 0) ? ( // Show skeletons if still loading and no data yet
                 [...Array(5)].map((_, i) => <CryptoDisplayCard key={i} data={{symbol: 'BTC', value:0, trendAnalysis: null}} isLoading={true} />)
            ) : (
                cryptoData.map((data) => (
                  <CryptoDisplayCard key={data.symbol} data={data} isLoading={isLoading && data.value === 0} />
                ))
            )}
          </div>
        </section>

        <section className="mb-8">
           {/* The OrderSimulator component has its own CardTitle, this h2 is for semantic structure */}
          <h2 className="text-2xl font-semibold mb-4 text-foreground sr-only">{t('dashboard.orderSimulator', 'Order Simulator')}</h2>
          <OrderSimulator cryptoPrices={cryptoData.reduce((acc, curr) => {
            acc[curr.symbol] = curr.value;
            return acc;
          }, {} as Record<CryptoSymbol, number>)} />
        </section>

        <section>
          {/* The OpportunityList component has its own CardTitle, this h2 is for semantic structure */}
          <h2 className="text-2xl font-semibold mb-4 text-foreground sr-only">{t('dashboard.opportunitySimulator', 'Opportunity Simulator')}</h2>
          <OpportunityList cryptoData={cryptoData} />
        </section>
      </div>
    </MainLayout>
  );
}
