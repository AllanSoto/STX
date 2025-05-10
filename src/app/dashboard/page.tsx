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
    // Only analyze if there's a price and no recent analysis, or if analysis is explicitly needed.
    if (crypto.value === 0 && !crypto.trendAnalysis) { // Don't analyze if price is 0 and no prior analysis
        return crypto; // Return unchanged crypto data
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

      console.log(`Attempting to connect to Binance WebSocket: ${wsUrl}`);
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
        console.log('Raw WebSocket message received:', event.data); 
        try {
          const message = JSON.parse(event.data as string);
          // Binance sends different structures for combined streams vs single.
          // For combined streams, the actual trade data is usually under a 'data' property.
          // For single streams (e.g. btcusdt@trade), it's directly in the message.
          const tradeData = message.data || message;


          if (tradeData && tradeData.s && tradeData.p) { // s = symbol, p = price
            const symbol = tradeData.s.replace('USDT', '').toUpperCase() as CryptoSymbol;
            const newPrice = parseFloat(tradeData.p);
            console.log(`Parsed trade: Symbol=${symbol}, Price=${newPrice}`);

            let foundSymbol = false;
            setCryptoData(prevData =>
              prevData.map(crypto => {
                if (crypto.symbol === symbol) {
                  foundSymbol = true;
                  const priceBeforeUpdate = crypto.value; 
                  return {
                    ...crypto,
                    previousValue: priceBeforeUpdate, 
                    value: newPrice,                  
                  };
                }
                return crypto;
              })
            );
            if (!foundSymbol) {
                console.warn(`WebSocket: Received price for unmonitored symbol: ${symbol}`);
            }
          } else {
             console.warn('WebSocket: Received message does not match expected trade data structure:', tradeData);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error, event.data);
        }
      };

      ws.onerror = (event: Event) => {
        console.error('Binance WebSocket error object:', event); 
        
        let errorDetailsMessage = 'Unknown WebSocket error occurred.';
        if (event instanceof ErrorEvent) { 
            errorDetailsMessage = `Message: ${event.message || 'N/A'}${event.filename ? `, File: ${event.filename}` : ''}${event.lineno ? `, Line: ${event.lineno}` : ''}`;
        } else if (event.type) { 
            errorDetailsMessage = `Event type: '${event.type}'.`;
        }
        
        console.error(`Binance WebSocket detailed error: ${errorDetailsMessage}. WebSocket readyState: ${ws?.readyState}.`);
        
        toast({
          title: t('dashboard.websocket.errorTitle', 'Real-time Feed Error'),
          description: t('dashboard.websocket.errorDescription', 'There was an issue with the live price feed. Attempting to reconnect.'),
          variant: "destructive",
        });
      };

      ws.onclose = (event: CloseEvent) => {
        console.log(`Binance WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason || 'No reason given'}, Clean: ${event.wasClean}`);
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect WebSocket (attempt ${reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectDelay / 1000}s...`);
          setTimeout(connectWebSocket, reconnectDelay);
          if (!event.wasClean || event.code !== 1000) { 
            toast({
              title: t('dashboard.websocket.disconnectedTitle', 'Real-time Feed Disconnected'),
              description: t('dashboard.websocket.reconnectingDescription', 'Attempting to reconnect to live prices... Attempt {attempt}/{maxAttempts}', {attempt: reconnectAttempts, maxAttempts: maxReconnectAttempts}),
              variant: "destructive",
            });
          }
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
        console.log('Closing Binance WebSocket due to component unmount or effect re-run.');
        ws.onclose = null; 
        ws.close(1000, "Component unmounting"); // Use a standard close code
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast]); // Dependencies: t and toast are stable unless language changes.

  // AI Trend Analysis (periodically)
  useEffect(() => {
    let isMounted = true;
    const performAiUpdate = async () => {
      if (!isMounted) return;

      const shouldLoadAi = cryptoData.some(c => c.value !== 0 && !c.trendAnalysis) || 
                           (cryptoData.every(c => c.value === 0 && !c.trendAnalysis) && isAiLoading); // Keep loading if initial state and AI hasn't run
      
      if (shouldLoadAi && !isAiLoading) { // Set loading to true only if it's not already true
        setIsAiLoading(true);
      }


      try {
        const currentDataForAI = JSON.parse(JSON.stringify(cryptoData)) as CryptoCardData[];
        
        if (!isMounted) return;

        // Filter out cryptos with value 0 before sending to AI, unless no crypto has value yet
        const dataToAnalyze = currentDataForAI.some(c => c.value !== 0) 
          ? currentDataForAI.filter(c => c.value !== 0) 
          : currentDataForAI;


        if (dataToAnalyze.length === 0 && currentDataForAI.some(c => c.value !== 0)) {
          // This case means all cryptos with prices were filtered out, effectively no new analysis needed
           if (isMounted) setIsAiLoading(false); // Stop loading if no data to analyze
           return;
        }
        
        // Only proceed if there's data to analyze or if it's the initial load (all values are 0)
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
    
    const initialDelay = 5000; // Wait 5 seconds for initial prices before first AI run
    const initialAiUpdateTimeout = setTimeout(() => {
        performAiUpdate();
         // Then set up the interval
        const intervalId = setInterval(performAiUpdate, 60000); // AI update every 60 seconds
        // Clear interval on unmount
        return () => {
            clearInterval(intervalId);
        };
    }, initialDelay);


    return () => {
      isMounted = false;
      clearTimeout(initialAiUpdateTimeout);
      // Interval clearing is handled in the return of setTimeout's callback
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run AI effect once on mount, internal logic handles cryptoData via snapshots.

  const isLoadingCards = cryptoData.some(data => data.value === 0) || (isAiLoading && cryptoData.some(data => !data.trendAnalysis && data.value !== 0));


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

