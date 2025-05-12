// src/components/balance/balance-client.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { getOrdersForUser } from '@/lib/firebase/orders';
import type { SavedOrder } from '@/lib/types';
import { BalanceFilters } from './balance-filters';
import { BalanceSummaryCards } from './balance-summary-cards';
import { BalanceChart } from './balance-chart'; // For P/L from orders
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';

export interface OrderProfitChartDataPoint {
  name: string; // Date or Month-Year for order profits
  profit: number;
}

export function BalanceClient() {
  const { user } = useAuth();
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  const t = useCallback((key: string, fallback?: string, vars?: Record<string, string|number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return msg;
  }, [translations]);

  // State for Order History P/L
  const [allOrders, setAllOrders] = useState<SavedOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [orderProfitChartView, setOrderProfitChartView] = useState<'daily' | 'monthly'>('daily');

  // Fetch orders
  useEffect(() => {
    if (user?.id) {
      setIsOrdersLoading(true);
      setOrdersError(null);
      getOrdersForUser(user.id)
        .then(setAllOrders)
        .catch(err => {
          console.error("Error fetching orders:", err);
          const errorMessage = err.message || t('balance.loadingError', 'Failed to load balance data.');
          setOrdersError(errorMessage);
          toast({
            title: t('balance.toast.loadErrorTitle', 'Error'),
            description: errorMessage,
            variant: 'destructive',
          });
        })
        .finally(() => setIsOrdersLoading(false));
    } else if (!user) {
        setIsOrdersLoading(false);
    }
  }, [user?.id, user, t, toast]);


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

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = `${t('balance.page.title', 'Balance Overview')} - ${t('app.name', 'SimulTradex')}`;
    }
  }, [t]);

  if (isOrdersLoading && !user) { 
     // Allow rendering basic page structure or a login prompt
  } else if (isOrdersLoading) {
     return (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{t('balance.page.loading', 'Loading balance information...')}</p>
      </div>
    );
  }

  if (ordersError && !user) {
    return (
        <div className="container mx-auto py-8 px-4 text-center">
             <p className="text-destructive py-10">{t('login.required', 'Please log in to view balance information.')}</p>
        </div>
    );
  }
  
  if (ordersError) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-destructive py-10">{ordersError}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-foreground">{t('balance.page.title', 'Balance Overview')}</h1>
      
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-foreground">{t('balance.orderProfit.title', 'Order Profit/Loss Analysis')}</h2>
        <BalanceFilters
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onResetFilters={handleResetFilters}
          t={t}
        />

        <BalanceSummaryCards
          totalInvested={totalInvested}
          totalRecovered={totalRecovered}
          netResult={netResult}
          t={t}
        />

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-foreground">{t('balance.orderProfit.chart.title', 'Net Profit Over Time (from Orders)')}</h3>
          <Tabs value={orderProfitChartView} onValueChange={(value) => setOrderProfitChartView(value as 'daily' | 'monthly')} className="mb-4">
            <TabsList>
              <TabsTrigger value="daily">{t('balance.chart.view.daily', 'Daily')}</TabsTrigger>
              <TabsTrigger value="monthly">{t('balance.chart.view.monthly', 'Monthly')}</TabsTrigger>
            </TabsList>
          </Tabs>
          {filteredOrders.length > 0 ? (
              <BalanceChart data={orderProfitChartData} viewType={orderProfitChartView} t={t} currentLanguage={language} />
          ) : (
              <p className="text-muted-foreground text-center py-10">{t('balance.chart.noData', 'No order data available for the selected period.')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
