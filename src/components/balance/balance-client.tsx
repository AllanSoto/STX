
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { getOrdersForUser } from '@/lib/firebase/orders';
import type { SavedOrder } from '@/lib/types';
import { BalanceFilters } from './balance-filters';
import { BalanceSummaryCards } from './balance-summary-cards';
import { BalanceChart } from './balance-chart';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';

export interface ChartDataPoint {
  name: string; // Date or Month-Year
  profit: number;
}

export function BalanceClient() {
  const { user } = useAuth();
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  const t = useCallback((key: string, fallback?: string) => translations[key] || fallback || key, [translations]);

  const [allOrders, setAllOrders] = useState<SavedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      setError(null);
      getOrdersForUser(user.id)
        .then(setAllOrders)
        .catch(err => {
          console.error(err);
          const errorMessage = err.message || t('balance.loadingError', 'Failed to load balance data.');
          setError(errorMessage);
          toast({
            title: t('balance.toast.loadErrorTitle', 'Error'),
            description: errorMessage,
            variant: 'destructive',
          });
        })
        .finally(() => setIsLoading(false));
    } else if (!user && !isLoading) {
        setIsLoading(false); 
        // User not logged in, no need to fetch. Error state can remain null or set a specific message.
    }
  }, [user?.id, user, isLoading, t, toast]);

  const filteredOrders = useMemo(() => {
    return allOrders
      .filter(order => {
        const orderDate = order.timestamp; // Already a Date object
        if (startDate && orderDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999); // Include the whole end day
          if (orderDate > endOfDay) return false;
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

  const chartData = useMemo(() => {
    if (filteredOrders.length === 0) return [];

    const aggregatedData: Record<string, number> = {};

    filteredOrders.forEach(order => {
      let key: string;
      if (chartView === 'daily') {
        key = format(order.timestamp, 'yyyy-MM-dd');
      } else { // monthly
        key = format(order.timestamp, 'yyyy-MM');
      }
      aggregatedData[key] = (aggregatedData[key] || 0) + order.netProfitInQuote;
    });
    
    return Object.entries(aggregatedData)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime()); // Ensure chronological order

  }, [filteredOrders, chartView]);

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  useEffect(() => {
    // Update document title dynamically based on language
    if (typeof window !== 'undefined') {
      document.title = `${t('balance.page.title', 'Balance Overview')} - ${t('app.name', 'SimulTradex')}`;
    }
  }, [t]);


  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{t('balance.chart.loading', 'Loading chart data...')}</p>
      </div>
    );
  }

  if (error && !user) { // If user is not logged in, error might be misleading.
    // Redirect or show login prompt if not handled by MainLayout
    return (
        <div className="container mx-auto py-8 px-4 text-center">
             <p className="text-destructive py-10">{t('login.description', 'Log in to your account')}</p>
        </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-destructive py-10">{error}</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-foreground">{t('balance.page.title', 'Balance Overview')}</h1>
      
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
        <h2 className="text-2xl font-semibold mb-4 text-foreground">{t('balance.chart.title', 'Profit/Loss Over Time')}</h2>
        <Tabs value={chartView} onValueChange={(value) => setChartView(value as 'daily' | 'monthly')} className="mb-4">
          <TabsList>
            <TabsTrigger value="daily">{t('balance.chart.view.daily', 'Daily')}</TabsTrigger>
            <TabsTrigger value="monthly">{t('balance.chart.view.monthly', 'Monthly')}</TabsTrigger>
          </TabsList>
        </Tabs>
        {filteredOrders.length > 0 ? (
            <BalanceChart data={chartData} viewType={chartView} t={t} currentLanguage={language} />
        ) : (
            <p className="text-muted-foreground text-center py-10">{t('balance.chart.noData', 'No data available for the selected period.')}</p>
        )}
      </div>
    </div>
  );
}
