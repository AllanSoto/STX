// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { CryptoDisplayCard } from '@/components/dashboard/crypto-display-card';
import { OrderOpportunitySimulator } from '@/components/dashboard/order-opportunity-simulator';
import type { CryptoCardData } from '@/components/dashboard/types';
import { initialCryptoData } from '@/components/dashboard/types';
import { analyzeCryptoTrend } from '@/ai/flows/analyze-crypto-trends';
import type { CryptoSymbol, PriceAlert } from '@/lib/types';
import { CRYPTO_SYMBOLS, COIN_DATA, QUOTE_CURRENCY } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
// useAuth import removed as auth is disabled
// import { useAuth } from '@/hooks/use-auth'; 
// Firebase alert functions might be affected as they require userId.
// UI elements calling these will be disabled if they require a user.
import { getActivePriceAlertsForUser, deactivatePriceAlert, savePriceAlert, updatePriceAlert, deletePriceAlert } from '@/lib/firebase/alerts';
import { AlertModal } from '@/components/dashboard/alert-modal';
import type { TrendAnalysis } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchCoinGeckoHistoricalPrices } from '@/services/coingecko';
// import { Button } from '@/components/ui/button'; // Not used directly after auth removal for redirection
// import Link from 'next/link'; // Not used directly after auth removal for redirection
import { Loader2, WifiOff } from 'lucide-react'; 


const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';
const BINANCE_API_REST_BASE_URL = 'https://api.binance.com/api/v3';

const BINANCE_API_REFRESH_INTERVAL = 5000; 
const AI_ANALYSIS_INITIAL_DELAY = 5000; 
const AI_ANALYSIS_INTERVAL = 60000 * 1; 
const ALERT_CHECK_INTERVAL = 10000; 


const binanceSymbolsForREST = CRYPTO_SYMBOLS.map(s => COIN_DATA[s]?.binanceSymbol).filter(Boolean) as string[];


const SYMBOLS_TO_DISPLAY_ON_CARDS: CryptoSymbol[] = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];


async function updateAllAiTrendsExternal(currentCryptoData: CryptoCardData[], tGlobal: (key: string, fallback?: string, vars?: Record<string, string | number>) => string): Promise<CryptoCardData[]> {
  const dataToAnalyze = currentCryptoData.filter(crypto => SYMBOLS_TO_DISPLAY_ON_CARDS.includes(crypto.symbol) && crypto.value > 0);
  if (dataToAnalyze.length === 0) return currentCryptoData;

  const dataPromises = dataToAnalyze.map(async (crypto) => {
    const recentPriceData = await fetchCoinGeckoHistoricalPrices(crypto.symbol, 30); 
    if (!recentPriceData) {
      console.warn(`Could not fetch historical prices for ${crypto.symbol} for AI trend analysis.`);
      const errorTrendAnalysis: TrendAnalysis = {
        trend: 'sideways', 
        confidence: 0,
        reason: tGlobal('dashboard.ai.historicalDataError', 'Could not fetch historical data for {symbol}.', {symbol: crypto.symbol}),
      };
      return { ...crypto, trendAnalysis: errorTrendAnalysis };
    }
    try {
      const trendAnalysisOutput = await analyzeCryptoTrend({ cryptoSymbol: crypto.symbol, recentPriceData });
      return { ...crypto, trendAnalysis: trendAnalysisOutput };
    } catch (error) {
      console.error(`Client-side error calling analyzeCryptoTrend for ${crypto.symbol}:`, error);
      const errorReason = error instanceof Error ? error.message : tGlobal('dashboard.ai.errorDescription', 'Could not update AI trends.');
      const errorTrendAnalysis: TrendAnalysis = {
        trend: 'sideways', 
        confidence: 0,
        reason: tGlobal('dashboard.ai.clientErrorReason', 'Client error fetching trend for {symbol}: {details}', {symbol: crypto.symbol, details: errorReason }),
      };
      return { ...crypto, trendAnalysis: errorTrendAnalysis };
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
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  // const { user, loading: authLoading } = useAuth(); // Auth removed

  const webSocketRef = useRef<WebSocket | null>(null);
  const binanceFallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cryptoDataRef = useRef<CryptoCardData[]>(initialCryptoData);

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertCryptoSymbol, setAlertCryptoSymbol] = useState<CryptoSymbol | null>(null);
  const [alertCurrentPrice, setAlertCurrentPrice] = useState<number | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<PriceAlert[]>([]);
  const activeAlertsRef = useRef<PriceAlert[]>([]);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null); 


  useEffect(() => {
    cryptoDataRef.current = cryptoData;
  }, [cryptoData]);
  
  useEffect(() => {
    activeAlertsRef.current = activeAlerts;
  }, [activeAlerts]); 


  const t = useCallback((key: string, fallback?: string, vars?: Record<string, string | number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        if (typeof msg === 'string') {
            msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
        }
      });
    }
    return String(msg);
  }, [translations]);
  
  // Auth state update log removed
  // useEffect(() => {
  //   console.log('[DashboardPage] Auth State Update:', { authLoading, userEmail: user?.email });
  // }, [authLoading, user]);
  

  const fetchActiveAlerts = useCallback(async () => {
    // if (!user) return; // User check removed
    setAlertsError(null); 
    try {
      // Fetching user-specific alerts is disabled without auth.
      // const alerts = await getActivePriceAlertsForUser(user.uid);
      // setActiveAlerts(alerts);
      setActiveAlerts([]); // Default to no alerts
      setAlertsError(t('auth.disabled.alertsUnavailable', 'Price alerts are unavailable without user accounts.'));
      console.warn("Alert fetching disabled: User authentication removed.");
    } catch (error: any) {
      console.error("Error fetching active alerts (would be disabled):", error);
      const errorMessage = error.message || t('dashboard.alerts.fetchErrorDescription', 'Could not load your active price alerts.');
      setAlertsError(errorMessage);
      // Toast for offline remains relevant
      if (error.message && error.message.includes('offline')) {
        toast({
            title: t('firebase.offline.title', 'Offline'),
            description: t('firebase.offline.fetchError', 'Could not load alerts. You appear to be offline.'),
            variant: 'destructive',
        });
      } else {
        // This toast might not be relevant if the feature is disabled
        // toast({
        //     title: t('dashboard.alerts.fetchErrorTitle', 'Alerts Error'),
        //     description: errorMessage,
        //     variant: 'destructive',
        // });
      }
    }
  }, [/*user,*/ t, toast]); // user removed from dependencies

  useEffect(() => {
    // if(user) { // User check removed
    fetchActiveAlerts();
    // } else {
    //   setActiveAlerts([]); 
    //   setAlertsError(null);
    // }
  }, [/*user,*/ fetchActiveAlerts]); // user removed


  const handleOpenAlertModal = (symbol: CryptoSymbol, price: number, alertToEdit?: PriceAlert) => {
    // if (!user) { // User check removed
    //   toast({ title: t('alertModal.toast.authErrorTitle', 'Authentication Required'), description: t('alertModal.toast.authErrorDescriptionLoginToSet', 'Please log in to set price alerts.'), variant: 'warning'});
    //   return;
    // }
    toast({ title: t('auth.disabled.title', 'Feature Disabled'), description: t('auth.disabled.alertsUnavailableShort', 'Price alerts are unavailable without user accounts.'), variant: 'warning'});
    // Optionally, still open modal in a read-only or informational mode if desired.
    // For now, just show toast and don't open.
    return; 
    // setAlertCryptoSymbol(symbol);
    // setAlertCurrentPrice(price);
    // setEditingAlert(alertToEdit || null);
    // setIsAlertModalOpen(true);
  };

  const handleCloseAlertModal = () => {
    setIsAlertModalOpen(false);
    setAlertCryptoSymbol(null);
    setAlertCurrentPrice(null);
    setEditingAlert(null);
  };

  const handleAlertSaved = () => {
    fetchActiveAlerts(); 
  };


  const fetchBinancePricesREST = useCallback(async (showToastOnError = true) => {
    if (binanceSymbolsForREST.length === 0) {
      console.warn("No symbols configured for Binance REST API fetch.");
      if (isPricesLoading) setIsPricesLoading(false);
      return;
    }
    try {
      const symbolsParam = JSON.stringify(binanceSymbolsForREST);
      const response = await fetch(`${BINANCE_API_REST_BASE_URL}/ticker/price?symbols=${symbolsParam}`);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Binance API error (REST):', errorData, 'Status:', response.status, 'URL:', `${BINANCE_API_REST_BASE_URL}/ticker/price?symbols=${symbolsParam}`);
        throw new Error(t('dashboard.api.binance.fetchError', 'Failed to fetch prices from Binance: {status}', { status: response.statusText }));
      }
      const data: Array<{ symbol: string; price: string }> = await response.json();
      
      setCryptoData(prevData => {
        let pricesActuallyChanged = false;
        const updatedData = prevData.map(crypto => {
            const binanceSymbolInfo = COIN_DATA[crypto.symbol];
            if (!binanceSymbolInfo) return crypto;
            const binanceSymbol = binanceSymbolInfo.binanceSymbol;
            const priceData = data.find(d => d.symbol === binanceSymbol);
            if (priceData) {
                const newPrice = parseFloat(priceData.price);
                if (crypto.value !== newPrice) {
                    pricesActuallyChanged = true;
                    return {
                        ...crypto,
                        previousValue: crypto.value !== 0 ? crypto.value : newPrice,
                        value: newPrice,
                    };
                }
            }
            return crypto;
        });

        if (pricesActuallyChanged) {
            if (isPricesLoading) setIsPricesLoading(false);
            return updatedData;
        }
        if (isPricesLoading) setIsPricesLoading(false);
        return prevData; 
      });
      if (isPricesLoading && data.length === 0 && binanceSymbolsForREST.length > 0) {
        setIsPricesLoading(false); 
      }

    } catch (error) {
      console.error('Error fetching Binance prices (REST):', error);
      if (showToastOnError) {
        toast({
          title: t('dashboard.api.binance.errorTitle', 'Price Fetch Error (Binance)'),
          description: error instanceof Error ? error.message : t('dashboard.api.binance.unknownError', 'Could not fetch live prices from Binance.'),
          variant: "destructive",
        });
      }
      if (isPricesLoading) setIsPricesLoading(false);
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
        webSocketRef.current = null;
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
        const messageArray = JSON.parse(event.data as string) as Array<{ e: string; E: number; s: string; c: string; }>;
        
        setCryptoData(prevData => {
          let changed = false;
          const newData = prevData.map(cd => {
            const binanceSymbolInfo = COIN_DATA[cd.symbol];
            if (!binanceSymbolInfo) return cd;
            const binanceTicker = binanceSymbolInfo.binanceSymbol;
            
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
        description: t('dashboard.websocket.errorDescriptionBinanceFallback', 'Binance WebSocket failed. Using REST fallback.'),
        variant: "warning",
      });

      if (webSocketRef.current) {
          webSocketRef.current.close(); 
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
      const relevantCryptoHasPrice = cryptoDataRef.current
        .filter(cd => SYMBOLS_TO_DISPLAY_ON_CARDS.includes(cd.symbol))
        .some(cd => cd.value > 0);

      if (!isMounted || !relevantCryptoHasPrice) {
        if(relevantCryptoHasPrice === false && isMounted) {
            console.log("AI Update skipped: No relevant crypto has a price > 0 for analysis.");
        }
        if (isMounted) setIsAiLoading(false); 
        return;
      }

      setIsAiLoading(true);
      try {
        const currentDataForAI = JSON.parse(JSON.stringify(cryptoDataRef.current)) as CryptoCardData[];
        const updatedDataWithTrends = await updateAllAiTrendsExternal(currentDataForAI, t);
        
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
      if (isMounted) {
        performAiUpdate();
        if (aiIntervalTimerId) clearInterval(aiIntervalTimerId);
        aiIntervalTimerId = setInterval(performAiUpdate, AI_ANALYSIS_INTERVAL);
      }
    }, AI_ANALYSIS_INITIAL_DELAY);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeoutId);
      if (aiIntervalTimerId) {
        clearInterval(aiIntervalTimerId);
      }
    };
  }, [t, toast]); 

   useEffect(() => {
    let alertIntervalId: NodeJS.Timeout | null = null;

    const checkAlerts = () => {
      // if (!user || activeAlertsRef.current.length === 0 || cryptoDataRef.current.every(c => c.value === 0)) { // User check removed
      if (activeAlertsRef.current.length === 0 || cryptoDataRef.current.every(c => c.value === 0)) {
        return;
      }

      const currentPricesMap = new Map(cryptoDataRef.current.map(c => [c.symbol, c.value]));

      activeAlertsRef.current.forEach(async (alert) => {
        const currentPrice = currentPricesMap.get(alert.symbol);
        if (currentPrice === undefined || currentPrice === 0) return;

        let triggered = false;
        if (alert.direction === 'above' && currentPrice > alert.targetPrice) {
          triggered = true;
        } else if (alert.direction === 'below' && currentPrice < alert.targetPrice) {
          triggered = true;
        }

        if (triggered) {
          toast({
            title: t('dashboard.alerts.triggeredTitle', 'Price Alert Triggered!'),
            description: t('dashboard.alerts.triggeredDescription', '{symbol} has reached your target price of ${targetPrice}. Current price: ${currentPrice}.', {
              symbol: alert.symbol,
              targetPrice: alert.targetPrice.toLocaleString(),
              currentPrice: currentPrice.toLocaleString()
            }),
            duration: 10000, 
          });
          // await deactivatePriceAlert(user.uid, alert.id); // User-specific action disabled
          console.warn("Alert triggered, but deactivation is disabled without user auth:", alert.id);
          fetchActiveAlerts(); 
        }
      });
    };

    // if (user) { // User check removed
      alertIntervalId = setInterval(checkAlerts, ALERT_CHECK_INTERVAL);
    // } else if (alertIntervalId) {
    //   clearInterval(alertIntervalId); 
    // }
    
    return () => {
      if (alertIntervalId) clearInterval(alertIntervalId);
    };
  }, [/*user,*/ t, toast, fetchActiveAlerts]); // user removed


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


  // Auth loading check removed as auth is disabled
  // if (authLoading) {
  //   console.log('[DashboardPage] Rendering loader due to authLoading=true');
  //   return (
  //     <MainLayout>
  //       <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
  //         <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //         <p className="mt-2 text-muted-foreground">{t('dashboard.loadingAuth', 'Verifying session...')}</p>
  //       </div>
  //     </MainLayout>
  //   );
  // }

  // Login prompt removed as auth is disabled
  // if (!user && !authLoading) {
  //   console.log('[DashboardPage] No user and not authLoading, redirecting to login');
  //   return (
  //     <MainLayout>
  //       <div className="container mx-auto py-8 px-4 text-center">
  //         <h1 className="text-3xl font-bold mb-8 text-foreground">{t('dashboard.title', 'Dashboard')}</h1>
  //         <p className="text-lg text-muted-foreground mb-6">{t('dashboard.loginPrompt', 'Please log in to view the dashboard and use SimulTradex features.')}</p>
  //         <Button asChild>
  //           <Link href="/login">{t('login.title', 'Login')}</Link>
  //         </Button>
  //       </div>
  //     </MainLayout>
  //   );
  // }


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
         {!isWebSocketConnected && binanceFallbackIntervalRef.current && (
          <Card className="mb-8 bg-yellow-500/10 border-yellow-500/50">
            <CardHeader>
              <CardTitle className="text-yellow-600 dark:text-yellow-400">{t('dashboard.connectionStatus.fallbackTitle', 'Using Fallback Connection')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 dark:text-yellow-300">
                {t('dashboard.connectionStatus.restFallbackActive', 'WebSocket connection failed. Using periodic REST API updates for prices.')}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8 shadow-lg bg-secondary/30">
            <CardHeader>
                <CardTitle>{t('dashboard.portfolioBalance', 'Portfolio Balance')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                   {/* Updated message as Binance API keys are no longer a planned feature */}
                   {t('dashboard.portfolioBalance.publicSourceMessage', "Displaying market data from public source.")}
                </p>
                 {alertsError && (
                    <div className="mt-4 p-3 text-sm text-destructive-foreground bg-destructive/20 rounded-md flex items-start">
                        <WifiOff className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">{t('dashboard.alerts.fetchErrorTitle', 'Alerts Error')}</p>
                            <p>{alertsError}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">{t('dashboard.marketOverview', 'Market Overview')}</h2>
          {isPricesLoading && filteredCryptoDataForDisplay.every(c => c.value === 0) ? (
             <p>{t('dashboard.loadingPrices', 'Loading live prices...')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredCryptoDataForDisplay.map((data, i) => (
                <CryptoDisplayCard 
                  key={data.symbol || i} 
                  data={data} 
                  isLoading={isPricesLoading && data.value === 0} 
                  isAiTrendLoading={isAiLoading && !data.trendAnalysis && data.value !==0}
                  onSetAlertClick={() => handleOpenAlertModal(data.symbol, data.value, activeAlerts.find(a => a.symbol === data.symbol))}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <OrderOpportunitySimulator cryptoPrices={cryptoPricesForSimulator} />
        </section>
      </div>
       <AlertModal
        isOpen={isAlertModalOpen}
        onClose={handleCloseAlertModal}
        cryptoSymbol={alertCryptoSymbol}
        currentPrice={alertCurrentPrice}
        existingAlert={editingAlert}
        onAlertSaved={handleAlertSaved}
      />
    </MainLayout>
  );
}
