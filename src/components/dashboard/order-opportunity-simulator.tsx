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
import { DETAILED_TRADING_PAIRS, COMMISSION_RATE, QUOTE_CURRENCY as DEFAULT_QUOTE_CURRENCY, CRYPTO_SYMBOLS, STABLECOIN_SYMBOLS, COIN_DATA } from '@/lib/constants';
import type { CryptoSymbol } from '@/lib/constants';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
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
  
  rawInputAmountCur1?: number; 
  rawPurchasePriceCryptoInQuote?: number; 
  rawAmountOfCrypto2Exchanged?: number; 
  rawCommissionBuyInQuote?: number; 
  rawTotalInvestmentInQuote?: number;

  rawAmountOfTargetCryptoSold?: number; 
  rawSellPriceTargetCryptoInQuote?: number; 
  rawQuoteReceivedFromSale?: number; 
  rawCommissionSellInQuote?: number; 
}


export function OrderOpportunitySimulator({ cryptoPrices }: OrderOpportunitySimulatorProps) {
  const { translations, language, hydrated: languageHydrated } = useLanguage();
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
  const [currentCur1, setCurrentCur1] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY>(DEFAULT_QUOTE_CURRENCY); 
  const [currentCur2, setCurrentCur2] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY | ''>(''); 
  const [quoteCurrencyForPair, setQuoteCurrencyForPair] = useState<typeof DEFAULT_QUOTE_CURRENCY | CryptoSymbol>(DEFAULT_QUOTE_CURRENCY);
  const [baseCurrencyForPair, setBaseCurrencyForPair] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY | ''>('');


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
      setBaseCurrencyForPair(base);
      setQuoteCurrencyForPair(quote);
      
      const currentPurchasePriceFieldValue = form.getValues('purchasePriceCrypto');
      const isPurchaseFieldEffectivelyEmpty = currentPurchasePriceFieldValue === '' || currentPurchasePriceFieldValue === t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A');

      const targetCryptoForMarketPrice = STABLECOIN_SYMBOLS.includes(base as any) ? quote as CryptoSymbol : base as CryptoSymbol;

      if (targetCryptoForMarketPrice && cryptoPrices[targetCryptoForMarketPrice] > 0) {
        if (!purchasePriceManuallyEdited || isPurchaseFieldEffectivelyEmpty) {
          form.setValue('purchasePriceCrypto', cryptoPrices[targetCryptoForMarketPrice].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: cryptoPrices[targetCryptoForMarketPrice] < 0.01 ? 8 : 5 }));
        }
      } else {
         if (!purchasePriceManuallyEdited || isPurchaseFieldEffectivelyEmpty) {
          form.setValue('purchasePriceCrypto', t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'));
        }
      }
    } else {
      setCurrentCur1(DEFAULT_QUOTE_CURRENCY);
      setCurrentCur2('');
      setBaseCurrencyForPair('');
      setQuoteCurrencyForPair(DEFAULT_QUOTE_CURRENCY);
      form.setValue('purchasePriceCrypto', '');
      setDisplayedCryptoValue('');
    }
  }, [selectedPair, cryptoPrices, form, t, purchasePriceManuallyEdited]);


  useEffect(() => {
    const inputAmountNum = parseFloat(inputAmountStr); 
    const purchasePriceNum = parseFloat(purchasePriceCryptoStr.replace(/,/g, '')); 

    if (selectedPair && !isNaN(inputAmountNum) && inputAmountNum > 0 && !isNaN(purchasePriceNum) && purchasePriceNum > 0) {
        const calculatedValue = inputAmountNum / purchasePriceNum;
        setDisplayedCryptoValue(
            `${calculatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currentCur2}`
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

    const amountOfCur1ToSpend = parseFloat(inputAmountStr); 
    const userEnteredPurchasePriceOfCur2InCur1 = parseFloat(purchasePriceCryptoStr.replace(/,/g, ''));

    if (isNaN(amountOfCur1ToSpend) || amountOfCur1ToSpend <= 0 || isNaN(userEnteredPurchasePriceOfCur2InCur1) || userEnteredPurchasePriceOfCur2InCur1 <= 0) {
      const rowsToShow: SimulatedRow[] = [];
       if (isNaN(userEnteredPurchasePriceOfCur2InCur1) || userEnteredPurchasePriceOfCur2InCur1 <= 0) {
         rowsToShow.push({
            isBuyRow: true, cur1: currentCur1, cur2: currentCur2,
            operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1: String(currentCur1), cur2: String(currentCur2)}),
            displayAmount1: `${amountOfCur1ToSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(currentCur1 as any) ? 2: 8})} ${currentCur1}`,
            displayMarketPrice: t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'),
            displayAmount2: '', displayCommission: '', displayNetProfit: '-',
        });
      }
      setSimulatedRows(rowsToShow);
      return;
    }
    
    const newRows: SimulatedRow[] = [];

    // Buy Row Calculation
    const amountOfCur2Received = amountOfCur1ToSpend / userEnteredPurchasePriceOfCur2InCur1;
    
    // Determine the value of the spent cur1 in USDT for commission calculation
    let totalInvestmentInQuoteForBuy: number;
    if (STABLECOIN_SYMBOLS.includes(currentCur1 as any)) {
        totalInvestmentInQuoteForBuy = amountOfCur1ToSpend;
    } else if (cryptoPrices[currentCur1 as CryptoSymbol] > 0) {
        totalInvestmentInQuoteForBuy = amountOfCur1ToSpend * cryptoPrices[currentCur1 as CryptoSymbol];
    } else {
        console.warn(`Market price for ${currentCur1} not available for commission calculation.`);
        totalInvestmentInQuoteForBuy = 0; // Or handle as an error
    }
    const commissionBuyInQuote = totalInvestmentInQuoteForBuy * COMMISSION_RATE;

    // The amount of Cur2 after commission if commission is deducted from Cur2
    // For simplicity, let's assume commission is always paid in USDT equivalent,
    // so the amount of Cur2 received is not directly reduced by crypto commission here.
    // The cost of the trade (commission) is factored in profit calculation.
    const netAmountOfCur2AfterBuy = amountOfCur2Received; 

    newRows.push({
      isBuyRow: true, cur1: currentCur1, cur2: currentCur2,
      operation: t('dashboard.orderOpportunitySimulator.buyOperation', 'Buy {targetCrypto} with {baseCurrency}', {targetCrypto: String(currentCur2), baseCurrency: String(currentCur1)}),
      displayAmount1: `${amountOfCur1ToSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(currentCur1 as any) ? 2 : 8 })} ${currentCur1}`,
      displayMarketPrice: `${userEnteredPurchasePriceOfCur2InCur1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: userEnteredPurchasePriceOfCur2InCur1 < 0.01 ? 8 : 5 })} ${currentCur1}/${currentCur2}`, 
      displayAmount2: `${amountOfCur2Received.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(currentCur2 as any) ? 2: 8})} ${currentCur2}`,
      displayCommission: `${commissionBuyInQuote.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
      displayNetProfit: '-',
      rawInputAmountCur1: amountOfCur1ToSpend,
      rawPurchasePriceCryptoInQuote: userEnteredPurchasePriceOfCur2InCur1, // This is price of Cur2 in terms of Cur1
      rawAmountOfCrypto2Exchanged: amountOfCur2Received,
      rawCommissionBuyInQuote: commissionBuyInQuote,
      rawTotalInvestmentInQuote: totalInvestmentInQuoteForBuy,
    });

    // Sell Rows Calculation (Simulating selling Cur2 back to Cur1 or to USDT)
    // For simplicity, let's always simulate selling Cur2 for USDT if Cur2 is not USDT.
    // If Cur2 is USDT, it means we bought USDT with another crypto, which is less common scenario for "profit".
    // Let's assume the goal is to get more of the initial Cur1 or more USDT.

    const cryptoToSellForOpportunities = currentCur2 as CryptoSymbol; // The crypto we just "bought"
    const sellToBaseCurrency = STABLECOIN_SYMBOLS.includes(currentCur1 as any) ? currentCur1 : DEFAULT_QUOTE_CURRENCY; // Sell to initial cur1 if stable, else USDT


    OPPORTUNITY_PERCENTAGES.forEach(perc => {
      // Target sell price of `cryptoToSellForOpportunities` in `sellToBaseCurrency`
      // This needs to be derived carefully. If we bought BTC with USDT, now we are selling BTC for USDT.
      // The `userEnteredPurchasePriceOfCur2InCur1` was USDT/BTC.
      // The "profit" is on this rate.
      let basePriceForSellSimulation: number;
      if (STABLECOIN_SYMBOLS.includes(currentCur1 as any) && currentCur1 === sellToBaseCurrency) { // e.g., USDT/BTC, selling BTC for USDT
          basePriceForSellSimulation = userEnteredPurchasePriceOfCur2InCur1; // This was price of BTC in USDT
      } else if (cryptoPrices[cryptoToSellForOpportunities] > 0 && sellToBaseCurrency === DEFAULT_QUOTE_CURRENCY) { // e.g. XRP/BTC, selling BTC for USDT
          basePriceForSellSimulation = cryptoPrices[cryptoToSellForOpportunities];
      } else {
          console.warn("Cannot determine base price for sell simulation for pair:", selectedPair);
          basePriceForSellSimulation = 0; // Or handle as error
      }
      if (basePriceForSellSimulation === 0) return;


      const targetSellPriceOfCryptoToSell = basePriceForSellSimulation * (1 + perc);
      const grossAmountReceivedFromSale = netAmountOfCur2AfterBuy * targetSellPriceOfCryptoToSell; // This is in `sellToBaseCurrency`
      
      // Commission on sell, calculated on the value in USDT
      let totalSellValueInQuoteForCommission: number;
       if (sellToBaseCurrency === DEFAULT_QUOTE_CURRENCY) {
           totalSellValueInQuoteForCommission = grossAmountReceivedFromSale;
       } else if (cryptoPrices[sellToBaseCurrency as CryptoSymbol] > 0) { // if sellToBaseCurrency is a crypto, convert its value to USDT
           totalSellValueInQuoteForCommission = grossAmountReceivedFromSale * cryptoPrices[sellToBaseCurrency as CryptoSymbol];
       } else {
           totalSellValueInQuoteForCommission = 0; // Price not available
       }
      const commissionSellInQuote = totalSellValueInQuoteForCommission * COMMISSION_RATE;
      
      // Net profit is (Total Value Received in USDT) - (Total Value Spent in USDT) - (Total Commissions in USDT)
      // Total Value Received in USDT is totalSellValueInQuoteForCommission
      const netProfitInQuote = totalSellValueInQuoteForCommission - totalInvestmentInQuoteForBuy - commissionBuyInQuote - commissionSellInQuote;


      newRows.push({
        isBuyRow: false, cur1: cryptoToSellForOpportunities, cur2: sellToBaseCurrency as (CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY),
        operation: t('dashboard.orderOpportunitySimulator.sellOperationPerc', 'Sell {targetCrypto} (+{perc}%)', {targetCrypto: cryptoToSellForOpportunities!, perc: (perc * 100).toFixed(1)}),
        displayAmount1: `${netAmountOfCur2AfterBuy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(cryptoToSellForOpportunities as any) ? 2 : 8 })} ${cryptoToSellForOpportunities}`, 
        displayMarketPrice: `${targetSellPriceOfCryptoToSell.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: targetSellPriceOfCryptoToSell < 1 ? 5 : 2 })} ${sellToBaseCurrency}/${cryptoToSellForOpportunities}`, 
        displayAmount2: `${grossAmountReceivedFromSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(sellToBaseCurrency as any) ? 2 : 8 })} ${sellToBaseCurrency}`, 
        displayCommission: `${commissionSellInQuote.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
        displayNetProfit: `${netProfitInQuote.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${DEFAULT_QUOTE_CURRENCY}`,
        netProfitValue: netProfitInQuote,

        rawAmountOfTargetCryptoSold: netAmountOfCur2AfterBuy,
        rawSellPriceTargetCryptoInQuote: targetSellPriceOfCryptoToSell, // This is price of cryptoToSell in sellToBaseCurrency
        rawQuoteReceivedFromSale: grossAmountReceivedFromSale, // This is in sellToBaseCurrency
        rawCommissionSellInQuote: commissionSellInQuote,
        
        rawAmountOfCrypto2Exchanged: amountOfCur2Received, 
        rawTotalInvestmentInQuote: totalInvestmentInQuoteForBuy, 
        rawCommissionBuyInQuote: commissionBuyInQuote, 
        rawPurchasePriceCryptoInQuote: userEnteredPurchasePriceOfCur2InCur1,
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, inputAmountStr, purchasePriceCryptoStr, cryptoPrices, t, currentCur1, currentCur2]);


  const handleSaveFullSimulation = async () => {
    if (simulatedRows.length === 0 || !simulatedRows[0].isBuyRow || !selectedPair || !currentCur1 || !currentCur2) {
      toast({ title: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', 'There is no valid simulation/order data to save.'), variant: "warning" });
      return;
    }
    setIsSavingSimulation(true);
    try {
      const buyRow = simulatedRows[0];
      const simulationData: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'> = {
        par_operacion: selectedPair,
        // These fields might need re-evaluation based on how buyRow raw values are structured now
        monto_compra_usdt: buyRow.rawTotalInvestmentInQuote || 0, 
        precio_compra: buyRow.rawPurchasePriceCryptoInQuote || 0, // Price of Cur2 in Cur1
        cantidad_cripto_comprada: buyRow.rawAmountOfCrypto2Exchanged || 0, // Amount of Cur2
        comision_compra: buyRow.rawCommissionBuyInQuote || 0,
        ventas_simuladas: simulatedRows.slice(1).map(sellRow => ({
          precio_venta_simulado: sellRow.rawSellPriceTargetCryptoInQuote || 0, // Price of what was sold, in terms of what was received
          ingreso_bruto: sellRow.rawQuoteReceivedFromSale || 0, // Amount received from sale
          comision_venta: sellRow.rawCommissionSellInQuote || 0,
          ganancia_neta: sellRow.netProfitValue || 0,
        })),
      };
      await saveSimulationToFirebase("general_user", simulationData); 
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

    setSavingOrderId(simulatedRows[sellRowIndex].operation); 
    try {
      const buyRow = simulatedRows[0]; 
      const sellRow = simulatedRows[sellRowIndex]; 

      const orderData: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'> = {
        targetCrypto: String(buyRow.cur2), // The crypto that was bought (Cur2)
        quoteCurrency: String(buyRow.cur1), // The crypto that was spent (Cur1) or DEFAULT_QUOTE_CURRENCY if Cur1 was USDT
        
        amountOfTargetCryptoBought: buyRow.rawAmountOfCrypto2Exchanged || 0, 
        buyPricePerUnit: buyRow.rawPurchasePriceCryptoInQuote || 0,  // Price of targetCrypto in terms of quoteCurrency
        totalBuyValueInQuote: buyRow.rawTotalInvestmentInQuote || 0, // Initial investment in USDT equivalent
        buyCommissionInQuote: buyRow.rawCommissionBuyInQuote || 0, 

        sellPricePerUnit: sellRow.rawSellPriceTargetCryptoInQuote || 0, // Price of targetCrypto (Cur2) in terms of sellRow.cur2 (usually USDT or initial Cur1)
        totalSellValueInQuote: sellRow.rawQuoteReceivedFromSale || 0, // Value from sale in sellRow.cur2, should be converted to USDT if not already
        sellCommissionInQuote: sellRow.rawCommissionSellInQuote || 0, 
        
        netProfitInQuote: sellRow.netProfitValue || 0, 
        
        originalPair: selectedPair,
        inputAmount: parseFloat(inputAmountStr) || 0, 
        inputCurrency: String(currentCur1), 
      };

      await saveOrderToFirebase("general_user", orderData); 
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


  const getHeaderLabel = (key: string, cur1: string | undefined, cur2: string | undefined, isSellSection: boolean) => {
    const c1Display = cur1 || '...';
    const c2Display = cur2 || '...';
    // For sell section, headers might need to reflect what's being sold (cur2 from buy) vs. what's received (e.g. USDT)
    // This logic might need refinement based on how sell rows cur1/cur2 are set
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
                        {t('dashboard.orderOpportunitySimulator.purchasePriceCryptoLabel', 'Price of {targetCrypto} in {baseCurrency}', { targetCrypto: currentCur2 || 'Crypto', baseCurrency: currentCur1 || 'Base' })}
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
                        {t('dashboard.orderOpportunitySimulator.valorCriptoLabel', 'Exchanged {crypto}', {crypto: currentCur2 || 'Crypto'})}
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
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur1Display', simulatedRows[0]?.cur1?.toString(), simulatedRows[0]?.cur2?.toString(), simulatedRows[0]?.isBuyRow === false)}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.marketPriceDisplay', 'Market Price')}</TableHead>
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur2Display', simulatedRows[0]?.cur1?.toString(), simulatedRows[0]?.cur2?.toString(), simulatedRows[0]?.isBuyRow === false)}</TableHead>
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
                            disabled={isSavingSimulation || savingOrderId === row.operation}
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
                disabled={isSavingSimulation}
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
