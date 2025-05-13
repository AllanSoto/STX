// src/components/balance/balance-client.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { getOrdersForUser } from '@/lib/firebase/orders';
import type { SavedOrder } from '@/lib/types';
import { BalanceFilters } from './balance-filters';
import { FilteredPeriodSummaryCards } from './filtered-period-summary-cards';
import { BalanceChart } from './balance-chart';
import { DailyPerformanceSummary } from './daily-performance-summary';
import { MonthlyPerformanceSummary } from './monthly-performance-summary';
import { Loader2, WifiOff } from 'lucide-react'; // Added WifiOff
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import Link from 'next/link';
import { Button } from '../ui/button';
import { MainLayout } from '../layout/main-layout'; // Ensure MainLayout is imported if used

export interface ChartDataPoint { 
  name: string; 
  profit: number;
}

export function BalanceClient() {
  const { translations, language } = useLanguage();
  const { user, loading: authLoading } = useAuth(); // Get user and authLoading
  const { toast } = useToast();
  const t = useCallback((key: string, fallback?: string, vars?: Record<string, string|number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        if(typeof msg === 'string') {
             msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
        }
      });
    }
    return String(msg);
  }, [translations]);

  const [allOrders, setAllOrders] = useState<SavedOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [isOfflineError, setIsOfflineError] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [orderProfitChartView, setOrderProfitChartView] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    if (authLoading) return; 

    if (user) {
      setIsOrdersLoading(true);
      setOrdersError(null);
      setIsOfflineError(false);
      getOrdersForUser(user.uid) 
        .then(setAllOrders)
        .catch(err => {
          console.error("Error fetching orders:", err);
          const errorMessage = err.message || t('balance.loadingError', 'Failed to load balance data.');
          setOrdersError(errorMessage);
          if (err.message && err.message.includes('offline')) {
            setIsOfflineError(true);
            toast({
              title: t('firebase.offline.title', 'Offline'),
              description: t('firebase.offline.fetchError', 'Could not load data. You appear to be offline.'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('balance.toast.loadErrorTitle', 'Error'),
              description: errorMessage,
              variant: 'destructive',
            });
          }
        })
        .finally(() => setIsOrdersLoading(false));
    } else {
      setAllOrders([]);
      setIsOrdersLoading(false);
      setOrdersError(null);
      setIsOfflineError(false);
    }
  }, [user, authLoading, t, toast]);


  const filteredOrders = useMemo(() => {
    return allOrders
      .filter(order => {
        const orderDate = order.timestamp;
        if (startDate && orderDate < startDate) return false;
        if (endDate) {
          const endOfDayPeriod = new Date(endDate);
          endOfDayPeriod.setHours(23, 59, 59, 999);
          if (orderDate > endOfDayPeriod) return false;
        }
        return true;
      });
  }, [allOrders, startDate, endDate]);

  const { totalInvested, totalRecovered, netResult } = useMemo(() => {
    let invested = 0;
    let recovered = 0;
    filteredOrders.forEach(order => {
      invested += order.totalBuyValueInQuote;
      recovered += order.totalSellValueInQuote;
    });
    return {
      totalInvested: invested,
      totalRecovered: recovered,
      netResult: recovered - invested,
    };
  }, [filteredOrders]);

  const orderProfitChartData = useMemo(() => {
    if (filteredOrders.length === 0) return [];
    const aggregatedData: Record<string, number> = {};
    filteredOrders.forEach(order => {
      let key: string;
      if (orderProfitChartView === 'daily') {
        key = format(order.timestamp, 'yyyy-MM-dd');
      } else { 
        key = format(order.timestamp, 'yyyy-MM');
      }
      aggregatedData[key] = (aggregatedData[key] || 0) + order.netProfitInQuote;
    });
    return Object.entries(aggregatedData)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [filteredOrders, orderProfitChartView]);

  const dailyPerformance = useMemo(() => {
    const today = new Date();
    const yesterday = subDays(today, 1);

    const todayNetProfit = allOrders
      .filter(order => isWithinInterval(order.timestamp, { start: startOfDay(today), end: endOfDay(today) }))
      .reduce((sum, order) => sum + order.netProfitInQuote, 0);

    const yesterdayNetProfit = allOrders
      .filter(order => isWithinInterval(order.timestamp, { start: startOfDay(yesterday), end: endOfDay(yesterday) }))
      .reduce((sum, order) => sum + order.netProfitInQuote, 0);
    
    return { todayNetProfit, yesterdayNetProfit };
  }, [allOrders]);

  const monthlyPerformance = useMemo(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today); 

    const lastMonthDate = subMonths(today, 1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);

    const currentMonthNetProfit = allOrders
      .filter(order => isWithinInterval(order.timestamp, { start: currentMonthStart, end: currentMonthEnd }))
      .reduce((sum, order) => sum + order.netProfitInQuote, 0);

    const previousMonthNetProfit = allOrders
      .filter(order => isWithinInterval(order.timestamp, { start: lastMonthStart, end: lastMonthEnd }))
      .reduce((sum, order) => sum + order.netProfitInQuote, 0);

    return { currentMonthNetProfit, previousMonthNetProfit };
  }, [allOrders]);


  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = `${t('balance.page.title', 'Balance Overview')} - ${t('app.name', 'SimulTradex')}`;
    }
  }, [t]);

  if (authLoading || isOrdersLoading) {
     return (
       <MainLayout>
        <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t('balance.page.loading', 'Loading balance information...')}</p>
        </div>
      </MainLayout>
    );
  }

  if (!user && !authLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-3xl font-bold mb-8 text-foreground">{t('balance.page.title', 'Balance Overview')}</h1>
          <p className="text-lg text-muted-foreground mb-6">{t('balance.page.loginPrompt', 'Please log in to view your balance information.')}</p>
          <Button asChild>
            <Link href="/login">{t('login.title', 'Login')}</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }
  
  if (ordersError) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 text-center flex flex-col items-center justify-center">
          {isOfflineError && <WifiOff className="h-12 w-12 text-destructive mb-4" />}
          <p className="text-destructive py-10">{ordersError}</p>
        </div>
      </MainLayout>
    );
  }
  
  if (allOrders.length === 0 && !isOrdersLoading && !ordersError && user) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold mb-8 text-foreground">{t('balance.page.title', 'Balance Overview')}</h1>
          <p className="text-muted-foreground text-center py-10">{t('balance.page.noOrdersFound', 'No order data found to display balance information.')}</p>
        </div>
      </MainLayout>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-foreground">{t('balance.page.title', 'Balance Overview')}</h1>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-foreground">{t('balance.performanceSummary.title', 'Performance Snapshots')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <DailyPerformanceSummary 
            todayNetProfit={dailyPerformance.todayNetProfit}
            yesterdayNetProfit={dailyPerformance.yesterdayNetProfit}
            t={t}
            isOffline={isOfflineError}
          />
          <MonthlyPerformanceSummary
            currentMonthNetProfit={monthlyPerformance.currentMonthNetProfit}
            previousMonthNetProfit={monthlyPerformance.previousMonthNetProfit}
            t={t}
            isOffline={isOfflineError}
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-foreground">{t('balance.orderProfit.title', 'Order Profit/Loss Analysis (Filtered)')}</h2>
        <BalanceFilters
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onResetFilters={handleResetFilters}
          t={t}
          disabled={isOfflineError}
        />

        <FilteredPeriodSummaryCards
          totalInvested={totalInvested}
          totalRecovered={totalRecovered}
          netResult={netResult}
          t={t}
          isOffline={isOfflineError}
        />

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('balance.orderProfit.chart.title', 'Net Profit Over Time (from Orders)')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={orderProfitChartView} onValueChange={(value) => setOrderProfitChartView(value as 'daily' | 'monthly')} className="mb-4">
                <TabsList>
                  <TabsTrigger value="daily" disabled={isOfflineError}>{t('balance.chart.view.daily', 'Daily')}</TabsTrigger>
                  <TabsTrigger value="monthly" disabled={isOfflineError}>{t('balance.chart.view.monthly', 'Monthly')}</TabsTrigger>
                </TabsList>
              </Tabs>
              {isOfflineError ? (
                 <div className="text-center py-10 flex flex-col items-center justify-center">
                    <WifiOff className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('firebase.offline.fetchError', 'Could not load chart data. You appear to be offline.')}</p>
                  </div>
              ) : filteredOrders.length > 0 ? (
                  <BalanceChart data={orderProfitChartData} viewType={orderProfitChartView} t={t} currentLanguage={language} />
              ) : (
                  <p className="text-muted-foreground text-center py-10">{t('balance.chart.noData', 'No order data available for the selected period.')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
