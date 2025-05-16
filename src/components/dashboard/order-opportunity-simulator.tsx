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
import { DETAILED_TRADING_PAIRS, COMMISSION_RATE, QUOTE_CURRENCY as DEFAULT_QUOTE_CURRENCY, STABLECOIN_SYMBOLS, COIN_DATA } from '@/lib/constants';
import type { CryptoSymbol } from '@/lib/constants';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
// useAuth import removed as auth is disabled
// import { useAuth } from '@/hooks/use-auth'; 
// Firebase save functions might be affected as they require userId.
// UI elements calling these will be disabled.
import { saveSimulationToFirebase } from '@/lib/firebase/simulations'; 
import { saveOrderToFirebase } from '@/lib/firebase/orders'; 
import type { SimulationLogEntry, SavedOrder } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Save, FilePlus2 } from 'lucide-react';


const OPPORTUNITY_PERCENTAGES = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06, 0.065, 0.07]; 

const getSimulatorSchema = (t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string) => z.object({
  pair: z.string().min(1, { message: t('zod.orderOpportunity.selectPair', 'Please select a trading pair.') }),
  amountToSpendInQuote: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.orderOpportunity.positiveInputAmount', 'Amount must be a positive number.') }),
  purchasePriceOfBaseInQuote: z.string().refine(val => {
    if (!val) return true; 
    const num = parseFloat(val.replace(/,/g, ''));
    return !isNaN(num) && num > 0;
  }, { message: t('zod.orderOpportunity.purchasePriceUsdtPositive', 'Purchase price must be a positive number.') }),
});

type SimulatorFormValues = z.infer<ReturnType<typeof getSimulatorSchema>>;

interface OrderOpportunitySimulatorProps {
  cryptoPrices: Record<CryptoSymbol, number>;
}

interface SimulatedRow {
  operation: string;
  displayAmount1: string; 
  displayMarketPrice: string; 
  displayAmount2: string; 
  displayCommission: string;
  displayNetProfit: string;
  netProfitValue?: number;
  isBuyRow: boolean;
  cur1Label?: string; 
  cur2Label?: string;
  
  rawAmountSpentInQuote?: number; 
  rawPriceOfBaseInQuote?: number; 
  rawAmountOfBaseBought?: number; 
  rawCommissionBuyInUSDT?: number; 
  rawTotalInvestmentInUSDT?: number;

  rawAmountOfBaseSold?: number; 
  rawSellPriceOfBaseInQuote?: number; 
  rawQuoteReceivedFromSale?: number; 
  rawCommissionSellInUSDT?: number; 
}


export function OrderOpportunitySimulator({ cryptoPrices }: OrderOpportunitySimulatorProps) {
  const { translations, language, hydrated: languageHydrated } = useLanguage();
  const { toast } = useToast();
  // const { user } = useAuth(); // Auth removed
  const [isSavingSimulation, setIsSavingSimulation] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [purchasePriceManuallyEdited, setPurchasePriceManuallyEdited] = useState(false);
  const [displayedExchangedCryptoValue, setDisplayedExchangedCryptoValue] = useState<string>('');

  const [currentBaseCurrency, setCurrentBaseCurrency] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY | ''>(''); 
  const [currentQuoteCurrency, setCurrentQuoteCurrency] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY | ''>(''); 


  const t = useCallback((key: string, fallback?: string, vars?: Record<string, string | number>) => {
    let msg;
    if (languageHydrated) {
      msg = translations[key] || fallback || key;
    } else {
      msg = fallback || key; 
    }

    if (vars && msg) {
      Object.keys(vars).forEach(varKey => {
        if (typeof msg === 'string') {
          msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
        }
      });
    }
    return String(msg || key); 
  }, [translations, language, languageHydrated]);

  const simulatorSchema = useMemo(() => getSimulatorSchema(t), [language, t]);

  const form = useForm<SimulatorFormValues>({
    resolver: zodResolver(simulatorSchema),
    defaultValues: {
      pair: '',
      amountToSpendInQuote: '100', 
      purchasePriceOfBaseInQuote: '', 
    },
  });

  const [simulatedRows, setSimulatedRows] = useState<SimulatedRow[]>([]);
  
  const selectedPair = form.watch('pair') as typeof DETAILED_TRADING_PAIRS[number] | '';
  const amountToSpendInQuoteStr = form.watch('amountToSpendInQuote'); 
  const purchasePriceOfBaseInQuoteStr = form.watch('purchasePriceOfBaseInQuote'); 


  useEffect(() => {
    setPurchasePriceManuallyEdited(false); 
  }, [selectedPair]);

  useEffect(() => {
    if (selectedPair) {
      const [base, quote] = selectedPair.split('/') as [CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY, CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY];
      setCurrentBaseCurrency(base); 
      setCurrentQuoteCurrency(quote);
      
      const currentPurchasePriceFieldValue = form.getValues('purchasePriceOfBaseInQuote');
      const isPurchaseFieldEffectivelyEmpty = currentPurchasePriceFieldValue === '' || currentPurchasePriceFieldValue === t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A');

      let autoFilledPrice = 0;
      if (COIN_DATA[base as CryptoSymbol] && cryptoPrices[base as CryptoSymbol] > 0 && quote === DEFAULT_QUOTE_CURRENCY) { 
        autoFilledPrice = cryptoPrices[base as CryptoSymbol];
      } else if (COIN_DATA[quote as CryptoSymbol] && cryptoPrices[quote as CryptoSymbol] > 0 && base === DEFAULT_QUOTE_CURRENCY) {
        if (cryptoPrices[quote as CryptoSymbol] !== 0) {
            autoFilledPrice = 1 / cryptoPrices[quote as CryptoSymbol];
        }
      }
      
      if (autoFilledPrice > 0) {
        if (!purchasePriceManuallyEdited || isPurchaseFieldEffectivelyEmpty) {
          form.setValue('purchasePriceOfBaseInQuote', autoFilledPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: autoFilledPrice < 0.01 ? 8 : 5, useGrouping: false }));
        }
      } else {
         if (!purchasePriceManuallyEdited || isPurchaseFieldEffectivelyEmpty) {
          form.setValue('purchasePriceOfBaseInQuote', t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'));
        }
      }
    } else {
      setCurrentBaseCurrency('');
      setCurrentQuoteCurrency('');
      form.setValue('purchasePriceOfBaseInQuote', '');
      setDisplayedExchangedCryptoValue('');
    }
  }, [selectedPair, cryptoPrices, form, t, purchasePriceManuallyEdited]);


  useEffect(() => {
    const amountToSpendNum = parseFloat(amountToSpendInQuoteStr); 
    const purchasePriceNum = parseFloat(purchasePriceOfBaseInQuoteStr.replace(/,/g, '')); 

    if (selectedPair && currentBaseCurrency && currentQuoteCurrency && !isNaN(amountToSpendNum) && amountToSpendNum > 0 && !isNaN(purchasePriceNum) && purchasePriceNum > 0) {
        const calculatedAmountOfBase = amountToSpendNum / purchasePriceNum;
        
        setDisplayedExchangedCryptoValue(
            `${calculatedAmountOfBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(currentBaseCurrency as any) ? 2 : 8 })} ${currentBaseCurrency}`
        );

    } else if (selectedPair && amountToSpendInQuoteStr && purchasePriceOfBaseInQuoteStr) {
        if(isNaN(purchasePriceNum) || purchasePriceNum <=0) {
             setDisplayedExchangedCryptoValue(t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'));
        } else {
             setDisplayedExchangedCryptoValue(t('dashboard.orderOpportunitySimulator.calculationError', 'Calculation Error'));
        }
    } else {
        setDisplayedExchangedCryptoValue(''); 
    }
  }, [selectedPair, amountToSpendInQuoteStr, purchasePriceOfBaseInQuoteStr, currentBaseCurrency, currentQuoteCurrency, t]);


  useEffect(() => {
    if (!selectedPair || !amountToSpendInQuoteStr || !purchasePriceOfBaseInQuoteStr || !currentBaseCurrency || !currentQuoteCurrency) {
      setSimulatedRows([]);
      return;
    }

    const [baseC, quoteC] = selectedPair.split('/') as [CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY, CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY];
    const amountToSpendInQuoteNum = parseFloat(amountToSpendInQuoteStr); 
    const purchasePriceOfBaseInQuoteNum = parseFloat(purchasePriceOfBaseInQuoteStr.replace(/,/g, ''));

    if (isNaN(amountToSpendInQuoteNum) || amountToSpendInQuoteNum <= 0 || isNaN(purchasePriceOfBaseInQuoteNum) || purchasePriceOfBaseInQuoteNum <= 0) {
      const rowsToShow: SimulatedRow[] = [];
       if (isNaN(purchasePriceOfBaseInQuoteNum) || purchasePriceOfBaseInQuoteNum <= 0) {
         rowsToShow.push({
            isBuyRow: true, cur1Label: String(quoteC), cur2Label: String(baseC),
            operation: t('dashboard.orderOpportunitySimulator.buyOperation', 'Buy {targetCrypto} with {baseCurrency}', {targetCrypto: String(baseC), baseCurrency: String(quoteC)}),
            displayAmount1: `${amountToSpendInQuoteNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(quoteC as any) ? 2: 8})} ${quoteC}`,
            displayMarketPrice: t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'),
            displayAmount2: '', displayCommission: '', displayNetProfit: '-',
        });
      }
      setSimulatedRows(rowsToShow);
      return;
    }
    
    const newRows: SimulatedRow[] = [];

    const amountOfBaseBought = amountToSpendInQuoteNum / purchasePriceOfBaseInQuoteNum;
    
    let totalInvestmentInUSDTForBuy: number; 
    if (quoteC === DEFAULT_QUOTE_CURRENCY) { 
        totalInvestmentInUSDTForBuy = amountToSpendInQuoteNum;
    } else if (cryptoPrices[quoteC as CryptoSymbol] > 0) { 
        totalInvestmentInUSDTForBuy = amountToSpendInQuoteNum * cryptoPrices[quoteC as CryptoSymbol];
    } else {
        console.warn(`Market price for ${quoteC} not available for USDT conversion during commission calculation.`);
        totalInvestmentInUSDTForBuy = 0; 
    }
    const commissionBuyInUSDT = totalInvestmentInUSDTForBuy * COMMISSION_RATE;

    newRows.push({
      isBuyRow: true, cur1Label: String(quoteC), cur2Label: String(baseC),
      operation: t('dashboard.orderOpportunitySimulator.buyOperation', 'Buy {targetCrypto} with {baseCurrency}', {targetCrypto: String(baseC), baseCurrency: String(quoteC)}),
      displayAmount1: `${amountToSpendInQuoteNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(quoteC as any) ? 2 : 8 })} ${quoteC}`,
      displayMarketPrice: `${purchasePriceOfBaseInQuoteNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: purchasePriceOfBaseInQuoteNum < 0.01 ? 8 : 5 })} ${quoteC}/${baseC}`,
      displayAmount2: `${amountOfBaseBought.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(baseC as any) ? 2: 8})} ${baseC}`,
      displayCommission: `${commissionBuyInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
      displayNetProfit: '-',
      rawAmountSpentInQuote: amountToSpendInQuoteNum,
      rawPriceOfBaseInQuote: purchasePriceOfBaseInQuoteNum,
      rawAmountOfBaseBought: amountOfBaseBought,
      rawCommissionBuyInUSDT: commissionBuyInUSDT,
      rawTotalInvestmentInUSDT: totalInvestmentInUSDTForBuy,
    });

    const cryptoToSellForOpportunities = baseC; 
    const sellBackToCurrency = quoteC; 

    OPPORTUNITY_PERCENTAGES.forEach(perc => {
      const baseSellPriceOfBaseInQuote = purchasePriceOfBaseInQuoteNum; 
      if (isNaN(baseSellPriceOfBaseInQuote) || baseSellPriceOfBaseInQuote <= 0) return;

      const targetSellPriceOfBaseInQuote = baseSellPriceOfBaseInQuote * (1 + perc);
      const grossQuoteReceivedFromSale = amountOfBaseBought * targetSellPriceOfBaseInQuote; 
      
      let totalSellValueInUSDTForCommission: number;
      if (sellBackToCurrency === DEFAULT_QUOTE_CURRENCY) { 
           totalSellValueInUSDTForCommission = grossQuoteReceivedFromSale;
       } else if (cryptoPrices[sellBackToCurrency as CryptoSymbol] > 0) { 
           totalSellValueInUSDTForCommission = grossQuoteReceivedFromSale * cryptoPrices[sellBackToCurrency as CryptoSymbol];
       } else {
           totalSellValueInUSDTForCommission = 0; 
       }
      const commissionSellInUSDT = totalSellValueInUSDTForCommission * COMMISSION_RATE;
      
      const netProfitInUSDT = totalSellValueInUSDTForCommission - totalInvestmentInUSDTForBuy - commissionBuyInUSDT - commissionSellInUSDT;

      newRows.push({
        isBuyRow: false, cur1Label: String(cryptoToSellForOpportunities), cur2Label: String(sellBackToCurrency),
        operation: t('dashboard.orderOpportunitySimulator.sellOperationPerc', 'Sell {targetCrypto} (+{perc}%)', {targetCrypto: String(cryptoToSellForOpportunities), perc: (perc * 100).toFixed(1)}),
        displayAmount1: `${amountOfBaseBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(cryptoToSellForOpportunities as any) ? 2 : 8 })} ${cryptoToSellForOpportunities}`, 
        displayMarketPrice: `${targetSellPriceOfBaseInQuote.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: targetSellPriceOfBaseInQuote < 1 ? 8 : 5 })} ${sellBackToCurrency}/${cryptoToSellForOpportunities}`, 
        displayAmount2: `${grossQuoteReceivedFromSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(sellBackToCurrency as any) ? 2 : 8 })} ${sellBackToCurrency}`, 
        displayCommission: `${commissionSellInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
        displayNetProfit: `${netProfitInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${DEFAULT_QUOTE_CURRENCY}`,
        netProfitValue: netProfitInUSDT,

        rawAmountOfBaseSold: amountOfBaseBought,
        rawSellPriceOfBaseInQuote: targetSellPriceOfBaseInQuote, 
        rawQuoteReceivedFromSale: grossQuoteReceivedFromSale, 
        rawCommissionSellInUSDT: commissionSellInUSDT,
        
        rawAmountSpentInQuote: amountToSpendInQuoteNum,
        rawPriceOfBaseInQuote: purchasePriceOfBaseInQuoteNum,
        rawAmountOfBaseBought: amountOfBaseBought, 
        rawCommissionBuyInUSDT: commissionBuyInUSDT, 
        rawTotalInvestmentInUSDT: totalInvestmentInUSDTForBuy,
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, amountToSpendInQuoteStr, purchasePriceOfBaseInQuoteStr, cryptoPrices, t, currentBaseCurrency, currentQuoteCurrency]);


  const handleSaveFullSimulation = async () => {
    // if (!user) { // User check removed
    //   toast({ title: t('dashboard.orderOpportunitySimulator.toast.notLoggedInError', 'You must be logged in to save simulations/orders.'), variant: "destructive" });
    //   return;
    // }
    toast({ title: t('auth.disabled.title', 'Save Disabled'), description: t('auth.disabled.simulationsUnavailable', 'Saving simulations is unavailable without user accounts.'), variant: 'warning' });
    return; // Disable functionality

    // Remaining logic commented out
    /*
    if (simulatedRows.length === 0 || !simulatedRows[0].isBuyRow || !selectedPair || !currentBaseCurrency || !currentQuoteCurrency) {
      toast({ title: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', 'There is no valid simulation/order data to save.'), variant: "warning" });
      return;
    }
    
    setIsSavingSimulation(true);
    try {
      const buyRow = simulatedRows[0];
      const simulationData: Omit<SimulationLogEntry, 'id' | 'userId' | 'fecha'> = {
        par_operacion: selectedPair,
        monto_compra_usdt: buyRow.rawTotalInvestmentInUSDT || 0, 
        precio_compra: buyRow.rawPriceOfBaseInQuote || 0, 
        cantidad_cripto_comprada: buyRow.rawAmountOfBaseBought || 0, 
        comision_compra: buyRow.rawCommissionBuyInUSDT || 0,
        ventas_simuladas: simulatedRows.slice(1).map(sellRow => ({
          precio_venta_simulado: sellRow.rawSellPriceOfBaseInQuote || 0, 
          ingreso_bruto: sellRow.rawQuoteReceivedFromSale || 0, 
          comision_venta: sellRow.rawCommissionSellInUSDT || 0,
          ganancia_neta: sellRow.netProfitValue || 0,
        })),
      };
      
      await saveSimulationToFirebase(user.uid, simulationData); 
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.savedSuccessTitle', 'Simulation Saved'),
        description: t('dashboard.orderOpportunitySimulator.toast.savedSuccessDescription', 'Your simulation has been successfully saved.'),
      });
    } catch (error) {
      console.error("Error saving simulation:", error);
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.saveErrorTitle', 'Save Error'),
        description: error instanceof Error ? error.message : t('dashboard.orderOpportunitySimulator.toast.saveErrorDescription', 'Could not save the simulation. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setIsSavingSimulation(false);
    }
    */
  };

  const handleSaveOrder = async (sellRowIndex: number) => {
    //  if (!user) { // User check removed
    //   toast({ title: t('dashboard.orderOpportunitySimulator.toast.notLoggedInError', 'You must be logged in to save simulations/orders.'), variant: "destructive" });
    //   return;
    // }
    toast({ title: t('auth.disabled.title', 'Save Disabled'), description: t('auth.disabled.ordersUnavailable', 'Saving orders is unavailable without user accounts.'), variant: 'warning' });
    return; // Disable functionality

    // Remaining logic commented out
    /*
    if (simulatedRows.length === 0 || !simulatedRows[0].isBuyRow || !selectedPair || !currentBaseCurrency || !currentQuoteCurrency || sellRowIndex >= simulatedRows.length || simulatedRows[sellRowIndex].isBuyRow) {
      toast({ title: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', 'There is no valid order data to save.'), variant: "warning" });
      return;
    }
        
    const buyRowData = simulatedRows[0];
    const sellRowData = simulatedRows[sellRowIndex];
    if (!buyRowData.rawAmountSpentInQuote || !buyRowData.rawPriceOfBaseInQuote || !buyRowData.rawAmountOfBaseBought || 
        sellRowData.rawAmountOfBaseSold === undefined || sellRowData.rawSellPriceOfBaseInQuote === undefined || sellRowData.rawQuoteReceivedFromSale === undefined) {
        toast({ title: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', 'Incomplete simulation data for saving order.'), variant: "warning" });
        return;
    }

    setSavingOrderId(simulatedRows[sellRowIndex].operation); 
    try {
      const [baseC, quoteC] = selectedPair.split('/');

      const orderData: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'> = {
        targetCrypto: String(baseC), 
        quoteCurrency: String(quoteC), 
        amountOfTargetCryptoBought: buyRowData.rawAmountOfBaseBought,
        buyPricePerUnit: buyRowData.rawPriceOfBaseInQuote,
        totalBuyValueInQuote: buyRowData.rawAmountSpentInQuote, 
        buyCommissionInQuote: buyRowData.rawCommissionBuyInUSDT || 0, 
        sellPricePerUnit: sellRowData.rawSellPriceOfBaseInQuote, 
        totalSellValueInQuote: sellRowData.rawQuoteReceivedFromSale, 
        sellCommissionInQuote: sellRowData.rawCommissionSellInUSDT || 0, 
        netProfitInQuote: sellRowData.netProfitValue || 0, 
        originalPair: selectedPair,
        inputAmount: buyRowData.rawAmountSpentInQuote, 
        inputCurrency: String(quoteC), 
      };
      
      await saveOrderToFirebase(user.uid, orderData);
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.orderSavedSuccessTitle', 'Order Saved'),
        description: t('dashboard.orderOpportunitySimulator.toast.orderSavedSuccessDescription', 'The specific order has been successfully saved.'),
      });

    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.orderSaveErrorTitle', 'Order Save Error'),
        description: error instanceof Error ? error.message : t('dashboard.orderOpportunitySimulator.toast.orderSaveErrorDescription', 'Could not save the specific order. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setSavingOrderId(null);
    }
    */
  };


  const getHeaderLabel = (key: string, cur1: string | undefined, cur2: string | undefined) => {
    const c1Display = cur1 || '...';
    const c2Display = cur2 || '...';
    return t(key, key, { currency1: c1Display, currency2: c2Display});
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="pair"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dashboard.orderOpportunitySimulator.operationPairLabel', 'Trading Pair')}</FormLabel>
                    <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            setPurchasePriceManuallyEdited(false); 
                        }}
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
                name="amountToSpendInQuote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dashboard.orderOpportunitySimulator.amountToSpendInQuoteLabel', `Amount to Spend ({currency})`, {currency: currentQuoteCurrency || DEFAULT_QUOTE_CURRENCY})}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} step="any" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchasePriceOfBaseInQuote"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>
                        {t('dashboard.orderOpportunitySimulator.purchasePriceOfBaseInQuoteLabel', 'Purchase Price of {baseCurrency} (in {quoteCurrency})', { baseCurrency: currentBaseCurrency || 'Base', quoteCurrency: currentQuoteCurrency || DEFAULT_QUOTE_CURRENCY })}
                    </FormLabel>
                    <FormControl>
                    <Input
                        type="text" 
                        placeholder={t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A')}
                        {...field}
                        onChange={(e) => {
                            field.onChange(e);
                            setPurchasePriceManuallyEdited(true);
                        }}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                 <div className="md:col-span-1"> 
                    <FormLabel>
                        {t('dashboard.orderOpportunitySimulator.exchangedCryptoLabel', 'Exchanged Crypto ({crypto})', {crypto: currentBaseCurrency || '...'})}
                    </FormLabel>
                    <Input
                        type="text"
                        value={displayedExchangedCryptoValue || (selectedPair && amountToSpendInQuoteStr && purchasePriceOfBaseInQuoteStr ? t('dashboard.orderOpportunitySimulator.calculating', 'Calculating...') : '')}
                        readOnly
                        className="bg-muted/50 border-muted mt-1"
                    />
                </div>
            </div>
          </form>
        </Form>

        {simulatedRows.length > 0 ? (
          <>
            <ScrollArea className="w-full sm:max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.operation', 'Operation')}</TableHead>
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountToTransact', simulatedRows[0]?.cur1Label, simulatedRows[0]?.cur2Label)}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.marketPriceDisplay', 'Market Price')}</TableHead>
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountExchanged', simulatedRows[0]?.cur1Label, simulatedRows[0]?.cur2Label)}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.commissionDisplay', 'Commission ({currency})', {currency: DEFAULT_QUOTE_CURRENCY})}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.netProfitDisplay', 'Net Profit ({currency})', {currency: DEFAULT_QUOTE_CURRENCY})}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.actions', 'Actions')}</TableHead>
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
                       <TableCell>
                        {!row.isBuyRow && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveOrder(index)}
                            disabled={isSavingSimulation || savingOrderId === row.operation } 
                            title={t('auth.disabled.saveOrderButtonDisabled', 'Save Order (Auth Disabled)')}
                          >
                            {savingOrderId === row.operation ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
             <Button
                onClick={handleSaveFullSimulation}
                disabled={isSavingSimulation } 
                className="mt-4 w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
                title={t('auth.disabled.saveButtonDisabled', 'Save Simulation (Auth Disabled)')}
              >
              {isSavingSimulation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('dashboard.orderOpportunitySimulator.saveButton', 'Save Full Simulation')}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            {selectedPair && amountToSpendInQuoteStr && purchasePriceOfBaseInQuoteStr
              ? t('dashboard.orderOpportunitySimulator.calculating', 'Calculating...')
              : t('dashboard.orderOpportunitySimulator.enterValuesPromptFull', 'Please select pair, enter amount, and purchase price to see simulation.')
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
