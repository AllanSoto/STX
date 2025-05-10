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
import { CRYPTO_SYMBOLS } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';

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
  const dataPromises = currentCryptoData.map(async (crypto) => {
    if (crypto.value === 0 && !crypto.trendAnalysis) { 
        return crypto; 
    }
    const recentPriceData = getMockRecentPriceData(crypto.symbol);
    try {
      const trendAnalysis = await analyzeCryptoTrend({ cryptoSymbol: crypto.symbol, recentPriceData });
      return { ...crypto, trendAnalysis };
    } catch (error) {
      console.error(`Error analyzing trend for ${crypto.symbol}:`, error);
      if (error instanceof Error && (error as any).cause) {
        console.error(`Cause of error for ${crypto.symbol}:`, (error as any).cause);
      }
      return { ...crypto, trendAnalysis: crypto.trendAnalysis }; 
    }
  });
  return Promise.all(dataPromises);
}

const cryptoSymbolToCoinCapId = (symbol: CryptoSymbol): string => {
  switch (symbol) {
    case 'BTC': return 'bitcoin';
    case 'ETH': return 'ethereum';
    case 'SOL': return 'solana';
    case 'BNB': return 'binance-coin';
    case 'XRP': return 'ripple';
    default: return ''; // Should not happen
  }
};

const coinCapIdToCryptoSymbol = (id: string): CryptoSymbol | null => {
  for (const symbol of CRYPTO_SYMBOLS) {
    if (cryptoSymbolToCoinCapId(symbol) === id) {
      return symbol;
    }
  }
  return null;
};


export default function DashboardPage() {
  const [cryptoData, setCryptoData] = useState<CryptoCardData[]>(initialCryptoData);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const { translations, language } = useLanguage(); // Get language for stable dependency if needed
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


  // WebSocket for real-time prices from CoinCap
  useEffect(() => {
    const coinCapAssetIds = CRYPTO_SYMBOLS.map(cryptoSymbolToCoinCapId).filter(id => id !== '').join(',');
    const wsUrl = `wss://ws.coincap.io/prices?assets=${coinCapAssetIds}`;
    
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 5000; 

    function connectWebSocket() {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('CoinCap WebSocket already open or connecting.');
        return;
      }

      console.log(`Attempting to connect to CoinCap WebSocket: ${wsUrl}`);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('CoinCap WebSocket connected');
        reconnectAttempts = 0; 
        toast({
          title: t('dashboard.websocket.coincap.connectedTitle', 'Real-time Feed Connected (CoinCap)'),
          description: t('dashboard.websocket.coincap.connectedDescription', 'Live prices from CoinCap are now active.'),
        });
      };

      ws.onmessage = (event) => {
        try {
          const prices = JSON.parse(event.data as string) as Record<string, string>;
          
          setCryptoData(prevData =>
            prevData.map(crypto => {
              const coinCapId = cryptoSymbolToCoinCapId(crypto.symbol);
              if (prices[coinCapId]) {
                const newPrice = parseFloat(prices[coinCapId]);
                return {
                  ...crypto,
                  previousValue: crypto.value !== 0 ? crypto.value : newPrice, // Set previousValue correctly
                  value: newPrice,
                };
              }
              return crypto;
            })
          );
        } catch (error) {
          console.error('Error processing CoinCap WebSocket message:', error, event.data);
        }
      };

      ws.onerror = (event: Event) => {
        console.error('CoinCap WebSocket error event:', event); 
        
        let errorDetailsMessage = 'Unknown WebSocket error occurred with CoinCap.';
        if (event instanceof ErrorEvent) { 
            errorDetailsMessage = `Message: ${event.message || 'N/A'}`;
        } else if (event.type) { 
            errorDetailsMessage = `Event type: '${event.type}'.`;
        }
        
        console.error(`CoinCap WebSocket detailed error: ${errorDetailsMessage}. WebSocket readyState: ${ws?.readyState}.`);
        
        toast({
          title: t('dashboard.websocket.coincap.errorTitle', 'CoinCap Feed Error'),
          description: t('dashboard.websocket.coincap.errorDescription', 'Issue with CoinCap live price feed. Attempting to reconnect.'),
          variant: "destructive",
        });
      };

      ws.onclose = (event: CloseEvent) => {
        console.log(`CoinCap WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason || 'No reason given'}, Clean: ${event.wasClean}`);
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect CoinCap WebSocket (attempt ${reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay / 1000}s...`);
          setTimeout(connectWebSocket, reconnectDelay);
          if (!event.wasClean || event.code !== 1000) { 
            toast({
              title: t('dashboard.websocket.coincap.disconnectedTitle', 'CoinCap Feed Disconnected'),
              description: t('dashboard.websocket.reconnectingDescription', 'Attempting to reconnect to live prices... Attempt {attempt}/{maxAttempts}', {attempt: reconnectAttempts, maxAttempts: maxReconnectAttempts}),
              variant: "destructive",
            });
          }
        } else {
          console.error('Max CoinCap WebSocket reconnection attempts reached.');
          toast({
            title: t('dashboard.websocket.coincap.failedConnectionTitle', 'CoinCap Feed Failed'),
            description: t('dashboard.websocket.failedConnectionDescription', 'Could not connect to CoinCap live prices. Please check your internet or try later.'),
            variant: "destructive",
          });
        }
      };
    }

    connectWebSocket(); 

    return () => {
      if (ws) {
        console.log('Closing CoinCap WebSocket due to component unmount or effect re-run.');
        ws.onclose = null; 
        ws.close(1000, "Component unmounting");
      }
    };
  }, [t, toast]); // Using memoized t and stable toast

  // AI Trend Analysis (periodically)
  useEffect(() => {
    let isMounted = true;
    const performAiUpdate = async () => {
      if (!isMounted) return;

      const shouldLoadAi = cryptoData.some(c => c.value !== 0 && !c.trendAnalysis) || 
                           (cryptoData.every(c => c.value === 0 && !c.trendAnalysis) && isAiLoading);
      
      if (shouldLoadAi && !isAiLoading) {
        setIsAiLoading(true);
      }

      try {
        const currentDataForAI = JSON.parse(JSON.stringify(cryptoData)) as CryptoCardData[];
        if (!isMounted) return;

        const dataToAnalyze = currentDataForAI.some(c => c.value !== 0) 
          ? currentDataForAI.filter(c => c.value !== 0) 
          : currentDataForAI;

        if (dataToAnalyze.length === 0 && currentDataForAI.some(c => c.value !== 0)) {
           if (isMounted) setIsAiLoading(false);
           return;
        }
        
        if (dataToAnalyze.length > 0 || dataToAnalyze.every(d => d.value === 0)) {
            const updatedDataWithTrends = await updateAllAiTrends(dataToAnalyze);
            
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
        }
      } catch (error) {
        console.error("Error in performAiUpdate:", error);
      } finally {
        if (isMounted) {
          setIsAiLoading(false);
        }
      }
    };
    
    const initialDelay = 7000; // Increased delay to allow CoinCap to connect first
    const initialAiUpdateTimeout = setTimeout(() => {
        performAiUpdate();
        const intervalId = setInterval(performAiUpdate, 60000);
        return () => {
            clearInterval(intervalId);
        };
    }, initialDelay);

    return () => {
      isMounted = false;
      clearTimeout(initialAiUpdateTimeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoData]); // Re-run AI if cryptoData changes significantly (e.g. prices are loaded)

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
                isLoading={data.value === 0 || (isAiLoading && !data.trendAnalysis && data.value !==0)} 
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
