// src/components/dashboard/order-opportunity-simulator.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CRYPTO_SYMBOLS, COMMISSION_RATE, QUOTE_CURRENCY as DEFAULT_QUOTE_CURRENCY } from '@/lib/constants';
import type { CryptoSymbol } from '@/lib/constants';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { ScrollArea } from '../ui/scroll-area';

const QUOTE_CURRENCY_FOR_SIMULATOR = 'USDT';
const OPPORTUNITY_PERCENTAGES = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]; // +0.5% to +3.0%

const getSimulatorSchema = (t: (key: string, fallback?: string) => string) => z.object({
  pair: z.string().min(1, { message: t('zod.orderOpportunity.selectPair', 'Please select a trading pair.') }),
  usdtAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.orderOpportunity.positiveUsdtAmount', 'USDT amount must be a positive number.') }),
});

type SimulatorFormValues = z.infer<ReturnType<typeof getSimulatorSchema>>;

interface OrderOpportunitySimulatorProps {
  cryptoPrices: Record<CryptoSymbol, number>;
}

interface SimulatedRow {
  operation: string;
  cantidadCrypto1: string;
  precioMercado: string;
  cantidadCrypto2: string;
  comision: string;
  profitNeto: string;
  profitNetoValue?: number;
}

export function OrderOpportunitySimulator({ cryptoPrices }: OrderOpportunitySimulatorProps) {
  const { translations, language } = useLanguage();
  const t = useCallback((key: string, fallback?: string, vars?: Record<string, string | number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return msg;
  }, [translations]);

  const simulatorSchema = useMemo(() => getSimulatorSchema(t), [language, t]);

  const form = useForm<SimulatorFormValues>({
    resolver: zodResolver(simulatorSchema),
    defaultValues: {
      pair: '',
      usdtAmount: '',
    },
  });

  const [simulatedRows, setSimulatedRows] = useState<SimulatedRow[]>([]);

  const selectedPair = form.watch('pair');
  const usdtAmountStr = form.watch('usdtAmount');

  const tradingPairs = useMemo(() => {
    return CRYPTO_SYMBOLS.map(symbol => `${QUOTE_CURRENCY_FOR_SIMULATOR}/${symbol}`);
  }, []);

  useEffect(() => {
    if (!selectedPair || !usdtAmountStr) {
      setSimulatedRows([]);
      return;
    }

    const usdtAmountNum = parseFloat(usdtAmountStr);
    if (isNaN(usdtAmountNum) || usdtAmountNum <= 0) {
      setSimulatedRows([]);
      return;
    }

    const [, targetCryptoSymbol] = selectedPair.split('/') as [string, CryptoSymbol];
    const marketPrice = cryptoPrices[targetCryptoSymbol];

    if (!marketPrice || marketPrice <= 0) {
      setSimulatedRows([{
        operation: t('dashboard.orderOpportunitySimulator.buyOperationPrefix', 'Compra') + ` ${selectedPair}`,
        cantidadCrypto1: `${usdtAmountNum.toFixed(2)} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        precioMercado: t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'),
        cantidadCrypto2: '',
        comision: '',
        profitNeto: '-',
      }]);
      return;
    }

    const newRows: SimulatedRow[] = [];

    // Compra Row
    const cantidadTargetCryptoBought = usdtAmountNum / marketPrice;
    const compraCommission = usdtAmountNum * COMMISSION_RATE;

    newRows.push({
      operation: t('dashboard.orderOpportunitySimulator.buyOperationPrefix', 'Compra') + ` ${selectedPair}`,
      cantidadCrypto1: `${usdtAmountNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
      precioMercado: `${marketPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: marketPrice < 1 ? 5 : 2 })} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
      cantidadCrypto2: `${cantidadTargetCryptoBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${targetCryptoSymbol}`,
      comision: `${compraCommission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
      profitNeto: '-',
    });

    // Venta Rows
    OPPORTUNITY_PERCENTAGES.forEach(perc => {
      const targetSellPrice = marketPrice * (1 + perc);
      const usdtReceivedFromSale = cantidadTargetCryptoBought * targetSellPrice;
      const ventaCommission = usdtReceivedFromSale * COMMISSION_RATE;
      const netProfit = (usdtReceivedFromSale - usdtAmountNum) - (compraCommission + ventaCommission);

      newRows.push({
        operation: `${t('dashboard.orderOpportunitySimulator.sellOperationPrefix', 'Venta')} ${targetCryptoSymbol}/${QUOTE_CURRENCY_FOR_SIMULATOR} (+${(perc * 100).toFixed(1)}%)`,
        cantidadCrypto1: `${cantidadTargetCryptoBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${targetCryptoSymbol}`,
        precioMercado: `${targetSellPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: targetSellPrice < 1 ? 5 : 2 })} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        cantidadCrypto2: `${usdtReceivedFromSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        comision: `${ventaCommission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        profitNeto: `${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        profitNetoValue: netProfit,
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, usdtAmountStr, cryptoPrices, t]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('dashboard.orderOpportunitySimulator.title', 'Order & Opportunity Simulator')}</CardTitle>
        <CardDescription>{t('dashboard.orderOpportunitySimulator.description', 'Simulate a buy order and see potential sell opportunities at incremental profit percentages.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pair"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dashboard.orderOpportunitySimulator.operationLabel', 'Operation (Pair)')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dashboard.orderOpportunitySimulator.selectPairPlaceholder', 'Select USDT/Crypto pair')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tradingPairs.map((pair) => (
                          <SelectItem key={pair} value={pair}>
                            {pair}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="usdtAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dashboard.orderOpportunitySimulator.usdtAmountLabel', `Amount to Spend (${QUOTE_CURRENCY_FOR_SIMULATOR})`)}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} step="any" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        {simulatedRows.length > 0 ? (
          <ScrollArea className="max-h-[500px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.operation', 'Operación')}</TableHead>
                  <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.amountCrypto1', 'Cantidad Cripto 1')}</TableHead>
                  <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.marketPrice', 'Precio de Mercado')}</TableHead>
                  <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.amountCrypto2', 'Cantidad Cripto 2')}</TableHead>
                  <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.commission', 'Comisión')}</TableHead>
                  <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.netProfit', 'Profit neto')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulatedRows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.operation}</TableCell>
                    <TableCell>{row.cantidadCrypto1}</TableCell>
                    <TableCell>{row.precioMercado}</TableCell>
                    <TableCell>{row.cantidadCrypto2}</TableCell>
                    <TableCell>{row.comision}</TableCell>
                    <TableCell 
                      className={
                        row.profitNetoValue !== undefined 
                        ? (row.profitNetoValue > 0 ? 'text-primary' : row.profitNetoValue < 0 ? 'text-destructive' : '') 
                        : ''
                      }
                    >
                      {row.profitNeto}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            {selectedPair && usdtAmountStr 
              ? t('dashboard.orderOpportunitySimulator.calculating', 'Calculating...') 
              : t('dashboard.orderOpportunitySimulator.enterValuesPrompt', 'Please select a pair and enter USDT amount to see simulation.')
            }
          </p>
        )}
         <p className="text-xs text-muted-foreground mt-4">
            {t('dashboard.orderOpportunitySimulator.commissionInfo', 'Commission is {rate}% for both buy and sell operations.', { rate: (COMMISSION_RATE * 100).toFixed(1) })}
          </p>
      </CardContent>
    </Card>
  );
}
