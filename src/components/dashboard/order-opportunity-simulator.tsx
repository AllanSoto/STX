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
import { DETAILED_TRADING_PAIRS, COMMISSION_RATE, QUOTE_CURRENCY as DEFAULT_QUOTE_CURRENCY, STABLECOIN_SYMBOLS } from '@/lib/constants';
import type { CryptoSymbol } from '@/lib/constants';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
// import { useAuth } from '@/hooks/use-auth'; // Auth removed
import { saveSimulationToFirebase } from '@/lib/firebase/simulations'; 
import { saveOrderToFirebase } from '@/lib/firebase/orders'; 
import type { SimulationLogEntry, SavedOrder } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Save, FilePlus2 } from 'lucide-react';


const OPPORTUNITY_PERCENTAGES = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]; 

const getSimulatorSchema = (t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string) => z.object({
  pair: z.string().min(1, { message: t('zod.orderOpportunity.selectPair', 'Please select a trading pair.') }),
  inputAmount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.orderOpportunity.positiveInputAmount', 'Amount must be a positive number.') }),
  purchasePriceCrypto: z.string().refine(val => {
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
  cur1?: CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY;
  cur2?: CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY | '';
  
  rawInputAmountC1?: number; 
  rawPurchasePriceC1InC2?: number; 
  rawAmountOfC2Exchanged?: number; 
  rawCommissionBuyInUSDT?: number; 
  rawTotalInvestmentInUSDT?: number;

  rawAmountOfCryptoSold?: number; 
  rawSellPriceTargetCryptoInQuote?: number; 
  rawQuoteReceivedFromSale?: number; 
  rawCommissionSellInUSDT?: number; 
}


export function OrderOpportunitySimulator({ cryptoPrices }: OrderOpportunitySimulatorProps) {
  const { translations, language, hydrated: languageHydrated } = useLanguage();
  // const { user } = useAuth(); // Auth removed
  const { toast } = useToast();
  const [isSavingSimulation, setIsSavingSimulation] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [purchasePriceManuallyEdited, setPurchasePriceManuallyEdited] = useState(false);
  const [displayedCryptoValue, setDisplayedCryptoValue] = useState<string>('');


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
      inputAmount: '100', 
      purchasePriceCrypto: '', 
    },
  });

  const [simulatedRows, setSimulatedRows] = useState<SimulatedRow[]>([]);
  const [currentCur1, setCurrentCur1] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY | ''>(''); 
  const [currentCur2, setCurrentCur2] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY | ''>(''); 


  const selectedPair = form.watch('pair') as typeof DETAILED_TRADING_PAIRS[number] | '';
  const inputAmountStr = form.watch('inputAmount'); 
  const purchasePriceCryptoStr = form.watch('purchasePriceCrypto'); 


  useEffect(() => {
    setPurchasePriceManuallyEdited(false); 
  }, [selectedPair]);

  useEffect(() => {
    if (selectedPair) {
      const [base, quote] = selectedPair.split('/') as [CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY, CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY];
      setCurrentCur1(base); 
      setCurrentCur2(quote);
      
      const currentPurchasePriceFieldValue = form.getValues('purchasePriceCrypto');
      const isPurchaseFieldEffectivelyEmpty = currentPurchasePriceFieldValue === '' || currentPurchasePriceFieldValue === t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A');

      let autoFilledPrice = 0;
      if (quote === DEFAULT_QUOTE_CURRENCY && cryptoPrices[base as CryptoSymbol] > 0) { // Pair like XRP/USDT, price is price of XRP in USDT
        autoFilledPrice = cryptoPrices[base as CryptoSymbol];
      } else if (base === DEFAULT_QUOTE_CURRENCY && cryptoPrices[quote as CryptoSymbol] > 0) { // Pair like USDT/XRP, price is price of USDT in XRP
        autoFilledPrice = 1 / cryptoPrices[quote as CryptoSymbol];
      }
      // Note: Crypto/Crypto pairs like ETH/BTC are not directly supported by `cryptoPrices` map and would need price_ETH_USDT / price_BTC_USDT

      if (autoFilledPrice > 0) {
        if (!purchasePriceManuallyEdited || isPurchaseFieldEffectivelyEmpty) {
          form.setValue('purchasePriceCrypto', autoFilledPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: autoFilledPrice < 0.01 ? 8 : 5 }));
        }
      } else {
         if (!purchasePriceManuallyEdited || isPurchaseFieldEffectivelyEmpty) {
          form.setValue('purchasePriceCrypto', t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'));
        }
      }
    } else {
      setCurrentCur1('');
      setCurrentCur2('');
      form.setValue('purchasePriceCrypto', '');
      setDisplayedCryptoValue('');
    }
  }, [selectedPair, cryptoPrices, form, t, purchasePriceManuallyEdited]);


  useEffect(() => {
    const inputAmountNum = parseFloat(inputAmountStr); 
    const purchasePriceNum = parseFloat(purchasePriceCryptoStr.replace(/,/g, '')); 

    if (selectedPair && currentCur1 && currentCur2 && !isNaN(inputAmountNum) && inputAmountNum > 0 && !isNaN(purchasePriceNum) && purchasePriceNum > 0) {
        // "Crypto Intercambiado" is Amount of currentCur1 * Price (of currentCur1 in currentCur2)
        const calculatedValue = inputAmountNum * purchasePriceNum;
        setDisplayedCryptoValue(
            `${calculatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(currentCur2 as any) ? 2 : 8 })} ${currentCur2}`
        );
    } else if (selectedPair && inputAmountStr && purchasePriceCryptoStr) {
        if(isNaN(purchasePriceNum) || purchasePriceNum <=0) {
             setDisplayedCryptoValue(t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'));
        } else {
             setDisplayedCryptoValue(t('dashboard.orderOpportunitySimulator.calculationError', 'Calculation Error'));
        }
    } else {
        setDisplayedCryptoValue(''); 
    }
}, [selectedPair, inputAmountStr, purchasePriceCryptoStr, currentCur1, currentCur2, t]);


  useEffect(() => {
    if (!selectedPair || !inputAmountStr || !purchasePriceCryptoStr || !currentCur1 || !currentCur2) {
      setSimulatedRows([]);
      return;
    }

    const [c1, c2] = selectedPair.split('/') as [CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY, CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY];
    const investmentAmountNum = parseFloat(inputAmountStr); // Amount of c1
    const userEnteredPriceOfC1InC2 = parseFloat(purchasePriceCryptoStr.replace(/,/g, '')); // Price of c1 in c2 (e.g. USDT per XRP)

    if (isNaN(investmentAmountNum) || investmentAmountNum <= 0 || isNaN(userEnteredPriceOfC1InC2) || userEnteredPriceOfC1InC2 <= 0) {
      const rowsToShow: SimulatedRow[] = [];
       if (isNaN(userEnteredPriceOfC1InC2) || userEnteredPriceOfC1InC2 <= 0) {
         rowsToShow.push({
            isBuyRow: true, cur1: c1, cur2: c2,
            operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1: String(c1), cur2: String(c2)}),
            displayAmount1: `${investmentAmountNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c1 as any) ? 2: 8})} ${c1}`,
            displayMarketPrice: t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'),
            displayAmount2: '', displayCommission: '', displayNetProfit: '-',
        });
      }
      setSimulatedRows(rowsToShow);
      return;
    }
    
    const newRows: SimulatedRow[] = [];

    // Buy Row Calculation
    const exchangedAmountC2 = investmentAmountNum * userEnteredPriceOfC1InC2; // Amount of c2 received
    
    let totalInvestmentInUSDTForBuy: number; // The value of `investmentAmountNum` (of C1) in USDT
    if (c1 === DEFAULT_QUOTE_CURRENCY) { // If C1 is USDT
        totalInvestmentInUSDTForBuy = investmentAmountNum;
    } else if (cryptoPrices[c1 as CryptoSymbol] > 0) { // If C1 is another crypto, convert its value to USDT
        totalInvestmentInUSDTForBuy = investmentAmountNum * cryptoPrices[c1 as CryptoSymbol];
    } else {
        console.warn(`Market price for ${c1} not available for USDT conversion during commission calculation.`);
        totalInvestmentInUSDTForBuy = 0; 
    }
    const commissionBuyInUSDT = totalInvestmentInUSDTForBuy * COMMISSION_RATE;

    newRows.push({
      isBuyRow: true, cur1: c1, cur2: c2,
      operation: t('dashboard.orderOpportunitySimulator.buyOperation', 'Buy {targetCrypto} with {baseCurrency}', {targetCrypto: String(c2), baseCurrency: String(c1)}),
      displayAmount1: `${investmentAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c1 as any) ? 2 : 8 })} ${c1}`,
      displayMarketPrice: `${userEnteredPriceOfC1InC2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: userEnteredPriceOfC1InC2 < 0.01 ? 8 : 5 })} ${c2}/${c1}`, // Price of C1 in C2
      displayAmount2: `${exchangedAmountC2.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c2 as any) ? 2: 8})} ${c2}`,
      displayCommission: `${commissionBuyInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
      displayNetProfit: '-',
      rawInputAmountC1: investmentAmountNum,
      rawPurchasePriceC1InC2: userEnteredPriceOfC1InC2,
      rawAmountOfC2Exchanged: exchangedAmountC2,
      rawCommissionBuyInUSDT: commissionBuyInUSDT,
      rawTotalInvestmentInUSDT: totalInvestmentInUSDTForBuy,
    });

    // Sell Rows Calculation
    const cryptoToSellForOpportunities = c2; // The crypto we "bought" (c2)
    const sellToBaseCurrency = c1; // We always simulate selling back to the original c1

    OPPORTUNITY_PERCENTAGES.forEach(perc => {
      // Base price for sell simulation is the price of `cryptoToSellForOpportunities` (c2) in `sellToBaseCurrency` (c1)
      // This is 1 / userEnteredPriceOfC1InC2 (which was price of c1 in c2)
      const basePriceOfC2InC1 = 1 / userEnteredPriceOfC1InC2;
      if (isNaN(basePriceOfC2InC1) || basePriceOfC2InC1 <= 0) return;

      const targetSellPriceOfC2InC1 = basePriceOfC2InC1 * (1 + perc);
      const grossAmountOfC1ReceivedFromSale = exchangedAmountC2 * targetSellPriceOfC2InC1; 
      
      let totalSellValueInUSDTForCommission: number;
      if (c1 === DEFAULT_QUOTE_CURRENCY) { // If selling back to USDT
           totalSellValueInUSDTForCommission = grossAmountOfC1ReceivedFromSale;
       } else if (cryptoPrices[c1 as CryptoSymbol] > 0) { // If selling back to another crypto, convert its value to USDT
           totalSellValueInUSDTForCommission = grossAmountOfC1ReceivedFromSale * cryptoPrices[c1 as CryptoSymbol];
       } else {
           totalSellValueInUSDTForCommission = 0; 
       }
      const commissionSellInUSDT = totalSellValueInUSDTForCommission * COMMISSION_RATE;
      
      const netProfitInUSDT = totalSellValueInUSDTForCommission - totalInvestmentInUSDTForBuy - commissionBuyInUSDT - commissionSellInUSDT;

      newRows.push({
        isBuyRow: false, cur1: cryptoToSellForOpportunities, cur2: sellToBaseCurrency,
        operation: t('dashboard.orderOpportunitySimulator.sellOperationPerc', 'Sell {targetCrypto} (+{perc}%)', {targetCrypto: String(cryptoToSellForOpportunities), perc: (perc * 100).toFixed(1)}),
        displayAmount1: `${exchangedAmountC2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(cryptoToSellForOpportunities as any) ? 2 : 8 })} ${cryptoToSellForOpportunities}`, 
        displayMarketPrice: `${targetSellPriceOfC2InC1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: targetSellPriceOfC2InC1 < 1 ? 8 : 5 })} ${sellToBaseCurrency}/${cryptoToSellForOpportunities}`, 
        displayAmount2: `${grossAmountOfC1ReceivedFromSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(sellToBaseCurrency as any) ? 2 : 8 })} ${sellToBaseCurrency}`, 
        displayCommission: `${commissionSellInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
        displayNetProfit: `${netProfitInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${DEFAULT_QUOTE_CURRENCY}`,
        netProfitValue: netProfitInUSDT,

        rawAmountOfCryptoSold: exchangedAmountC2,
        rawSellPriceTargetCryptoInQuote: targetSellPriceOfC2InC1, 
        rawQuoteReceivedFromSale: grossAmountOfC1ReceivedFromSale, 
        rawCommissionSellInUSDT: commissionSellInUSDT,
        
        // Carry over from buy for context if needed for saving order
        rawInputAmountC1: investmentAmountNum,
        rawPurchasePriceC1InC2: userEnteredPriceOfC1InC2,
        rawAmountOfC2Exchanged: exchangedAmountC2, 
        rawCommissionBuyInUSDT: commissionBuyInUSDT, 
        rawTotalInvestmentInUSDT: totalInvestmentInUSDTForBuy,
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, inputAmountStr, purchasePriceCryptoStr, cryptoPrices, t, currentCur1, currentCur2]);


  const handleSaveFullSimulation = async () => {
    if (simulatedRows.length === 0 || !simulatedRows[0].isBuyRow || !selectedPair || !currentCur1 || !currentCur2) {
      toast({ title: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', 'There is no valid simulation/order data to save.'), variant: "warning" });
      return;
    }
    // if (!user) { // Auth removed
    //   toast({ title: t('dashboard.orderOpportunitySimulator.toast.saveDisabledTitle', 'Save Disabled'), description: t('dashboard.orderOpportunitySimulator.toast.saveDisabledDescription', 'Saving simulations is disabled as user authentication has been removed.'), variant: "warning" });
    //   return;
    // }
    setIsSavingSimulation(true);
    try {
      const buyRow = simulatedRows[0];
      const simulationData: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'> = {
        par_operacion: selectedPair,
        monto_compra_usdt: buyRow.rawTotalInvestmentInUSDT || 0, 
        precio_compra: buyRow.rawPurchasePriceC1InC2 || 0, // Price of C1 in C2
        cantidad_cripto_comprada: buyRow.rawAmountOfC2Exchanged || 0, // Amount of C2
        comision_compra: buyRow.rawCommissionBuyInUSDT || 0,
        ventas_simuladas: simulatedRows.slice(1).map(sellRow => ({
          precio_venta_simulado: sellRow.rawSellPriceTargetCryptoInQuote || 0, 
          ingreso_bruto: sellRow.rawQuoteReceivedFromSale || 0, 
          comision_venta: sellRow.rawCommissionSellInUSDT || 0,
          ganancia_neta: sellRow.netProfitValue || 0,
        })),
      };
      await saveSimulationToFirebase("general_user", simulationData);  // Using "general_user" as placeholder
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
  };

  const handleSaveOrder = async (sellRowIndex: number) => {
     if (simulatedRows.length === 0 || !simulatedRows[0].isBuyRow || !selectedPair || !currentCur1 || !currentCur2 || sellRowIndex >= simulatedRows.length || simulatedRows[sellRowIndex].isBuyRow) {
      toast({ title: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', 'There is no valid order data to save.'), variant: "warning" });
      return;
    }
    // if (!user) { // Auth removed
    //   toast({ title: t('dashboard.orderOpportunitySimulator.toast.orderSaveDisabledTitle', 'Order Save Disabled'), description: t('dashboard.orderOpportunitySimulator.toast.orderSaveDisabledDescription', 'Saving orders is disabled as user authentication has been removed.'), variant: "warning" });
    //   return;
    // }

    setSavingOrderId(simulatedRows[sellRowIndex].operation); 
    try {
      const buyRow = simulatedRows[0]; 
      const sellRow = simulatedRows[sellRowIndex]; 

      // Ensure C1 and C2 from the buy row are defined
      const c1 = buyRow.cur1!;
      const c2 = buyRow.cur2!;

      const orderData: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'> = {
        targetCrypto: String(c1), // The crypto that was initially spent/invested (C1)
        quoteCurrency: String(c2), // The crypto that was bought and then sold (C2) - or USDT if C2 was sold for USDT
        
        amountOfTargetCryptoBought: buyRow.rawInputAmountC1 || 0, // Amount of C1 initially invested
        buyPricePerUnit: buyRow.rawPurchasePriceC1InC2 || 0,  // Price of C1 in terms of C2
        totalBuyValueInQuote: buyRow.rawTotalInvestmentInUSDT || 0, // Initial investment in USDT equivalent
        buyCommissionInQuote: buyRow.rawCommissionBuyInUSDT || 0, 

        // Sell operation details (selling c2 to get back c1 or USDT)
        // rawAmountOfCryptoSold is amount of C2 sold
        // rawSellPriceTargetCryptoInQuote is price of C2 in C1 (or C2 in USDT)
        // rawQuoteReceivedFromSale is amount of C1 (or USDT) received
        sellPricePerUnit: sellRow.rawSellPriceTargetCryptoInQuote || 0, 
        totalSellValueInQuote: sellRow.rawCommissionSellInUSDT !== undefined ? (sellRow.rawQuoteReceivedFromSale! * (sellRow.cur2 === DEFAULT_QUOTE_CURRENCY ? 1 : cryptoPrices[sellRow.cur2! as CryptoSymbol] || 0)) : 0, // Value from sale in USDT
        sellCommissionInQuote: sellRow.rawCommissionSellInUSDT || 0, 
        
        netProfitInQuote: sellRow.netProfitValue || 0, 
        
        originalPair: selectedPair,
        inputAmount: parseFloat(inputAmountStr) || 0, 
        inputCurrency: String(currentCur1), 
      };

      await saveOrderToFirebase("general_user", orderData); // Using "general_user" as placeholder
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
                name="purchasePriceCrypto"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>
                        {t('dashboard.orderOpportunitySimulator.purchasePriceCryptoLabel', 'Price of {crypto1} in {crypto2}', { crypto1: currentCur1 || 'Crypto', crypto2: currentCur2 || 'Quote' })}
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
                        {t('dashboard.orderOpportunitySimulator.exchangedCryptoLabel', 'Exchanged Crypto ({crypto})', {crypto: currentCur2 || '...'})}
                    </FormLabel>
                    <Input
                        type="text"
                        value={displayedCryptoValue || (selectedPair && inputAmountStr && purchasePriceCryptoStr ? t('dashboard.orderOpportunitySimulator.calculating', 'Calculating...') : '')}
                        readOnly
                        className="bg-muted/50 border-muted mt-1"
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
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur1Display', simulatedRows[0]?.cur1?.toString(), simulatedRows[0]?.cur2?.toString())}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.marketPriceDisplay', 'Market Price')}</TableHead>
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur2Display', simulatedRows[0]?.cur1?.toString(), simulatedRows[0]?.cur2?.toString())}</TableHead>
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
                            disabled={isSavingSimulation || savingOrderId === row.operation } // Auth removed: || !user
                            title={t('dashboard.orderOpportunitySimulator.saveOrderButton', 'Save Order')}
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
                disabled={isSavingSimulation } // Auth removed: || !user
                className="mt-4 w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
                title={t('dashboard.orderOpportunitySimulator.saveButton', 'Save Full Simulation')}
              >
              {isSavingSimulation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('dashboard.orderOpportunitySimulator.saveButton', 'Save Full Simulation')}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            {selectedPair && inputAmountStr && purchasePriceCryptoStr
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
