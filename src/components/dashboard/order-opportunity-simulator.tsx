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
import { DETAILED_TRADING_PAIRS, COMMISSION_RATE, QUOTE_CURRENCY as DEFAULT_QUOTE_CURRENCY, CRYPTO_SYMBOLS, STABLECOIN_SYMBOLS } from '@/lib/constants';
import type { CryptoSymbol, DetailedTradingPair, StableCoinSymbol } from '@/lib/constants';
import type { SimulationLogEntry } from '@/lib/types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { saveSimulationToFirebase } from '@/lib/firebase/simulations';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Save } from 'lucide-react';

const OPPORTUNITY_PERCENTAGES = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]; // +0.5% to +3.0%

const getSimulatorSchema = (t: (key: string, fallback?: string) => string) => z.object({
  pair: z.string().min(1, { message: t('zod.orderOpportunity.selectPair', 'Please select a trading pair.') }),
  inputAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.orderOpportunity.positiveInputAmount', 'Amount must be a positive number.') }),
  marketPriceDisplay: z.string().optional(), 
});

type SimulatorFormValues = z.infer<ReturnType<typeof getSimulatorSchema>>;

interface OrderOpportunitySimulatorProps {
  cryptoPrices: Record<CryptoSymbol, number>; // Prices in USDT
}

interface SimulatedRow {
  operation: string;
  // For display - units can vary based on context (buy vs sell row)
  displayAmount1: string; 
  displayMarketPrice: string;
  displayAmount2: string; 
  displayCommission: string; 
  displayNetProfit: string;  
  
  // For styling profit/loss
  netProfitValue?: number; 
  
  // For saving (normalized to targetCrypto/USDT context)
  isBuyRow: boolean;
  cur1?: string;
  cur2?: string;
  rawInputAmountCur1?: number;
  rawMarketPriceCur1InCur2?: number;
  rawExchangedAmountCur2?: number;
  rawCommissionBuyInUSDT?: number;
  
  // Sell row specific raw data for saving
  rawTargetCryptoAmountSold?: number;
  rawSellPriceTargetCryptoInUSDT?: number;
  rawUSDTReceivedFromSale?: number;
  rawCommissionSellInUSDT?: number;
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
      inputAmount: '100', // Default to 100 units of cur1
      marketPriceDisplay: '',
    },
  });

  const [simulatedRows, setSimulatedRows] = useState<SimulatedRow[]>([]);
  const [currentCur1, setCurrentCur1] = useState<string>(DEFAULT_QUOTE_CURRENCY);
  const [currentCur2, setCurrentCur2] = useState<string>('');
  const [currentTargetCryptoForSell, setCurrentTargetCryptoForSell] = useState<CryptoSymbol | null>(null);


  const selectedPair = form.watch('pair') as DetailedTradingPair | '';
  const inputAmountStr = form.watch('inputAmount');
  
  useEffect(() => {
    if (selectedPair) {
      const [c1, c2] = selectedPair.split('/') as [string, string];
      setCurrentCur1(c1);
      setCurrentCur2(c2);

      let targetCrypto: CryptoSymbol | null = null;
      if (!(STABLECOIN_SYMBOLS as readonly string[]).includes(c1) && CRYPTO_SYMBOLS.includes(c1 as CryptoSymbol)) {
        targetCrypto = c1 as CryptoSymbol;
      } else if (!(STABLECOIN_SYMBOLS as readonly string[]).includes(c2) && CRYPTO_SYMBOLS.includes(c2 as CryptoSymbol)) {
        targetCrypto = c2 as CryptoSymbol;
      }
      setCurrentTargetCryptoForSell(targetCrypto);

      let marketPrice = 0;
      const cryptoPriceC1 = cryptoPrices[c1 as CryptoSymbol];
      const cryptoPriceC2 = cryptoPrices[c2 as CryptoSymbol];

      if (c1 === DEFAULT_QUOTE_CURRENCY && cryptoPriceC2 > 0) { // USDT/BTC
        marketPrice = 1 / cryptoPriceC2; // Price of USDT in BTC
      } else if (c2 === DEFAULT_QUOTE_CURRENCY && cryptoPriceC1 > 0) { // BTC/USDT
        marketPrice = cryptoPriceC1; // Price of BTC in USDT
      }
      // else if (cryptoPriceC1 > 0 && cryptoPriceC2 > 0) { // CRYPTO1/CRYPTO2 (e.g. ETH/BTC) - Not supported by current cryptoPrices structure
      //   marketPrice = cryptoPriceC1 / cryptoPriceC2; // Price of CRYPTO1 in CRYPTO2, needs prices relative to a common base or direct pair price
      // }

      if (marketPrice > 0) {
        form.setValue('marketPriceDisplay', marketPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: marketPrice < 0.001 ? 8 : 5 }));
      } else {
        form.setValue('marketPriceDisplay', t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'));
      }
    } else {
      setCurrentCur1(DEFAULT_QUOTE_CURRENCY);
      setCurrentCur2('');
      setCurrentTargetCryptoForSell(null);
      form.setValue('marketPriceDisplay', '');
    }
  }, [selectedPair, cryptoPrices, form, t]);


  useEffect(() => {
    if (!selectedPair || !inputAmountStr || !currentTargetCryptoForSell) {
      setSimulatedRows([]);
      return;
    }

    const inputAmountNum = parseFloat(inputAmountStr);
    if (isNaN(inputAmountNum) || inputAmountNum <= 0) {
      setSimulatedRows([]);
      return;
    }

    const [cur1, cur2] = selectedPair.split('/') as [string, string];
    const priceOfTargetCryptoInUSDT = cryptoPrices[currentTargetCryptoForSell];

    if (!priceOfTargetCryptoInUSDT || priceOfTargetCryptoInUSDT <= 0) {
      setSimulatedRows([{
        isBuyRow: true, cur1, cur2,
        operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1, cur2}),
        displayAmount1: `${inputAmountNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${cur1}`,
        displayMarketPrice: t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'),
        displayAmount2: '', displayCommission: '', displayNetProfit: '-',
      }]);
      return;
    }

    const newRows: SimulatedRow[] = [];

    // "Compra" Row Logic (Initial Transaction)
    let displayMarketPriceCur1InCur2 = 0;
    let exchangedAmountCur2 = 0;
    let valueOfTxInUSDT = 0;

    if (cur1 === DEFAULT_QUOTE_CURRENCY) { // e.g., USDT/BTC
      displayMarketPriceCur1InCur2 = priceOfTargetCryptoInUSDT > 0 ? (1 / priceOfTargetCryptoInUSDT) : 0; // BTC per USDT
      exchangedAmountCur2 = inputAmountNum * displayMarketPriceCur1InCur2; // Amount of BTC
      valueOfTxInUSDT = inputAmountNum; // Value is in USDT
    } else { // e.g., BTC/USDT (cur2 must be USDT if cur1 is not)
      displayMarketPriceCur1InCur2 = priceOfTargetCryptoInUSDT; // USDT per BTC
      exchangedAmountCur2 = inputAmountNum * displayMarketPriceCur1InCur2; // Amount of USDT
      valueOfTxInUSDT = exchangedAmountCur2; // Value is in USDT
    }
    
    const commissionBuyInUSDT = valueOfTxInUSDT * COMMISSION_RATE;

    newRows.push({
      isBuyRow: true, cur1, cur2,
      operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1, cur2}),
      displayAmount1: `${inputAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: cur1 === DEFAULT_QUOTE_CURRENCY ? 2 : 8 })} ${cur1}`,
      displayMarketPrice: `${displayMarketPriceCur1InCur2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: displayMarketPriceCur1InCur2 < 0.001 ? 8 : 5 })} ${cur2}/${cur1}`,
      displayAmount2: `${exchangedAmountCur2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: cur2 === DEFAULT_QUOTE_CURRENCY ? 2 : 8 })} ${cur2}`,
      displayCommission: `${commissionBuyInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
      displayNetProfit: '-',
      rawInputAmountCur1: inputAmountNum,
      rawMarketPriceCur1InCur2: displayMarketPriceCur1InCur2,
      rawExchangedAmountCur2: exchangedAmountCur2,
      rawCommissionBuyInUSDT: commissionBuyInUSDT,
    });

    // "Venta" Rows Logic (Selling currentTargetCryptoForSell for USDT)
    let amountOfTargetCryptoInvolved: number;
    if (cur1 === currentTargetCryptoForSell) { // e.g. BTC/USDT, inputAmount was BTC
        amountOfTargetCryptoInvolved = inputAmountNum;
    } else { // e.g. USDT/BTC, exchangedAmountCur2 was BTC
        amountOfTargetCryptoInvolved = exchangedAmountCur2;
    }
    
    const initialInvestmentInUSDT = valueOfTxInUSDT; // This is the USDT value of the "buy" leg

    OPPORTUNITY_PERCENTAGES.forEach(perc => {
      const targetSellPriceOfTargetCryptoInUSDT = priceOfTargetCryptoInUSDT * (1 + perc);
      const usdtReceivedFromSale = amountOfTargetCryptoInvolved * targetSellPriceOfTargetCryptoInUSDT;
      const commissionSellInUSDT = usdtReceivedFromSale * COMMISSION_RATE;
      const netProfitInUSDT = (usdtReceivedFromSale - initialInvestmentInUSDT) - (commissionBuyInUSDT + commissionSellInUSDT);

      newRows.push({
        isBuyRow: false,
        operation: t('dashboard.orderOpportunitySimulator.sellOperationPerc', 'Sell {targetCrypto} (+{perc}%)', {targetCrypto: currentTargetCryptoForSell, perc: (perc * 100).toFixed(1)}),
        displayAmount1: `${amountOfTargetCryptoInvolved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currentTargetCryptoForSell}`,
        displayMarketPrice: `${targetSellPriceOfTargetCryptoInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: targetSellPriceOfTargetCryptoInUSDT < 1 ? 5 : 2 })} ${DEFAULT_QUOTE_CURRENCY}/${currentTargetCryptoForSell}`,
        displayAmount2: `${usdtReceivedFromSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${DEFAULT_QUOTE_CURRENCY}`,
        displayCommission: `${commissionSellInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
        displayNetProfit: `${netProfitInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${DEFAULT_QUOTE_CURRENCY}`,
        netProfitValue: netProfitInUSDT,
        rawTargetCryptoAmountSold: amountOfTargetCryptoInvolved,
        rawSellPriceTargetCryptoInUSDT: targetSellPriceOfTargetCryptoInUSDT,
        rawUSDTReceivedFromSale: usdtReceivedFromSale,
        rawCommissionSellInUSDT: commissionSellInUSDT,
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, inputAmountStr, cryptoPrices, t, form, currentTargetCryptoForSell]);


  const handleSaveSimulation = async () => {
    if (!user) {
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.saveErrorTitle', "Save Error"),
        description: t('dashboard.orderOpportunitySimulator.toast.notLoggedInError', "You must be logged in to save simulations."),
        variant: "destructive",
      });
      return;
    }

    const buyRowData = simulatedRows.find(row => row.isBuyRow);
    const sellRowsData = simulatedRows.filter(row => !row.isBuyRow);

    if (!buyRowData || !currentTargetCryptoForSell || !priceOfTargetCryptoInUSDT) {
       toast({
        title: t('dashboard.orderOpportunitySimulator.toast.saveErrorTitle', "Save Error"),
        description: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', "There is no valid simulation data to save."),
        variant: "warning",
      });
      return;
    }
    
    const priceOfTargetCryptoInUSDT = cryptoPrices[currentTargetCryptoForSell]; // For normalization

    setIsSaving(true);

    // Normalize data for saving (TARGET_CRYPTO/USDT perspective)
    let normalizedAmountCompraUSDT: number;
    let normalizedCantidadCriptoComprada: number;

    if (buyRowData.cur1 === DEFAULT_QUOTE_CURRENCY) { // USDT/TARGET_CRYPTO
        normalizedAmountCompraUSDT = buyRowData.rawInputAmountCur1!;
        normalizedCantidadCriptoComprada = buyRowData.rawExchangedAmountCur2!;
    } else { // TARGET_CRYPTO/USDT
        normalizedAmountCompraUSDT = buyRowData.rawExchangedAmountCur2!; // This was the USDT amount from the exchange
        normalizedCantidadCriptoComprada = buyRowData.rawInputAmountCur1!;
    }


    const simulationToSave: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'> = {
      par_operacion: `${currentTargetCryptoForSell}/${DEFAULT_QUOTE_CURRENCY}`,
      monto_compra_usdt: normalizedAmountCompraUSDT,
      precio_compra: priceOfTargetCryptoInUSDT, // Actual market price of target crypto in USDT at time of simulation
      cantidad_cripto_comprada: normalizedCantidadCriptoComprada,
      comision_compra: buyRowData.rawCommissionBuyInUSDT!,
      ventas_simuladas: sellRowsData.map(row => ({
        precio_venta_simulado: row.rawSellPriceTargetCryptoInUSDT!,
        ingreso_bruto: row.rawUSDTReceivedFromSale!,
        comision_venta: row.rawCommissionSellInUSDT!,
        ganancia_neta: row.netProfitValue!,
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


  const getHeaderLabel = (key: string, cur1: string, cur2: string, targetCrypto: string | null, isSellSection: boolean) => {
    if (isSellSection && targetCrypto) {
      return t(key, key, { currency1: targetCrypto, currency2: DEFAULT_QUOTE_CURRENCY});
    }
    return t(key, key, { currency1: cur1, currency2: cur2});
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('dashboard.orderOpportunitySimulator.title', 'Order & Opportunity Simulator')}</CardTitle>
        <CardDescription>{t('dashboard.orderOpportunitySimulator.description', 'Simulate an exchange and see potential sell opportunities at incremental profit percentages.')}</CardDescription>
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
                    <FormLabel>{t('dashboard.orderOpportunitySimulator.operationPairLabel', 'Trading Pair')}</FormLabel>
                    <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dashboard.orderOpportunitySimulator.selectPairPlaceholder', 'Select Trading Pair')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DETAILED_TRADING_PAIRS.map((pair) => (
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
                name="inputAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dashboard.orderOpportunitySimulator.inputAmountLabel', `Amount ({currency})`, {currency: currentCur1 || '...'})}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} step="any" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                    control={form.control}
                    name="marketPriceDisplay"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('dashboard.orderOpportunitySimulator.marketPriceDisplayLabel', `Market Price ({cur2}/{cur1})`, {cur1: currentCur1 || '...', cur2: currentCur2 || '...'})}</FormLabel>
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
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur1Display', currentCur1, currentCur2, currentTargetCryptoForSell, false)}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.marketPriceDisplay', 'Market Price')}</TableHead>
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur2Display', currentCur1, currentCur2, currentTargetCryptoForSell, false)}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.commissionDisplay', 'Commission ({currency})', {currency: DEFAULT_QUOTE_CURRENCY})}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.netProfitDisplay', 'Net Profit ({currency})', {currency: DEFAULT_QUOTE_CURRENCY})}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulatedRows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.operation}</TableCell>
                      <TableCell>{row.displayAmount1}</TableCell>
                      <TableCell>{row.displayMarketPrice}</TableCell>
                      <TableCell>{row.displayAmount2}</TableCell>
                      <TableCell>{row.displayCommission}</TableCell>
                      <TableCell 
                        className={
                          row.netProfitValue !== undefined 
                          ? (row.netProfitValue > 0 ? 'text-primary' : row.netProfitValue < 0 ? 'text-destructive' : '') 
                          : ''
                        }
                      >
                        {row.displayNetProfit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
             <Button 
                onClick={handleSaveSimulation} 
                disabled={isSaving || !user || simulatedRows.length === 0 || !simulatedRows.find(r => r.isBuyRow)?.rawCommissionBuyInUSDT === undefined}
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
            {selectedPair && inputAmountStr 
              ? t('dashboard.orderOpportunitySimulator.calculating', 'Calculating...') 
              : t('dashboard.orderOpportunitySimulator.enterValuesPrompt', 'Please select a pair and enter amount to see simulation.')
            }
          </p>
        )}
         <p className="text-xs text-muted-foreground mt-4">
            {t('dashboard.orderOpportunitySimulator.commissionInfo', 'Commission is {rate}% on the transaction value in {quote_currency}.', { rate: (COMMISSION_RATE * 100).toFixed(1), quote_currency: DEFAULT_QUOTE_CURRENCY })}
          </p>
      </CardContent>
    </Card>
  );
}
