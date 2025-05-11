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
import type { SimulationLogEntry, SimulatedSaleEntry } from '@/lib/types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { saveSimulationToFirebase } from '@/lib/firebase/simulations';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Save } from 'lucide-react';

const QUOTE_CURRENCY_FOR_SIMULATOR = 'USDT';
const OPPORTUNITY_PERCENTAGES = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]; // +0.5% to +3.0%

const getSimulatorSchema = (t: (key: string, fallback?: string) => string) => z.object({
  pair: z.string().min(1, { message: t('zod.orderOpportunity.selectPair', 'Please select a trading pair.') }),
  usdtAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.orderOpportunity.positiveUsdtAmount', 'USDT amount must be a positive number.') }),
  buyPrice: z.string().optional(), // Not directly user-editable for auto-price, but part of form state
});

type SimulatorFormValues = z.infer<ReturnType<typeof getSimulatorSchema>>;

interface OrderOpportunitySimulatorProps {
  cryptoPrices: Record<CryptoSymbol, number>;
}

interface SimulatedRow {
  operation: string;
  cantidadCrypto1: string; // USDT for buy, Crypto for sell
  precioMercado: string;   // Price in USDT
  cantidadCrypto2: string; // Crypto for buy, USDT for sell
  comision: string;        // Commission in USDT
  profitNeto: string;      // Profit in USDT
  profitNetoValue?: number; // For styling
  
  // For saving
  rawUsdtAmount?: number;
  rawMarketPrice?: number;
  rawCryptoAmountBought?: number;
  rawCommission?: number;
  rawSellPrice?: number;
  rawGrossRevenue?: number;
}


export function OrderOpportunitySimulator({ cryptoPrices }: OrderOpportunitySimulatorProps) {
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

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
      usdtAmount: '100', // Default to 100 USDT
      buyPrice: '',
    },
  });

  const [simulatedRows, setSimulatedRows] = useState<SimulatedRow[]>([]);

  const selectedPair = form.watch('pair');
  const usdtAmountStr = form.watch('usdtAmount');
  
  const tradingPairs = useMemo(() => {
    return CRYPTO_SYMBOLS.map(symbol => `${QUOTE_CURRENCY_FOR_SIMULATOR}/${symbol}`);
  }, []);

  useEffect(() => {
    const currentPair = form.getValues('pair');
    if (currentPair && cryptoPrices[(currentPair.split('/')[1] as CryptoSymbol)]) {
        const marketPrice = cryptoPrices[(currentPair.split('/')[1] as CryptoSymbol)];
        form.setValue('buyPrice', marketPrice.toString());
    }
  }, [cryptoPrices, form]);


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
        operation: t('dashboard.orderOpportunitySimulator.buyOperationPrefix', 'Buy') + ` ${selectedPair}`,
        cantidadCrypto1: `${usdtAmountNum.toFixed(2)} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        precioMercado: t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'),
        cantidadCrypto2: '',
        comision: '',
        profitNeto: '-',
      }]);
      return;
    }
    
    form.setValue('buyPrice', marketPrice.toString(), { shouldValidate: false });


    const newRows: SimulatedRow[] = [];

    // Compra Row
    const cantidadTargetCryptoBought = usdtAmountNum / marketPrice;
    const compraCommissionAmount = usdtAmountNum * COMMISSION_RATE;

    newRows.push({
      operation: t('dashboard.orderOpportunitySimulator.buyOperationPrefix', 'Buy') + ` ${targetCryptoSymbol}`,
      cantidadCrypto1: `${usdtAmountNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
      precioMercado: `${marketPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: marketPrice < 1 ? 5 : 2 })} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
      cantidadCrypto2: `${cantidadTargetCryptoBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${targetCryptoSymbol}`,
      comision: `${compraCommissionAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
      profitNeto: '-',
      rawUsdtAmount: usdtAmountNum,
      rawMarketPrice: marketPrice,
      rawCryptoAmountBought: cantidadTargetCryptoBought,
      rawCommission: compraCommissionAmount,
    });

    // Venta Rows
    OPPORTUNITY_PERCENTAGES.forEach(perc => {
      const targetSellPrice = marketPrice * (1 + perc);
      const usdtReceivedFromSale = cantidadTargetCryptoBought * targetSellPrice;
      const ventaCommissionAmount = usdtReceivedFromSale * COMMISSION_RATE;
      const netProfit = (usdtReceivedFromSale - usdtAmountNum) - (compraCommissionAmount + ventaCommissionAmount);

      newRows.push({
        operation: `${t('dashboard.orderOpportunitySimulator.sellOperationPrefix', 'Sell')} ${targetCryptoSymbol} (+${(perc * 100).toFixed(1)}%)`,
        cantidadCrypto1: `${cantidadTargetCryptoBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${targetCryptoSymbol}`,
        precioMercado: `${targetSellPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: targetSellPrice < 1 ? 5 : 2 })} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        cantidadCrypto2: `${usdtReceivedFromSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        comision: `${ventaCommissionAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        profitNeto: `${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${QUOTE_CURRENCY_FOR_SIMULATOR}`,
        profitNetoValue: netProfit,
        rawSellPrice: targetSellPrice,
        rawGrossRevenue: usdtReceivedFromSale,
        rawCommission: ventaCommissionAmount,
        rawCryptoAmountBought: cantidadTargetCryptoBought, // For context in sell rows
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, usdtAmountStr, cryptoPrices, t, form]);


  const handleSaveSimulation = async () => {
    if (!user) {
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.saveErrorTitle', "Save Error"),
        description: t('dashboard.orderOpportunitySimulator.toast.notLoggedInError', "You must be logged in to save simulations."),
        variant: "destructive",
      });
      return;
    }

    if (simulatedRows.length === 0 || !simulatedRows[0].rawUsdtAmount) {
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.saveErrorTitle', "Save Error"),
        description: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', "There is no simulation data to save."),
        variant: "warning",
      });
      return;
    }

    setIsSaving(true);

    const buyRow = simulatedRows[0];
    const sellRows = simulatedRows.slice(1);

    const simulationToSave: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'> = {
      par_operacion: selectedPair,
      monto_compra_usdt: buyRow.rawUsdtAmount!,
      precio_compra: buyRow.rawMarketPrice!,
      cantidad_cripto_comprada: buyRow.rawCryptoAmountBought!,
      comision_compra: buyRow.rawCommission!,
      ventas_simuladas: sellRows.map(row => ({
        precio_venta_simulado: row.rawSellPrice!,
        ingreso_bruto: row.rawGrossRevenue!,
        comision_venta: row.rawCommission!,
        ganancia_neta: row.profitNetoValue!,
      })),
    };

    try {
      await saveSimulationToFirebase(user.id, simulationToSave);
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.savedSuccessTitle', "Simulation Saved"),
        description: t('dashboard.orderOpportunitySimulator.toast.savedSuccessDescription', "Your simulation has been successfully saved."),
      });
    } catch (error) {
      console.error("Failed to save simulation:", error);
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.saveErrorTitle', "Save Error"),
        description: error instanceof Error ? error.message : t('dashboard.orderOpportunitySimulator.toast.saveErrorDescription', "Could not save the simulation. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('dashboard.orderOpportunitySimulator.title', 'Order & Opportunity Simulator')}</CardTitle>
        <CardDescription>{t('dashboard.orderOpportunitySimulator.description', 'Simulate a buy order and see potential sell opportunities at incremental profit percentages.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="pair"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dashboard.orderOpportunitySimulator.operationLabel', 'Operation (Pair)')}</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            const symbol = value.split('/')[1] as CryptoSymbol;
                            if (cryptoPrices[symbol]) {
                                form.setValue('buyPrice', cryptoPrices[symbol].toString());
                            } else {
                                form.setValue('buyPrice', '');
                            }
                        }} 
                        defaultValue={field.value}
                    >
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
                <FormField
                    control={form.control}
                    name="buyPrice"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('dashboard.orderOpportunitySimulator.marketPriceLabel', 'Market Price')}</FormLabel>
                        <FormControl>
                        <Input type="text" {...field} readOnly className="bg-muted/50 cursor-default" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          </form>
        </Form>

        {simulatedRows.length > 0 ? (
          <>
            <ScrollArea className="max-h-[500px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.operation', 'Operation')}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.amountCrypto1', 'Amount ({currency1})')
                        .replace('{currency1}', simulatedRows[0].operation.includes(t('dashboard.orderOpportunitySimulator.buyOperationPrefix', 'Buy')) ? QUOTE_CURRENCY_FOR_SIMULATOR : selectedPair.split('/')[1])}
                    </TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.marketPrice', 'Market Price')}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.amountCrypto2', 'Amount ({currency2})')
                        .replace('{currency2}', simulatedRows[0].operation.includes(t('dashboard.orderOpportunitySimulator.buyOperationPrefix', 'Buy')) ? selectedPair.split('/')[1] : QUOTE_CURRENCY_FOR_SIMULATOR )}
                    </TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.commission', 'Commission')}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.netProfit', 'Net Profit')}</TableHead>
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
             <Button 
                onClick={handleSaveSimulation} 
                disabled={isSaving || !user || simulatedRows.length === 0 || !simulatedRows[0].rawUsdtAmount}
                className="mt-4 w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
              >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('dashboard.orderOpportunitySimulator.saveButton', 'Save Simulation')}
            </Button>
          </>
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
