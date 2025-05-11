// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { CryptoDisplayCard } from '@/components/dashboard/crypto-display-card';
import { OrderOpportunitySimulator } from '@/components/dashboard/order-opportunity-simulator';
import { PortfolioBalanceDisplay } from '@/components/dashboard/portfolio-balance-display';
import type { CryptoCardData } from '@/components/dashboard/types';
import { initialCryptoData } from '@/components/dashboard/types';
import { analyzeCryptoTrend } from '@/ai/flows/analyze-crypto-trends';
import type { CryptoSymbol } from '@/lib/constants';
import { CRYPTO_SYMBOLS, COIN_MAPPINGS_WS, QUOTE_CURRENCY } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { saveDailyPortfolioSnapshot } from '@/lib/firebase/portfolioSnapshots';
import { format } from 'date-fns';

const COINCAP_WS_URL = 'wss://ws.coincap.io/prices?assets=';
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
const BINANCE_API_REST_BASE_URL = 'https://api.binance.com/api/v3';

const BINANCE_API_REFRESH_INTERVAL = 5000; // 5 seconds for Binance REST fallback
const AI_ANALYSIS_INITIAL_DELAY = 7000; // 7 seconds
const AI_ANALYSIS_INTERVAL = 60000 * 5; // 5 minutes for AI analysis

const coinCapAssetIds = CRYPTO_SYMBOLS.map(s => COIN_MAPPINGS_WS[s].coincapId).join(',');
const binanceSymbolsForREST = CRYPTO_SYMBOLS.map(s => COIN_MAPPINGS_WS[s].binanceSymbol);

const SYMBOLS_TO_DISPLAY_ON_CARDS: CryptoSymbol[] = ['BTC', 'ETH', 'SOL', 'XRP'];

function getMockRecentPriceData(symbol: CryptoSymbol, currentPrice: number): string {
    const prices = [currentPrice];
    for (let i = 0; i < 9; i++) {
        const priceFluctuation = (Math.random() - 0.5) * 0.02 * currentPrice;
        prices.unshift(Math.max(0, currentPrice - priceFluctuation * (i + 1)));
    }
    return prices.map(p => p.toFixed(Math.max(2, (currentPrice < 1 ? 5 : 2)))).join(',');
}

async function updateAllAiTrendsExternal(currentCryptoData: CryptoCardData[]): Promise<CryptoCardData[]> {
  const dataToAnalyze = currentCryptoData.filter(crypto => SYMBOLS_TO_DISPLAY_ON_CARDS.includes(crypto.symbol) && crypto.value > 0);
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
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const { translations } = useLanguage();
  const { toast } = useToast();
  const { user, isConnectedToBinance: isPrivateApiConnected } = useAuth();

  const webSocketRef = useRef<WebSocket | null>(null);
  const binanceFallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cryptoDataRef = useRef<CryptoCardData[]>(initialCryptoData);
  const lastSnapshotSaveAttemptDate = useRef<string | null>(null);

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

  // Save daily portfolio snapshot
  useEffect(() => {
    const trySaveSnapshot = async () => {
      if (user?.id && cryptoDataRef.current.some(cd => SYMBOLS_TO_DISPLAY_ON_CARDS.includes(cd.symbol) && cd.value > 0)) {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        if (lastSnapshotSaveAttemptDate.current === todayStr) {
          return; // Already attempted to save today
        }
        
        const portfolioValue = cryptoDataRef.current
          .filter(cd => SYMBOLS_TO_DISPLAY_ON_CARDS.includes(cd.symbol) && cd.value > 0)
          .reduce((sum, cd) => sum + cd.value, 0); // Assumes 1 unit of each for mock portfolio

        if (portfolioValue > 0) {
          try {
            console.log(`Attempting to save snapshot for ${todayStr} with value ${portfolioValue}`);
            await saveDailyPortfolioSnapshot(user.id, today, portfolioValue);
            lastSnapshotSaveAttemptDate.current = todayStr; // Mark as attempted
            console.log(`Successfully saved portfolio snapshot for ${todayStr}.`);
          } catch (error) {
            console.error('Failed to save daily portfolio snapshot:', error);
            // Don't toast this error as it's a background task.
          }
        }
      }
    };

    // Attempt to save snapshot when prices are available
    if (!isPricesLoading) {
      trySaveSnapshot();
    }
  }, [user, isPricesLoading, cryptoData]); // Re-run if cryptoData changes, but internal logic prevents multiple saves per day


  const fetchBinancePricesREST = useCallback(async (showToastOnError = true) => {
    console.log('Fetching Binance prices via REST API...');
    try {
      const symbolsParam = JSON.stringify(binanceSymbolsForREST);
      const response = await fetch(`${BINANCE_API_REST_BASE_URL}/ticker/price?symbols=${symbolsParam}`);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Binance API error (REST):', errorData, 'Status:', response.status, 'URL:', `${BINANCE_API_REST_BASE_URL}/ticker/price?symbols=${symbolsParam}`);
        throw new Error(t('dashboard.api.binance.fetchError', 'Failed to fetch prices from Binance: {status}', { status: response.statusText }));
      }
      const data: Array<{ symbol: string; price: string }> = await response.json();
      
      setCryptoData(prevData =>
        prevData.map(crypto => {
          const binanceSymbol = COIN_MAPPINGS_WS[crypto.symbol].binanceSymbol;
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
      if (isPricesLoading) setIsPricesLoading(false);
    } catch (error) {
      console.error('Error fetching Binance prices (REST):', error);
      if (showToastOnError) {
        toast({
          title: t('dashboard.api.binance.errorTitle', 'Price Fetch Error (Binance)'),
          description: error instanceof Error ? error.message : t('dashboard.api.binance.unknownError', 'Could not fetch live prices from Binance.'),
          variant: "destructive",
        });
      }
    }
  }, [t, toast, isPricesLoading]);

  const startBinanceRestFallback = useCallback(() => {
    if (binanceFallbackIntervalRef.current) clearInterval(binanceFallbackIntervalRef.current);
    fetchBinancePricesREST(); 
    binanceFallbackIntervalRef.current = setInterval(() => fetchBinancePricesREST(false), BINANCE_API_REFRESH_INTERVAL);
    console.log('Started Binance REST fallback interval.');
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
        webSocketRef.current = null; // Reset ref
    }

    console.log(`Attempting to connect to Binance WebSocket: ${BINANCE_WS_URL}`);
    const ws = new WebSocket(BINANCE_WS_URL);
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log('Binance WebSocket connected.');
      setIsWebSocketConnected(true);
      if (isPricesLoading) setIsPricesLoading(false); 
      if (binanceFallbackIntervalRef.current) {
        clearInterval(binanceFallbackIntervalRef.current);
        binanceFallbackIntervalRef.current = null;
        console.log('Cleared Binance REST fallback interval as WebSocket connected.');
      }
    };

    ws.onmessage = (event) => {
      try {
        const messageArray = JSON.parse(event.data as string) as Array<{ e: string; E: number; s: string; c: string; /* other fields */ }>;
        
        setCryptoData(prevData => {
          let changed = false;
          const newData = prevData.map(cd => {
            const binanceTicker = COIN_MAPPINGS_WS[cd.symbol]?.binanceSymbol;
            if (!binanceTicker) return cd; // Should not happen if mappings are correct

            const tickerData = messageArray.find(item => item.s === binanceTicker);
            if (tickerData) {
              const newPrice = parseFloat(tickerData.c);
              if (cd.value !== newPrice) {
                changed = true;
                return { ...cd, previousValue: cd.value !== 0 ? cd.value : newPrice, value: newPrice };
              }
            }
            return cd;
          });
          if(changed) return newData;
          return prevData;
        });
      } catch (error) {
        console.error('Error processing Binance WebSocket message:', error, event.data);
      }
    };

    ws.onerror = (event: Event) => {
      console.error('Binance WebSocket error event:', event); 
      setIsWebSocketConnected(false);
      
      let errorDetailsMessage = t('dashboard.websocket.errorDescriptionBinance', 'Connection to Binance live price feed failed. Falling back to periodic updates.');
      if (event instanceof ErrorEvent && event.message) {
         errorDetailsMessage = t('dashboard.websocket.errorMessage', 'Error message: {message}, Type: {type}', {message: event.message, type: event.type});
      } else if (event.type) {
         errorDetailsMessage = t('dashboard.websocket.eventType', 'Event type: {type}', {type: event.type});
      }
      
      console.error(
        `Binance WebSocket detailed error: ${errorDetailsMessage}. WebSocket readyState: ${ws?.readyState}.`
      );
      
      toast({
        title: t('dashboard.websocket.errorTitle', 'WebSocket Error'),
        description: t('dashboard.websocket.errorDescriptionBinance', 'Connection to Binance live price feed failed. Falling back to Binance periodic updates.'),
        variant: "warning",
      });

      if (webSocketRef.current) {
          webSocketRef.current.close(); // Ensure closure
          webSocketRef.current = null;
      }
      startBinanceRestFallback();
    };

    ws.onclose = (event: CloseEvent) => {
      console.log(`Binance WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}, Was Clean: ${event.wasClean}`);
      setIsWebSocketConnected(false);
      if (!event.wasClean && !binanceFallbackIntervalRef.current) { 
        console.log('Binance WebSocket closed unexpectedly, attempting to set up Binance REST fallback.');
        startBinanceRestFallback();
      }
    };
  }, [t, toast, startBinanceRestFallback, isPricesLoading]);


  useEffect(() => {
    connectWebSocket();

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.onopen = null;
        webSocketRef.current.onmessage = null;
        webSocketRef.current.onerror = null;
        webSocketRef.current.onclose = null;
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      if (binanceFallbackIntervalRef.current) {
        clearInterval(binanceFallbackIntervalRef.current);
        binanceFallbackIntervalRef.current = null;
      }
    };
  }, [connectWebSocket]);

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
            description: error instanceof Error ? error.message : t('dashboard.ai.errorDescription', 'Could not update AI trends.'),
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
        if (isMounted && cryptoDataRef.current.some(c => c.value > 0)) {
            performAiUpdate(); 
            aiIntervalTimerId = setInterval(() => {
                if (isMounted) performAiUpdate();
            }, AI_ANALYSIS_INTERVAL);
        } else if (isMounted) {
          // if no prices loaded yet, reschedule the first AI update slightly later
           setTimeout(() => {
             if (isMounted && cryptoDataRef.current.some(c => c.value > 0)) performAiUpdate();
           }, AI_ANALYSIS_INITIAL_DELAY);
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
  }, [t, toast]); // Removed cryptoData from deps to avoid re-triggering AI on every price tick

  const cryptoPricesForSimulator = useMemo(() => 
    cryptoData.reduce((acc, curr) => {
      if (curr.value !== 0) {
        acc[curr.symbol] = curr.value;
      }
      return acc;
    }, {} as Record<CryptoSymbol, number>),
  [cryptoData]);
  
  const filteredCryptoDataForDisplay = useMemo(() => {
    return cryptoData.filter(cd => SYMBOLS_TO_DISPLAY_ON_CARDS.includes(cd.symbol));
  }, [cryptoData]);


  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('dashboard.title', 'Dashboard')}</h1>
        
        {!isWebSocketConnected && !binanceFallbackIntervalRef.current && (
          <Card className="mb-8 bg-destructive/10 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">{t('dashboard.connectionStatus.title', 'Connection Issue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive-foreground">
                {t('dashboard.connectionStatus.noFeed', 'Currently not receiving live price updates. Attempting to connect...')}
              </p>
            </CardContent>
          </Card>
        )}

        {isPrivateApiConnected ? (
           <PortfolioBalanceDisplay cryptoPrices={cryptoPricesForSimulator}/>
        ) : (
            <Card className="mb-8 shadow-lg bg-secondary/30">
                <CardHeader>
                    <CardTitle>{t('dashboard.portfolioBalance', 'Portfolio Balance')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                       {t('dashboard.portfolioBalance.publicSourceMessage', "Private Binance API not connected or restricted. Displaying market data from public source.")}
                    </p>
                </CardContent>
            </Card>
        )}

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">{t('dashboard.marketOverview', 'Market Overview')}</h2>
          {isPricesLoading && filteredCryptoDataForDisplay.every(c => c.value === 0) ? (
             <p>{t('dashboard.loadingPrices', 'Loading live prices...')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCryptoDataForDisplay.map((data, i) => (
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
