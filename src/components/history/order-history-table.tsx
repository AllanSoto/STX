
'use client';

import type { SavedOrder } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { enUS, es, fr, hi, zhCN } from 'date-fns/locale';
import type { LanguageCode } from '@/providers/language-provider';

interface OrderHistoryTableProps {
  orders: SavedOrder[];
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
  currentLanguage: LanguageCode;
}

const localeMap: Record<LanguageCode, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  hi: hi,
  zh: zhCN,
};

export function OrderHistoryTable({ orders, t, currentLanguage }: OrderHistoryTableProps) {
  const locale = localeMap[currentLanguage] || enUS;

  const formatPrice = (price: number, quoteCurrency: string, targetCrypto: string) => {
    const digits = price < 0.01 && quoteCurrency === 'USDT' ? 5 : 2; // More precision for low value cryptos vs USDT
     return `${price.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${quoteCurrency}/${targetCrypto}`;
  };

  const formatAmount = (amount: number, currency: string) => {
    const digits = currency === 'USDT' || currency === 'USD' ? 2 : 8; // More precision for cryptos
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${currency}`;
  };


  if (orders.length === 0) {
    return <p className="text-center text-muted-foreground py-10">{t('history.table.noOrders', 'No orders found.')}</p>;
  }

  return (
    <ScrollArea className="max-h-[600px] w-full rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead>{t('history.table.header.timestamp', 'Date/Time')}</TableHead>
            <TableHead>{t('history.table.header.originalPair', 'Pair')}</TableHead>
            <TableHead>{t('history.table.header.targetCrypto', 'Target Crypto')}</TableHead>
            <TableHead className="text-right">{t('history.table.header.buyAmount', 'Bought Amount')}</TableHead>
            <TableHead className="text-right">{t('history.table.header.buyPrice', 'Buy Price')}</TableHead>
            <TableHead className="text-right">{t('history.table.header.buyComm', 'Buy Comm.')}</TableHead>
            <TableHead className="text-right">{t('history.table.header.sellPrice', 'Sell Price')}</TableHead>
            <TableHead className="text-right">{t('history.table.header.sellComm', 'Sell Comm.')}</TableHead>
            <TableHead className="text-right">{t('history.table.header.netProfit', 'Net Profit')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{format(order.timestamp, 'PPpp', { locale })}</TableCell>
              <TableCell>{order.originalPair}</TableCell>
              <TableCell>{order.targetCrypto}</TableCell>
              <TableCell className="text-right">
                {formatAmount(order.amountOfTargetCryptoBought, order.targetCrypto)}
              </TableCell>
              <TableCell className="text-right">
                {formatPrice(order.buyPricePerUnit, order.quoteCurrency, order.targetCrypto)}
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(order.buyCommissionInQuote, order.quoteCurrency)}
              </TableCell>
              <TableCell className="text-right">
                {formatPrice(order.sellPricePerUnit, order.quoteCurrency, order.targetCrypto)}
              </TableCell>
              <TableCell className="text-right">
                 {formatAmount(order.sellCommissionInQuote, order.quoteCurrency)}
              </TableCell>
              <TableCell className={`text-right font-semibold ${order.netProfitInQuote > 0 ? 'text-primary' : order.netProfitInQuote < 0 ? 'text-destructive' : ''}`}>
                {formatAmount(order.netProfitInQuote, order.quoteCurrency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
