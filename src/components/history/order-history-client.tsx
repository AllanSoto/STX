
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { getOrdersForUser } from '@/lib/firebase/orders';
import type { SavedOrder } from '@/lib/types';
import { OrderFilters } from './order-filters';
import { OrderHistoryTable } from './order-history-table';
import { Button } from '@/components/ui/button';
import { Download, Printer, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';

export function OrderHistoryClient() {
  const { translations, language } = useLanguage();
  const { user, loading: authLoading } = useAuth(); // Get user from useAuth
  const { toast } = useToast();
  const t = useCallback((key: string, fallback?: string) => translations[key] || fallback || key, [translations]);

  const [allOrders, setAllOrders] = useState<SavedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to resolve

    if (user) {
      setIsLoading(true);
      setError(null);
      getOrdersForUser(user.uid) 
        .then(setAllOrders)
        .catch(err => {
          console.error("Error fetching orders for user:", err);
          const errorMessage = err.message || t('history.table.loadingError', 'Failed to load order history.');
          setError(errorMessage);
          toast({
            title: t('history.toast.loadErrorTitle', 'Error'),
            description: errorMessage,
            variant: 'destructive',
          });
        })
        .finally(() => setIsLoading(false));
    } else {
      // Not logged in, clear orders and set loading to false
      setAllOrders([]);
      setIsLoading(false);
      setError(null); // No error, just no user
    }
  }, [user, authLoading, t, toast]);

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

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-3xl font-bold mb-8 text-foreground">{t('history.page.title', 'Order History')}</h1>
          <p className="text-lg text-muted-foreground mb-6">{t('history.page.loginPrompt', 'Please log in to view your order history.')}</p>
          <Button asChild>
            <Link href="/login">{t('login.title', 'Login')}</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }


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
        <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto" disabled={filteredOrders.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          {t('history.export.csvButton', 'Export to CSV')}
        </Button>
        <Button onClick={handlePrintPDF} variant="outline" className="w-full sm:w-auto" disabled={filteredOrders.length === 0}>
          <Printer className="mr-2 h-4 w-4" />
          {t('history.export.pdfButton', 'Export to PDF (Print)')}
        </Button>
      </div>

      {error ? (
        <div className="text-center py-10">
          <p className="text-destructive">{error}</p>
        </div>
      ) : (
        <OrderHistoryTable orders={filteredOrders} t={t} currentLanguage={language} />
      )}
    </div>
  );
}

