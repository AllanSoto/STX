
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
// import { useAuth } from '@/hooks/use-auth'; // Auth removed
import { getOrdersForUser } from '@/lib/firebase/orders';
import type { SavedOrder } from '@/lib/types';
import { OrderFilters } from './order-filters';
import { OrderHistoryTable } from './order-history-table';
import { Button } from '@/components/ui/button';
import { Download, Printer, Loader2, WifiOff } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
// import Link from 'next/link'; // No longer needed for login redirect
import { MainLayout } from '../layout/main-layout'; 


export function OrderHistoryClient() {
  const { translations, language } = useLanguage();
  // const { user, loading: authLoading } = useAuth(); // Auth removed
  const { toast } = useToast();
  const t = useCallback((key: string, fallback?: string) => translations[key] || fallback || key, [translations]);

  const [allOrders, setAllOrders] = useState<SavedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Still true initially, but won't wait for auth
  const [error, setError] = useState<string | null>(null);
  const [isOfflineError, setIsOfflineError] = useState(false);


  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // if (authLoading) return; // Auth removed

    // if (user) { // User check removed; fetch all orders or adapt based on no-auth scenario
      setIsLoading(true);
      setError(null);
      setIsOfflineError(false);
      // Since user is null, getOrdersForUser(null) will return [], as per its implementation.
      // Or, you might want to fetch public/all orders if that's the new desired behavior.
      // For now, assuming it fetches no orders if no user.
      getOrdersForUser(null) 
        .then(fetchedOrders => {
            if (fetchedOrders.length === 0) {
                // If no orders are fetched (which will be the case without a user for user-specific orders)
                // show a message indicating that this feature is now general or disabled.
                setError(t('history.table.noAuthInfo', 'Order history is now general, not tied to specific user accounts.'));
            }
            setAllOrders(fetchedOrders);
        })
        .catch(err => {
          console.error("Error fetching orders (auth disabled):", err);
          const errorMessage = err.message || t('history.table.loadingError', 'Failed to load order history.');
          setError(errorMessage);
          if (err.message && err.message.includes('offline')) {
            setIsOfflineError(true);
             toast({
              title: t('firebase.offline.title', 'Offline'),
              description: t('firebase.offline.fetchError', 'Could not load data. You appear to be offline.'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('history.toast.loadErrorTitle', 'Error'),
              description: errorMessage,
              variant: 'destructive',
            });
          }
        })
        .finally(() => setIsLoading(false));
    // } else {
    //   setAllOrders([]);
    //   setIsLoading(false);
    //   setError(null);
    //   setIsOfflineError(false);
    // }
  }, [/*user, authLoading,*/ t, toast]); // user, authLoading removed

  const filteredOrders = useMemo(() => {
    return allOrders
      .filter(order => {
        const orderDate = order.timestamp; 
        if (startDate && orderDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (orderDate > endOfDay) return false;
        }
        return true;
      })
      .filter(order => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.trim().toLowerCase();
        return (
          order.targetCrypto.toLowerCase().includes(term) ||
          order.originalPair.toLowerCase().includes(term) ||
          order.quoteCurrency.toLowerCase().includes(term)
        );
      });
  }, [allOrders, startDate, endDate, searchTerm]);

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm('');
  };

  const convertToCSV = (data: SavedOrder[]) => {
    const headers = [
      t('history.table.header.timestamp', 'Date/Time'),
      t('history.table.header.originalPair', 'Pair'),
      t('history.table.header.targetCrypto', 'Target Crypto'),
      `${t('history.table.header.buyAmount', 'Bought Amount')} (${t('history.table.header.targetCrypto', 'Target Crypto')})`,
      `${t('history.table.header.buyPrice', 'Buy Price')} (${t('history.table.header.quoteCurrency', 'Quote')}/${t('history.table.header.target')})`,
      `${t('history.table.header.buyComm', 'Buy Comm.')} (${t('history.table.header.quoteCurrency', 'Quote')})`,
      `${t('history.table.header.sellPrice', 'Sell Price')} (${t('history.table.header.quoteCurrency', 'Quote')}/${t('history.table.header.targetCrypto', 'Target')})`,
      `${t('history.table.header.sellComm', 'Sell Comm.')} (${t('history.table.header.quoteCurrency', 'Quote')})`,
      `${t('history.table.header.netProfit', 'Net Profit')} (${t('history.table.header.quoteCurrency', 'Quote')})`
    ].join(',');

    const rows = data.map(order => {
      return [
        format(order.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        order.originalPair,
        order.targetCrypto,
        order.amountOfTargetCryptoBought,
        order.buyPricePerUnit,
        order.buyCommissionInQuote,
        order.sellPricePerUnit,
        order.sellCommissionInQuote,
        order.netProfitInQuote
      ].join(',');
    }).join('\n');
    return `${headers}\n${rows}`;
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast({
        title: t('history.toast.noDataExportTitle', 'No Data'),
        description: t('history.toast.noDataExportDescription', 'There is no data to export.'),
        variant: 'default',
      });
      return;
    }
    const csvString = convertToCSV(filteredOrders);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const filename = `simultradex_order_history_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
       toast({
        title: t('history.toast.csvExportSuccessTitle', 'Export Successful'),
        description: t('history.toast.csvExportSuccessDescription', 'Order history exported to CSV.'),
      });
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (isLoading) { // isLoading can still be true while fetching general data
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Login prompt removed as auth is disabled
  // if (!user) {
  //   return (
  //     <MainLayout>
  //       <div className="container mx-auto py-8 px-4 text-center">
  //         <h1 className="text-3xl font-bold mb-8 text-foreground">{t('history.page.title', 'Order History')}</h1>
  //         <p className="text-lg text-muted-foreground mb-6">{t('history.page.loginPrompt', 'Please log in to view your order history.')}</p>
  //         <Button asChild>
  //           <Link href="/login">{t('login.title', 'Login')}</Link>
  //         </Button>
  //       </div>
  //     </MainLayout>
  //   );
  // }


  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-foreground">{t('history.page.title', 'Order History')}</h1>
      
      <OrderFilters
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onResetFilters={handleResetFilters}
        t={t}
      />

      <div className="my-6 flex flex-col sm:flex-row gap-2">
        <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto" disabled={filteredOrders.length === 0 || isOfflineError}>
          <Download className="mr-2 h-4 w-4" />
          {t('history.export.csvButton', 'Export to CSV')}
        </Button>
        <Button onClick={handlePrintPDF} variant="outline" className="w-full sm:w-auto" disabled={filteredOrders.length === 0 || isOfflineError}>
          <Printer className="mr-2 h-4 w-4" />
          {t('history.export.pdfButton', 'Export to PDF (Print)')}
        </Button>
      </div>

      {error ? (
        <div className="text-center py-10 flex flex-col items-center justify-center">
          {isOfflineError && <WifiOff className="h-12 w-12 text-destructive mb-4" />}
          <p className={isOfflineError ? "text-destructive" : "text-muted-foreground"}>{error}</p>
        </div>
      ) : (
        <OrderHistoryTable orders={filteredOrders} t={t} currentLanguage={language} />
      )}
    </div>
  );
}
