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
import { useToast } from '@/hooks/use-toast';

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
      // Attempt to parse and log more detailed error info if available
      if (error instanceof Error && (error as any).cause) {
        console.error(`Cause of error for ${crypto.symbol}:`, (error as any).cause);
      }
      return { ...crypto, trendAnalysis: crypto.trendAnalysis }; // Keep old trend on error
    }
  });
  return Promise.all(dataPromises);
}


export default function DashboardPage() {
  const [cryptoData, setCryptoData] = useState<CryptoCardData[]>(initialCryptoData);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const { translations } = useLanguage();
  const t = (key: string, fallback?: string, vars?: Record<string, string | number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return msg;
  };
  const { toast } = useToast();

  // WebSocket for real-time prices
  useEffect(() => {
    const symbols = initialCryptoData.map(c => `${c.symbol.toLowerCase()}usdt@trade`);
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbols.join('/')}`; 
    
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 5000; 

    function connectWebSocket() {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('Binance WebSocket already open or connecting.');
        return;
      }

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Binance WebSocket connected');
        reconnectAttempts = 0; 
        toast({
          title: t('dashboard.websocket.connectedTitle', 'Real-time Feed Connected'),
          description: t('dashboard.websocket.connectedDescription', 'Live prices from Binance are now active.'),
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string);
          const tradeData = message.data || message;

          if (tradeData && tradeData.s && tradeData.p) {
            const symbol = tradeData.s.replace('USDT', '').toUpperCase() as CryptoSymbol;
            const newPrice = parseFloat(tradeData.p);

            setCryptoData(prevData =>
              prevData.map(crypto => {
                if (crypto.symbol === symbol) {
                  const priceBeforeUpdate = crypto.value; // Value before this update
                  return {
                    ...crypto,
                    previousValue: priceBeforeUpdate, // Set previous value to the one before this update
                    value: newPrice,                  // Set new current value
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

      ws.onerror = (event) => {
        console.error('Binance WebSocket error. Event:', event);
        console.error('WebSocket readyState:', ws?.readyState);
        toast({
          title: t('dashboard.websocket.errorTitle', 'Real-time Feed Error'),
          description: t('dashboard.websocket.errorDescription', 'There was an issue with the live price feed. Attempting to reconnect.'),
          variant: "destructive",
        });
      };

      ws.onclose = (event) => {
        console.log(`Binance WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect WebSocket (attempt ${reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay / 1000}s...`);
          setTimeout(connectWebSocket, reconnectDelay);
          toast({
            title: t('dashboard.websocket.disconnectedTitle', 'Real-time Feed Disconnected'),
            description: t('dashboard.websocket.reconnectingDescription', 'Attempting to reconnect to live prices... Attempt {attempt}/{maxAttempts}', {attempt: reconnectAttempts, maxAttempts: maxReconnectAttempts}),
            variant: "destructive",
          });
        } else {
          console.error('Max WebSocket reconnection attempts reached.');
          toast({
            title: t('dashboard.websocket.failedConnectionTitle', 'Real-time Feed Failed'),
            description: t('dashboard.websocket.failedConnectionDescription', 'Could not establish connection to live prices after multiple attempts. Please check your internet connection or try again later.'),
            variant: "destructive",
          });
        }
      };
    }

    connectWebSocket(); 

    return () => {
      if (ws) {
        ws.onclose = null; 
        ws.close();
        console.log('Binance WebSocket closed manually on component unmount.');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast]); 

  // AI Trend Analysis (periodically)
  useEffect(() => {
    let isMounted = true;
    const performAiUpdate = async () => {
      if (!isMounted) return;

      if (cryptoData.some(c => c.value !== 0)) {
          setIsAiLoading(true);
      } else if (!cryptoData.some(c=> c.trendAnalysis)){ 
          setIsAiLoading(true);
      }

      try {
        const currentDataForAI = await new Promise<CryptoCardData[]>(resolve => setCryptoData(prev => {
          resolve(JSON.parse(JSON.stringify(prev))); 
          return prev; 
        }));
        
        if (!isMounted) return;

        const updatedDataWithTrends = await updateAllAiTrends(currentDataForAI);
        
        if (isMounted) {
          setCryptoData(prevData => 
            prevData.map(pd => {
              const trendUpdate = updatedDataWithTrends.find(ud => ud.symbol === pd.symbol);
              return {
                ...pd, 
                trendAnalysis: trendUpdate ? trendUpdate.trendAnalysis : pd.trendAnalysis,
              };
            })
          );
        }
      } catch (error) {
        console.error("Error in performAiUpdate:", error);
      } finally {
        if (isMounted) {
          setIsAiLoading(false);
        }
      }
    };

    performAiUpdate(); 
    const intervalId = setInterval(performAiUpdate, 60000); 

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

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
