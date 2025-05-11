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
import type { CryptoSymbol, DetailedTradingPair } from '@/lib/constants';
import type { SimulationLogEntry, SavedOrder } from '@/lib/types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { saveSimulationToFirebase } from '@/lib/firebase/simulations';
import { saveOrderToFirebase } from '@/lib/firebase/orders';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Save, FilePlus2 } from 'lucide-react';

const OPPORTUNITY_PERCENTAGES = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]; // +0.5% to +3.0%

const getSimulatorSchema = (t: (key: string, fallback?: string) => string) => z.object({
  pair: z.string().min(1, { message: t('zod.orderOpportunity.selectPair', 'Please select a trading pair.') }),
  inputAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.orderOpportunity.positiveInputAmount', 'Amount must be a positive number.') }),
  purchasePriceUsdt: z.string().refine(val => { 
    if (!val) return false;
    const num = parseFloat(val.replace(/,/g, ''));
    return !isNaN(num) && num > 0;
  }, { message: t('zod.orderOpportunity.purchasePriceUsdtPositive', 'Purchase price in USDT must be a positive number.') }),
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
  cur1?: string; 
  cur2?: string; 
  rawInputAmountCur1?: number;
  rawMarketPriceCur1InCur2?: number; 
  rawExchangedAmountCur2?: number;
  rawCommissionBuyInUSDT?: number;
  rawTargetCryptoAmountSold?: number;
  rawSellPriceTargetCryptoInUSDT?: number;
  rawUSDTReceivedFromSale?: number;
  rawCommissionSellInUSDT?: number;
  // Fields needed for saving individual order
  amountOfTargetCryptoInBuy?: number;
  initialInvestmentInUSDT?: number;
}


export function OrderOpportunitySimulator({ cryptoPrices }: OrderOpportunitySimulatorProps) {
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSavingSimulation, setIsSavingSimulation] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null); // index of row being saved, or a unique ID
  const [purchasePriceManuallyEdited, setPurchasePriceManuallyEdited] = useState(false);
  const [displayedPairMarketPrice, setDisplayedPairMarketPrice] = useState<string>('');


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
      inputAmount: '100',
      purchasePriceUsdt: '', 
    },
  });

  const [simulatedRows, setSimulatedRows] = useState<SimulatedRow[]>([]);
  const [currentCur1, setCurrentCur1] = useState<string>(DEFAULT_QUOTE_CURRENCY);
  const [currentCur2, setCurrentCur2] = useState<string>('');
  const [currentTargetCryptoForSell, setCurrentTargetCryptoForSell] = useState<CryptoSymbol | null>(null);


  const selectedPair = form.watch('pair') as DetailedTradingPair | '';
  const inputAmountStr = form.watch('inputAmount');
  const purchasePriceUsdtStr = form.watch('purchasePriceUsdt');


  useEffect(() => {
    setPurchasePriceManuallyEdited(false); 
  }, [selectedPair]);
  
  useEffect(() => {
    if (selectedPair) {
      const [c1, c2] = selectedPair.split('/') as [CryptoSymbol, CryptoSymbol];
      setCurrentCur1(c1);
      setCurrentCur2(c2);

      let targetCrypto: CryptoSymbol | null = null;
      if (!(STABLECOIN_SYMBOLS as readonly string[]).includes(c1) && CRYPTO_SYMBOLS.includes(c1 as CryptoSymbol)) {
        targetCrypto = c1 as CryptoSymbol;
      } else if (!(STABLECOIN_SYMBOLS as readonly string[]).includes(c2) && CRYPTO_SYMBOLS.includes(c2 as CryptoSymbol)) {
        targetCrypto = c2 as CryptoSymbol;
      }
      setCurrentTargetCryptoForSell(targetCrypto);
      
      const currentPurchasePriceFieldValue = form.getValues('purchasePriceUsdt');
      const isFieldEffectivelyEmpty = currentPurchasePriceFieldValue === '' || currentPurchasePriceFieldValue === t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A');

      if (targetCrypto && cryptoPrices[targetCrypto] > 0) {
        if (!purchasePriceManuallyEdited || isFieldEffectivelyEmpty) {
          form.setValue('purchasePriceUsdt', cryptoPrices[targetCrypto].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: cryptoPrices[targetCrypto] < 0.01 ? 8 : 5 }));
        }
      } else {
         if (!purchasePriceManuallyEdited || isFieldEffectivelyEmpty) {
          form.setValue('purchasePriceUsdt', t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'));
        }
      }
    } else {
      setCurrentCur1(DEFAULT_QUOTE_CURRENCY);
      setCurrentCur2('');
      setCurrentTargetCryptoForSell(null);
      form.setValue('purchasePriceUsdt', '');
      setDisplayedPairMarketPrice('');
    }
  }, [selectedPair, cryptoPrices, form, t, purchasePriceManuallyEdited]); 

  useEffect(() => {
    if (selectedPair && purchasePriceUsdtStr && currentTargetCryptoForSell) {
        const [c1, c2] = selectedPair.split('/') as [CryptoSymbol, CryptoSymbol];
        const userEnteredPurchasePrice = parseFloat(purchasePriceUsdtStr.replace(/,/g, ''));

        if (isNaN(userEnteredPurchasePrice) || userEnteredPurchasePrice <= 0) {
            setDisplayedPairMarketPrice(t('dashboard.orderOpportunitySimulator.invalidMarketPrice', 'Invalid Market Price'));
            return;
        }

        let derivedPairPrice = 0;
        if (c1 === currentTargetCryptoForSell) { 
            if (c2 === DEFAULT_QUOTE_CURRENCY) { 
                derivedPairPrice = userEnteredPurchasePrice; 
            } else { 
                const priceOfCur2InUSDT = cryptoPrices[c2];
                if (priceOfCur2InUSDT > 0) {
                     derivedPairPrice = userEnteredPurchasePrice / priceOfCur2InUSDT ; 
                }
            }
        } else if (c2 === currentTargetCryptoForSell) { 
             if (c1 === DEFAULT_QUOTE_CURRENCY) { 
                derivedPairPrice = 1 / userEnteredPurchasePrice; 
             } else { 
                const priceOfCur1InUSDT = cryptoPrices[c1];
                 if (priceOfCur1InUSDT > 0) {
                    derivedPairPrice = priceOfCur1InUSDT / userEnteredPurchasePrice; 
                }
             }
        }
        
        if (derivedPairPrice > 0) {
            setDisplayedPairMarketPrice(derivedPairPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: derivedPairPrice < 0.001 ? 8 : 5 }));
        } else {
            setDisplayedPairMarketPrice(t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'));
        }
    } else {
        setDisplayedPairMarketPrice('');
    }
  }, [selectedPair, purchasePriceUsdtStr, currentCur1, currentCur2, currentTargetCryptoForSell, cryptoPrices, t]);


  useEffect(() => {
    if (!selectedPair || !inputAmountStr || !purchasePriceUsdtStr || !currentTargetCryptoForSell) {
      setSimulatedRows([]);
      return;
    }

    const inputAmountNum = parseFloat(inputAmountStr);
    const userEnteredPurchasePriceInUSDT = parseFloat(purchasePriceUsdtStr.replace(/,/g, ''));

    if (isNaN(inputAmountNum) || inputAmountNum <= 0 || isNaN(userEnteredPurchasePriceInUSDT) || userEnteredPurchasePriceInUSDT <= 0) {
      const rowsToShow: SimulatedRow[] = [];
       if (isNaN(userEnteredPurchasePriceInUSDT) || userEnteredPurchasePriceInUSDT <= 0) {
         rowsToShow.push({
            isBuyRow: true, cur1: currentCur1, cur2: currentCur2,
            operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1: currentCur1, cur2: currentCur2}),
            displayAmount1: `${inputAmountNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currentCur1}`,
            displayMarketPrice: t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'),
            displayAmount2: '', displayCommission: '', displayNetProfit: '-',
        });
      }
      setSimulatedRows(rowsToShow);
      return;
    }
    
    const [c1, c2] = selectedPair.split('/') as [CryptoSymbol, CryptoSymbol];
    const newRows: SimulatedRow[] = [];

    let rawMarketPriceC1InC2 = 0;
    if (c1 === currentTargetCryptoForSell) { 
        if (c2 === DEFAULT_QUOTE_CURRENCY) { 
            rawMarketPriceC1InC2 = userEnteredPurchasePriceInUSDT;
        } else { 
            const priceOfC2InUSDT = cryptoPrices[c2];
            if (priceOfC2InUSDT > 0) rawMarketPriceC1InC2 = userEnteredPurchasePriceInUSDT / priceOfC2InUSDT;
        }
    } else if (c2 === currentTargetCryptoForSell) { 
        if (c1 === DEFAULT_QUOTE_CURRENCY) { 
            rawMarketPriceC1InC2 = 1 / userEnteredPurchasePriceInUSDT;
        } else { 
            const priceOfC1InUSDT = cryptoPrices[c1];
            if (priceOfC1InUSDT > 0) rawMarketPriceC1InC2 = priceOfC1InUSDT / userEnteredPurchasePriceInUSDT;
        }
    }

     if (rawMarketPriceC1InC2 <= 0 && !(c1 === DEFAULT_QUOTE_CURRENCY && c2 === currentTargetCryptoForSell && userEnteredPurchasePriceInUSDT > 0) && !(c2 === DEFAULT_QUOTE_CURRENCY && c1 === currentTargetCryptoForSell && userEnteredPurchasePriceInUSDT > 0) ) {
        setSimulatedRows([{
            isBuyRow: true, cur1: c1, cur2: c2,
            operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1, cur2}),
            displayAmount1: `${inputAmountNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c1 as any) ? 2 : 8})} ${c1}`,
            displayMarketPrice: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'),
            displayAmount2: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'), displayCommission: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'), displayNetProfit: '-',
        }]);
        return;
    }


    const exchangedAmountC2 = inputAmountNum * rawMarketPriceC1InC2;
    
    let amountOfTargetCryptoInBuy: number;
    if (c1 === currentTargetCryptoForSell) {
        amountOfTargetCryptoInBuy = inputAmountNum;
    } else { 
        amountOfTargetCryptoInBuy = exchangedAmountC2;
    }
    const initialInvestmentInUSDT = amountOfTargetCryptoInBuy * userEnteredPurchasePriceInUSDT;
    
    const commissionBuyInUSDT = initialInvestmentInUSDT * COMMISSION_RATE;

    newRows.push({
      isBuyRow: true, cur1: c1, cur2: c2,
      operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1: c1, cur2: c2}),
      displayAmount1: `${inputAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c1 as any) ? 2 : 8 })} ${c1}`,
      displayMarketPrice: `${rawMarketPriceC1InC2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: rawMarketPriceC1InC2 < 0.001 ? 8 : 5 })} ${c2}/${c1}`,
      displayAmount2: `${exchangedAmountC2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c2 as any) ? 2 : 8 })} ${c2}`,
      displayCommission: `${commissionBuyInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
      displayNetProfit: '-',
      rawInputAmountCur1: inputAmountNum,
      rawMarketPriceCur1InCur2: rawMarketPriceC1InC2,
      rawExchangedAmountCur2: exchangedAmountC2,
      rawCommissionBuyInUSDT: commissionBuyInUSDT,
      amountOfTargetCryptoInBuy: amountOfTargetCryptoInBuy,
      initialInvestmentInUSDT: initialInvestmentInUSDT,
    });

    const basePriceForSellRowsInUSDT = userEnteredPurchasePriceInUSDT; 

    OPPORTUNITY_PERCENTAGES.forEach(perc => {
      const targetSellPriceOfTargetCryptoInUSDT = basePriceForSellRowsInUSDT * (1 + perc);
      const usdtReceivedFromSale = amountOfTargetCryptoInBuy * targetSellPriceOfTargetCryptoInUSDT;
      const commissionSellInUSDT = usdtReceivedFromSale * COMMISSION_RATE;
      const netProfitInUSDT = (usdtReceivedFromSale - initialInvestmentInUSDT) - (commissionBuyInUSDT + commissionSellInUSDT);

      newRows.push({
        isBuyRow: false,
        operation: t('dashboard.orderOpportunitySimulator.sellOperationPerc', 'Sell {targetCrypto} (+{perc}%)', {targetCrypto: currentTargetCryptoForSell!, perc: (perc * 100).toFixed(1)}),
        displayAmount1: `${amountOfTargetCryptoInBuy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currentTargetCryptoForSell}`,
        displayMarketPrice: `${targetSellPriceOfTargetCryptoInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: targetSellPriceOfTargetCryptoInUSDT < 1 ? 5 : 2 })} ${DEFAULT_QUOTE_CURRENCY}/${currentTargetCryptoForSell}`,
        displayAmount2: `${usdtReceivedFromSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${DEFAULT_QUOTE_CURRENCY}`,
        displayCommission: `${commissionSellInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
        displayNetProfit: `${netProfitInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${DEFAULT_QUOTE_CURRENCY}`,
        netProfitValue: netProfitInUSDT,
        rawTargetCryptoAmountSold: amountOfTargetCryptoInBuy,
        rawSellPriceTargetCryptoInUSDT: targetSellPriceOfTargetCryptoInUSDT,
        rawUSDTReceivedFromSale: usdtReceivedFromSale,
        rawCommissionSellInUSDT: commissionSellInUSDT,
        // Carry over buy-related info for saving this specific order
        amountOfTargetCryptoInBuy: amountOfTargetCryptoInBuy,
        initialInvestmentInUSDT: initialInvestmentInUSDT,
        rawCommissionBuyInUSDT: commissionBuyInUSDT,
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, inputAmountStr, purchasePriceUsdtStr, cryptoPrices, t, currentTargetCryptoForSell, currentCur1, currentCur2]);


  const handleSaveFullSimulation = async () => {
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
    const userEnteredPurchasePriceInUSDT = parseFloat(purchasePriceUsdtStr.replace(/,/g, ''));


    if (!buyRowData || !currentTargetCryptoForSell || isNaN(userEnteredPurchasePriceInUSDT) || userEnteredPurchasePriceInUSDT <=0 || !buyRowData.rawExchangedAmountCur2 || !buyRowData.amountOfTargetCryptoInBuy ) {
       toast({
        title: t('dashboard.orderOpportunitySimulator.toast.saveErrorTitle', "Save Error"),
        description: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', "There is no valid simulation data to save."),
        variant: "warning",
      });
      return;
    }
    
    setIsSavingSimulation(true);
    
    const simulationToSave: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'> = {
      par_operacion: `${currentTargetCryptoForSell}/${DEFAULT_QUOTE_CURRENCY}`, 
      monto_compra_usdt: buyRowData.amountOfTargetCryptoInBuy * userEnteredPurchasePriceInUSDT,
      precio_compra: userEnteredPurchasePriceInUSDT,
      cantidad_cripto_comprada: buyRowData.amountOfTargetCryptoInBuy,
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
      setIsSavingSimulation(false);
    }
  };

  const handleSaveOrder = async (sellRowIndex: number) => {
    if (!user) {
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.orderSaveErrorTitle', "Order Save Error"),
        description: t('dashboard.orderOpportunitySimulator.toast.notLoggedInError', "You must be logged in to save orders."),
        variant: "destructive",
      });
      return;
    }

    const sellRow = simulatedRows[sellRowIndex];
    const buyRow = simulatedRows.find(r => r.isBuyRow); // Assuming there's always one buy row as the first element

    if (!buyRow || !sellRow || sellRow.isBuyRow || !currentTargetCryptoForSell || !selectedPair) {
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.orderSaveErrorTitle', "Order Save Error"),
        description: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', "No valid order data to save for this row."),
        variant: "warning",
      });
      return;
    }
    
    const userEnteredPurchasePriceInUSDT = parseFloat(purchasePriceUsdtStr.replace(/,/g, ''));
    if(isNaN(userEnteredPurchasePriceInUSDT) || userEnteredPurchasePriceInUSDT <= 0){
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.orderSaveErrorTitle', "Order Save Error"),
        description: t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'),
        variant: "warning",
      });
      return;
    }

    setSavingOrderId(`order-${sellRowIndex}`); // Use a unique ID for the row being saved

    const orderToSave: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'> = {
      targetCrypto: currentTargetCryptoForSell,
      quoteCurrency: DEFAULT_QUOTE_CURRENCY,
      amountOfTargetCryptoBought: sellRow.amountOfTargetCryptoInBuy!,
      buyPricePerUnit: userEnteredPurchasePriceInUSDT,
      totalBuyValueInQuote: sellRow.initialInvestmentInUSDT!,
      buyCommissionInQuote: sellRow.rawCommissionBuyInUSDT!,
      sellPricePerUnit: sellRow.rawSellPriceTargetCryptoInUSDT!,
      totalSellValueInQuote: sellRow.rawUSDTReceivedFromSale!,
      sellCommissionInQuote: sellRow.rawCommissionSellInUSDT!,
      netProfitInQuote: sellRow.netProfitValue!,
      originalPair: selectedPair,
      inputAmount: parseFloat(inputAmountStr),
      inputCurrency: currentCur1,
    };

    try {
      await saveOrderToFirebase(user.id, orderToSave);
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.orderSavedSuccessTitle', "Order Saved"),
        description: t('dashboard.orderOpportunitySimulator.toast.orderSavedSuccessDescription', "The specific order has been saved."),
      });
    } catch (error) {
      console.error("Failed to save order:", error);
      toast({
        title: t('dashboard.orderOpportunitySimulator.toast.orderSaveErrorTitle', "Order Save Error"),
        description: error instanceof Error ? error.message : t('dashboard.orderOpportunitySimulator.toast.orderSaveErrorDescription', "Could not save the order."),
        variant: "destructive",
      });
    } finally {
      setSavingOrderId(null);
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
                name="purchasePriceUsdt"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>
                        {t('dashboard.orderOpportunitySimulator.purchasePriceUsdtLabel', 'Purchase Price of {targetCrypto} (USDT)', { targetCrypto: currentTargetCryptoForSell || 'Crypto' })}
                    </FormLabel>
                    <FormControl>
                    <Input 
                        type="text" 
                        placeholder="e.g., 60000"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                 <div className="md:col-start-2"> 
                    <FormLabel>
                        {t('dashboard.orderOpportunitySimulator.marketPairPriceLabel', 'Market Price ({pair})', { pair: selectedPair ? `${currentCur2}/${currentCur1}` : 'Pair' })}
                    </FormLabel>
                    <Input 
                        type="text"
                        value={displayedPairMarketPrice || (selectedPair && purchasePriceUsdtStr ? t('dashboard.orderOpportunitySimulator.calculating', 'Calculating...') : '')}
                        readOnly 
                        className="bg-muted/50 border-muted"
                    />
                </div>
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
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur1Display', currentCur1, currentCur2, currentTargetCryptoForSell, simulatedRows[0]?.isBuyRow === false)}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.marketPriceDisplay', 'Market Price')}</TableHead>
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur2Display', currentCur1, currentCur2, currentTargetCryptoForSell, simulatedRows[0]?.isBuyRow === false)}</TableHead>
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
                        {!row.isBuyRow && user && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveOrder(index)}
                            disabled={savingOrderId === `order-${index}`}
                            title={t('dashboard.orderOpportunitySimulator.saveOrderButton', 'Save Order')}
                          >
                            {savingOrderId === `order-${index}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FilePlus2 className="h-4 w-4" />
                            )}
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
                disabled={isSavingSimulation || !user || simulatedRows.length === 0 || !simulatedRows.find(r => r.isBuyRow)?.rawCommissionBuyInUSDT === undefined}
                className="mt-4 w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
              >
              {isSavingSimulation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('dashboard.orderOpportunitySimulator.saveButton', 'Save Simulation')}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            {selectedPair && inputAmountStr && purchasePriceUsdtStr
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
