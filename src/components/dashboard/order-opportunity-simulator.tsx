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
  purchasePriceUsdt: z.string().refine(val => { // New field for purchase price in USDT
    if (!val) return false;
    const num = parseFloat(val.replace(/,/g, ''));
    return !isNaN(num) && num > 0;
  }, { message: t('zod.orderOpportunity.purchasePriceUsdtPositive', 'Purchase price in USDT must be a positive number.') }),
});

type SimulatorFormValues = z.infer<ReturnType<typeof getSimulatorSchema>>;

interface OrderOpportunitySimulatorProps {
  cryptoPrices: Record<CryptoSymbol, number>; // Prices in USDT
}

interface SimulatedRow {
  operation: string;
  displayAmount1: string; // Amount of cur1
  displayMarketPrice: string; // Market price (cur2/cur1) or (USDT/targetCrypto) for sell rows
  displayAmount2: string; // Amount of cur2 (buy row) or USDT (sell rows)
  displayCommission: string;
  displayNetProfit: string;
  netProfitValue?: number;
  isBuyRow: boolean;
  cur1?: string; // First currency in the pair for buy row
  cur2?: string; // Second currency in the pair for buy row
  rawInputAmountCur1?: number;
  rawMarketPriceCur1InCur2?: number; // Price of cur1 in terms of cur2
  rawExchangedAmountCur2?: number;
  rawCommissionBuyInUSDT?: number;
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
      purchasePriceUsdt: '', // Initialize new field
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
    setPurchasePriceManuallyEdited(false); // Reset manual edit flag when pair changes
  }, [selectedPair]);
  
  // Effect to update target crypto and default purchasePriceUsdt when pair changes
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair, cryptoPrices, form.setValue, t]); // Removed form and purchasePriceManuallyEdited to avoid loop, ensure form.setValue is stable

  // Effect to update the displayed pair market price
  useEffect(() => {
    if (selectedPair && purchasePriceUsdtStr && currentTargetCryptoForSell) {
        const [c1, c2] = selectedPair.split('/') as [CryptoSymbol, CryptoSymbol];
        const userEnteredPurchasePrice = parseFloat(purchasePriceUsdtStr.replace(/,/g, ''));

        if (isNaN(userEnteredPurchasePrice) || userEnteredPurchasePrice <= 0) {
            setDisplayedPairMarketPrice(t('dashboard.orderOpportunitySimulator.invalidMarketPrice', 'Invalid Market Price'));
            return;
        }

        let derivedPairPrice = 0;
        // Logic to calculate displayed pair price (cur2/cur1) based on user's USDT price for targetCrypto
        if (c1 === currentTargetCryptoForSell) { // Target is cur1 (e.g. BTC/USDT, target=BTC)
            if (c2 === DEFAULT_QUOTE_CURRENCY) { // BTC/USDT
                derivedPairPrice = userEnteredPurchasePrice; // Price of BTC in USDT
            } else { // ETH/BTC, target=ETH (cur1). We want price of BTC in ETH (cur2/cur1)
                const priceOfCur2InUSDT = cryptoPrices[c2];
                if (priceOfCur2InUSDT > 0) {
                     derivedPairPrice = priceOfCur2InUSDT / userEnteredPurchasePrice ; // (USDT/BTC) / (USDT/ETH) = ETH/BTC --- No this is price of cur2 in cur1
                }
            }
        } else if (c2 === currentTargetCryptoForSell) { // Target is cur2 (e.g. USDT/BTC, target=BTC)
             if (c1 === DEFAULT_QUOTE_CURRENCY) { // USDT/BTC
                derivedPairPrice = 1 / userEnteredPurchasePrice; // Price of USDT in BTC
             } else { // BTC/ETH, target=ETH (cur2). We want price of ETH in BTC (cur2/cur1)
                const priceOfCur1InUSDT = cryptoPrices[c1];
                 if (priceOfCur1InUSDT > 0) {
                    derivedPairPrice = userEnteredPurchasePrice / priceOfCur1InUSDT; // (USDT/ETH) / (USDT/BTC) = BTC/ETH
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


  // Effect to calculate simulation rows
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

    // Calculate rawMarketPriceCur1InCur2 (price of c1 in terms of c2)
    let rawMarketPriceC1InC2 = 0;
    if (c1 === currentTargetCryptoForSell) { // Target is c1
        if (c2 === DEFAULT_QUOTE_CURRENCY) { // e.g. BTC/USDT
            rawMarketPriceC1InC2 = userEnteredPurchasePriceInUSDT;
        } else { // e.g. ETH/BTC, target=ETH(c1)
            const priceOfC2InUSDT = cryptoPrices[c2];
            if (priceOfC2InUSDT > 0) rawMarketPriceC1InC2 = userEnteredPurchasePriceInUSDT / priceOfC2InUSDT;
        }
    } else if (c2 === currentTargetCryptoForSell) { // Target is c2
        if (c1 === DEFAULT_QUOTE_CURRENCY) { // e.g. USDT/BTC
            rawMarketPriceC1InC2 = 1 / userEnteredPurchasePriceInUSDT;
        } else { // e.g. BTC/ETH, target=ETH(c2)
            const priceOfC1InUSDT = cryptoPrices[c1];
            if (priceOfC1InUSDT > 0) rawMarketPriceC1InC2 = priceOfC1InUSDT / userEnteredPurchasePriceInUSDT;
        }
    }
     if (rawMarketPriceC1InC2 <= 0 && !(c1 === DEFAULT_QUOTE_CURRENCY && c2 === currentTargetCryptoForSell && userEnteredPurchasePriceInUSDT > 0) && !(c2 === DEFAULT_QUOTE_CURRENCY && c1 === currentTargetCryptoForSell && userEnteredPurchasePriceInUSDT > 0) ) {
        // Handle case where rawMarketPriceC1InC2 could not be determined for cross pairs
        setSimulatedRows([{
            isBuyRow: true, cur1: c1, cur2: c2,
            operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1, cur2}),
            displayAmount1: `${inputAmountNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c1 as any) ? 2 : 8})} ${c1}`,
            displayMarketPrice: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'),
            displayAmount2: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'), displayCommission: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'), displayNetProfit: '-',
        }]);
        return;
    }


    // "Compra" Row Logic
    const exchangedAmountC2 = inputAmountNum * rawMarketPriceC1InC2;
    
    let valueOfTxInUSDT = 0;
    let amountOfTargetCryptoInBuy: number;

    if (c1 === currentTargetCryptoForSell) {
        amountOfTargetCryptoInBuy = inputAmountNum;
    } else { // c2 must be currentTargetCryptoForSell
        amountOfTargetCryptoInBuy = exchangedAmountC2;
    }
    valueOfTxInUSDT = amountOfTargetCryptoInBuy * userEnteredPurchasePriceInUSDT;
    
    const commissionBuyInUSDT = valueOfTxInUSDT * COMMISSION_RATE;

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
    });

    // "Venta" Rows Logic
    const initialInvestmentInUSDT = valueOfTxInUSDT; // USDT value of the crypto bought/used in the buy leg
    const basePriceForSellRowsInUSDT = userEnteredPurchasePriceInUSDT; // User's specified purchase price of target crypto in USDT

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
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, inputAmountStr, purchasePriceUsdtStr, cryptoPrices, t, currentTargetCryptoForSell, currentCur1, currentCur2]);


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
    const userEnteredPurchasePriceInUSDT = parseFloat(purchasePriceUsdtStr.replace(/,/g, ''));


    if (!buyRowData || !currentTargetCryptoForSell || isNaN(userEnteredPurchasePriceInUSDT) || userEnteredPurchasePriceInUSDT <=0 || !buyRowData.rawExchangedAmountCur2 ) {
       toast({
        title: t('dashboard.orderOpportunitySimulator.toast.saveErrorTitle', "Save Error"),
        description: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', "There is no valid simulation data to save."),
        variant: "warning",
      });
      return;
    }
    
    setIsSaving(true);
    
    let amountOfTargetCryptoInvolved: number;
     if (buyRowData.cur1 === currentTargetCryptoForSell) {
        amountOfTargetCryptoInvolved = buyRowData.rawInputAmountCur1!;
    } else { // cur2 must be currentTargetCryptoForSell
        amountOfTargetCryptoInvolved = buyRowData.rawExchangedAmountCur2!;
    }


    const simulationToSave: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'> = {
      par_operacion: `${currentTargetCryptoForSell}/${DEFAULT_QUOTE_CURRENCY}`, 
      monto_compra_usdt: amountOfTargetCryptoInvolved * userEnteredPurchasePriceInUSDT,
      precio_compra: userEnteredPurchasePriceInUSDT,
      cantidad_cripto_comprada: amountOfTargetCryptoInvolved,
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
            {/* Display for derived market price of the pair */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                 <div className="md:col-start-2"> {/* Aligns with the middle column or adjust as needed */}
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
