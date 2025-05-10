'use client';

import { useEffect, useState } from 'react';
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
async function fetchDashboardData(): Promise<CryptoCardData[]> {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    
    const dataPromises = initialCryptoData.map(async (crypto) => {
        let price;
        // Simplified mock prices
        switch (crypto.symbol) {
            case 'BTC': price = 60000 + Math.random() * 1000 - 500; break;
            case 'ETH': price = 3000 + Math.random() * 100 - 50; break;
            case 'SOL': price = 150 + Math.random() * 10 - 5; break;
            case 'BNB': price = 580 + Math.random() * 20 - 10; break;
            case 'XRP': price = 0.5 + Math.random() * 0.1 - 0.05; break;
            default: price = 0;
        }

        try {
            const recentPriceData = getMockRecentPriceData(crypto.symbol);
            const trendAnalysis = await analyzeCryptoTrend({ cryptoSymbol: crypto.symbol, recentPriceData });
            return { ...crypto, value: parseFloat(price.toFixed(2)), trendAnalysis };
        } catch (error) {
            console.error(`Error analyzing trend for ${crypto.symbol}:`, error);
            return { ...crypto, value: parseFloat(price.toFixed(2)), trendAnalysis: null };
        }
    });

    return Promise.all(dataPromises);
}


export default function DashboardPage() {
  const [cryptoData, setCryptoData] = useState<CryptoCardData[]>(initialCryptoData);
  const [isLoading, setIsLoading] = useState(true);
  const { translations } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;


  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const data = await fetchDashboardData();
      setCryptoData(data);
      setIsLoading(false);
    }
    loadData();
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('dashboard.title', 'Dashboard')}</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">{t('dashboard.marketOverview', 'Market Overview')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cryptoData.map((data) => (
              <CryptoDisplayCard key={data.symbol} data={data} isLoading={isLoading} />
            ))}
          </div>
           {isLoading && cryptoData.length === 0 && ( // Show skeletons if still loading and no data yet
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => <CryptoDisplayCard key={i} data={{symbol: 'BTC', value:0, trendAnalysis: null}} isLoading={true} />)}
            </div>
           )}
        </section>

        <section className="mb-8">
           {/* The OrderSimulator component has its own CardTitle, this h2 is for semantic structure */}
          <h2 className="text-2xl font-semibold mb-4 text-foreground sr-only">{t('dashboard.orderSimulator', 'Order Simulator')}</h2>
          <OrderSimulator />
        </section>

        <section>
          {/* The OpportunityList component has its own CardTitle, this h2 is for semantic structure */}
          <h2 className="text-2xl font-semibold mb-4 text-foreground sr-only">{t('dashboard.opportunitySimulator', 'Opportunity Simulator')}</h2>
          <OpportunityList />
        </section>
      </div>
    </MainLayout>
  );
}
