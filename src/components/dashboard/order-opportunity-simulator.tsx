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
    if (!val) return true; // Allow empty initially if price is auto-filled or not yet available
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
  rawPurchasePriceCrypto?: number; 
  rawAmountOfTargetCryptoBought?: number; 
  rawCommissionBuyInQuote?: number; 
  initialInvestmentInQuote?: number;

  rawAmountOfTargetCryptoSold?: number; 
  rawSellPriceTargetCryptoInQuote?: number; 
  rawQuoteReceivedFromSale?: number; 
  rawCommissionSellInQuote?: number; 
}


export function OrderOpportunitySimulator({ cryptoPrices }: OrderOpportunitySimulatorProps) {
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  // const { user } = useAuth(); // Auth removed
  const [isSavingSimulation, setIsSavingSimulation] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [purchasePriceManuallyEdited, setPurchasePriceManuallyEdited] = useState(false);
  const [displayedCryptoValue, setDisplayedCryptoValue] = useState<string>('');


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
      purchasePriceCrypto: '', 
    },
  });

  const [simulatedRows, setSimulatedRows] = useState<SimulatedRow[]>([]);
  const [currentCur1, setCurrentCur1] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY>(DEFAULT_QUOTE_CURRENCY); 
  const [currentCur2, setCurrentCur2] = useState<CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY | ''>(''); 
  const [currentTargetCrypto, setCurrentTargetCrypto] = useState<CryptoSymbol | null>(null); 


  const selectedPair = form.watch('pair') as typeof DETAILED_TRADING_PAIRS[number] | '';
  const inputAmountStr = form.watch('inputAmount'); 
  const purchasePriceCryptoStr = form.watch('purchasePriceCrypto'); 


  useEffect(() => {
    setPurchasePriceManuallyEdited(false); 
  }, [selectedPair]);

  useEffect(() => {
    if (selectedPair) {
      const [c1, c2] = selectedPair.split('/') as [CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY, CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY];
      setCurrentCur1(c1);
      setCurrentCur2(c2);

      let target: CryptoSymbol | null = null;
      if (!STABLECOIN_SYMBOLS.includes(c1 as any) && CRYPTO_SYMBOLS.includes(c1 as CryptoSymbol)) {
        target = c1 as CryptoSymbol;
      } else if (!STABLECOIN_SYMBOLS.includes(c2 as any) && CRYPTO_SYMBOLS.includes(c2 as CryptoSymbol)) {
        target = c2 as CryptoSymbol;
      }
      setCurrentTargetCrypto(target);
      
      const currentPurchasePriceFieldValue = form.getValues('purchasePriceCrypto');
      const isFieldEffectivelyEmpty = currentPurchasePriceFieldValue === '' || currentPurchasePriceFieldValue === t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A');

      if (target && cryptoPrices[target] > 0) {
        if (!purchasePriceManuallyEdited || isFieldEffectivelyEmpty) {
          form.setValue('purchasePriceCrypto', cryptoPrices[target].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: cryptoPrices[target] < 0.01 ? 8 : 5 }));
        }
      } else {
         if (!purchasePriceManuallyEdited || isFieldEffectivelyEmpty) {
          form.setValue('purchasePriceCrypto', t('dashboard.orderOpportunitySimulator.priceUnavailable', 'Price N/A'));
        }
      }
    } else {
      setCurrentCur1(DEFAULT_QUOTE_CURRENCY);
      setCurrentCur2('');
      setCurrentTargetCrypto(null);
      form.setValue('purchasePriceCrypto', '');
      setDisplayedCryptoValue('');
    }
  }, [selectedPair, cryptoPrices, form, t, purchasePriceManuallyEdited]);


  useEffect(() => {
    const inputAmountNum = parseFloat(inputAmountStr); // Amount of currentCur1
    const purchasePriceCryptoNum = parseFloat(purchasePriceCryptoStr.replace(/,/g, '')); // Price of currentTargetCrypto in DEFAULT_QUOTE_CURRENCY

    if (selectedPair && !isNaN(inputAmountNum) && inputAmountNum > 0) {
        if (isNaN(purchasePriceCryptoNum) || purchasePriceCryptoNum <= 0) {
            setDisplayedCryptoValue(t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'));
            return;
        }
        
        // User request: "Valor cripto y es igual a : Price of Crypto/Cantidad"
        // "Price of Crypto" -> purchasePriceCryptoNum (Price of TargetCrypto in USDT)
        // "Cantidad" -> inputAmountNum (Amount of currentCur1)
        const calculatedValue = purchasePriceCryptoNum / inputAmountNum;

        if (isNaN(calculatedValue) || !isFinite(calculatedValue)) {
             setDisplayedCryptoValue(t('dashboard.orderOpportunitySimulator.calculationError', 'Calculation Error'));
        } else {
            let unitDisplayString = "";
            if (currentTargetCrypto && currentCur1) {
                if (currentCur1 === DEFAULT_QUOTE_CURRENCY) {
                    // Formula: (Price of TargetCrypto in USDT) / (Amount of USDT) -> Unit: (USDT/TargetCrypto) / USDT = 1/TargetCrypto
                    unitDisplayString = `1/${currentTargetCrypto}`;
                } else if (currentCur1 === currentTargetCrypto) {
                    // Formula: (Price of TargetCrypto in USDT) / (Amount of TargetCrypto) -> Unit: (USDT/TargetCrypto) / TargetCrypto = USDT/TargetCrypto²
                    unitDisplayString = `${DEFAULT_QUOTE_CURRENCY}/${currentTargetCrypto}²`;
                } else {
                    // Generic case if currentCur1 is crypto but not currentTargetCrypto (e.g. ETH/BTC, input ETH, price for BTC)
                    // This is less common for this specific field's interpretation.
                    // Unit: (USDT/TargetCrypto) / currentCur1
                    unitDisplayString = `(${DEFAULT_QUOTE_CURRENCY}/${currentTargetCrypto}) / ${currentCur1}`;
                }
            }
            setDisplayedCryptoValue(
              `${calculatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${unitDisplayString}`.trim()
            );
        }
    } else {
        setDisplayedCryptoValue(''); 
    }
}, [selectedPair, inputAmountStr, purchasePriceCryptoStr, currentTargetCrypto, currentCur1, t, DEFAULT_QUOTE_CURRENCY]);


  useEffect(() => {
    if (!selectedPair || !inputAmountStr || !purchasePriceCryptoStr || !currentTargetCrypto) {
      setSimulatedRows([]);
      return;
    }

    const investmentAmountNum = parseFloat(inputAmountStr); 
    const userEnteredPurchasePriceTargetCrypto = parseFloat(purchasePriceCryptoStr.replace(/,/g, '')); 

    if (isNaN(investmentAmountNum) || investmentAmountNum <= 0 || isNaN(userEnteredPurchasePriceTargetCrypto) || userEnteredPurchasePriceTargetCrypto <= 0) {
      const rowsToShow: SimulatedRow[] = [];
       if (isNaN(userEnteredPurchasePriceTargetCrypto) || userEnteredPurchasePriceTargetCrypto <= 0) {
         rowsToShow.push({
            isBuyRow: true, cur1: currentCur1, cur2: currentCur2 || '',
            operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1: String(currentCur1), cur2: String(currentCur2)}),
            displayAmount1: `${investmentAmountNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currentCur1}`,
            displayMarketPrice: t('dashboard.orderOpportunitySimulator.invalidPurchasePrice', 'Invalid Purchase Price'),
            displayAmount2: '', displayCommission: '', displayNetProfit: '-',
        });
      }
      setSimulatedRows(rowsToShow);
      return;
    }
    
    const [c1, c2] = selectedPair.split('/') as [CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY, CryptoSymbol | typeof DEFAULT_QUOTE_CURRENCY];
    const newRows: SimulatedRow[] = [];

    let amountOfTargetCryptoBought: number;
    let initialInvestmentInUSDTForBuyLeg: number; 
    let rawMarketPriceC1InC2: number = 0; 

    if (c1 === DEFAULT_QUOTE_CURRENCY) { 
        initialInvestmentInUSDTForBuyLeg = investmentAmountNum;
        amountOfTargetCryptoBought = investmentAmountNum / userEnteredPurchasePriceTargetCrypto; 
        rawMarketPriceC1InC2 = 1 / userEnteredPurchasePriceTargetCrypto; 
    } else if (c1 === currentTargetCrypto) { 
        initialInvestmentInUSDTForBuyLeg = investmentAmountNum * userEnteredPurchasePriceTargetCrypto; 
        amountOfTargetCryptoBought = investmentAmountNum;
        rawMarketPriceC1InC2 = userEnteredPurchasePriceTargetCrypto; 
    } else {
        amountOfTargetCryptoBought = 0;
        initialInvestmentInUSDTForBuyLeg = 0;
        console.error("Could not determine target crypto or investment for buy leg. c1:", c1, "c2:", c2, "target:", currentTargetCrypto);
        setSimulatedRows([]); return;
    }

    if (rawMarketPriceC1InC2 <= 0 && !(isNaN(userEnteredPurchasePriceTargetCrypto) || userEnteredPurchasePriceTargetCrypto <= 0) ) {
        setSimulatedRows([{
            isBuyRow: true, cur1: c1, cur2: c2,
            operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1: c1, cur2: c2}),
            displayAmount1: `${investmentAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c1 as any) ? 2 : 8 })} ${c1}`,
            displayMarketPrice: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'),
            displayAmount2: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'), displayCommission: t('dashboard.orderOpportunitySimulator.priceUnavailableShort', 'N/A'), displayNetProfit: '-',
        }]);
        return;
    }

    const exchangedAmountC2 = investmentAmountNum * rawMarketPriceC1InC2; 
    const commissionBuyInUSDT = initialInvestmentInUSDTForBuyLeg * COMMISSION_RATE;

    newRows.push({
      isBuyRow: true, cur1: c1, cur2: c2,
      operation: t('dashboard.orderOpportunitySimulator.exchangeOperation', 'Exchange {cur1} for {cur2}', {cur1: c1, cur2: c2}),
      displayAmount1: `${investmentAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c1 as any) ? 2 : 8 })} ${c1}`,
      displayMarketPrice: `${rawMarketPriceC1InC2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: rawMarketPriceC1InC2 < 0.001 ? 8 : 5 })} ${c2}/${c1}`, 
      displayAmount2: `${exchangedAmountC2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: STABLECOIN_SYMBOLS.includes(c2 as any) ? 2 : 8 })} ${c2}`,
      displayCommission: `${commissionBuyInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
      displayNetProfit: '-',
      rawInputAmountCur1: investmentAmountNum,
      rawPurchasePriceCrypto: userEnteredPurchasePriceTargetCrypto,
      rawAmountOfTargetCryptoBought: amountOfTargetCryptoBought,
      rawCommissionBuyInQuote: commissionBuyInUSDT,
      initialInvestmentInQuote: initialInvestmentInUSDTForBuyLeg,
    });

    const basePriceForSellRowsInUSDT = userEnteredPurchasePriceTargetCrypto; 

    OPPORTUNITY_PERCENTAGES.forEach(perc => {
      const targetSellPriceOfTargetCryptoInUSDT = basePriceForSellRowsInUSDT * (1 + perc);
      const usdtReceivedFromSale = amountOfTargetCryptoBought * targetSellPriceOfTargetCryptoInUSDT;
      const commissionSellInUSDT = usdtReceivedFromSale * COMMISSION_RATE;
      const netProfitInUSDT = (usdtReceivedFromSale - initialInvestmentInUSDTForBuyLeg) - (commissionBuyInUSDT + commissionSellInUSDT);

      newRows.push({
        isBuyRow: false,
        operation: t('dashboard.orderOpportunitySimulator.sellOperationPerc', 'Sell {targetCrypto} (+{perc}%)', {targetCrypto: currentTargetCrypto!, perc: (perc * 100).toFixed(1)}),
        displayAmount1: `${amountOfTargetCryptoBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currentTargetCrypto}`, 
        displayMarketPrice: `${targetSellPriceOfTargetCryptoInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: targetSellPriceOfTargetCryptoInUSDT < 1 ? 5 : 2 })} ${DEFAULT_QUOTE_CURRENCY}/${currentTargetCrypto}`, 
        displayAmount2: `${usdtReceivedFromSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${DEFAULT_QUOTE_CURRENCY}`, 
        displayCommission: `${commissionSellInUSDT.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${DEFAULT_QUOTE_CURRENCY}`,
        displayNetProfit: `${netProfitInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${DEFAULT_QUOTE_CURRENCY}`,
        netProfitValue: netProfitInUSDT,
        rawAmountOfTargetCryptoSold: amountOfTargetCryptoBought,
        rawSellPriceTargetCryptoInQuote: targetSellPriceOfTargetCryptoInUSDT,
        rawQuoteReceivedFromSale: usdtReceivedFromSale,
        rawCommissionSellInQuote: commissionSellInUSDT,
        rawAmountOfTargetCryptoBought: amountOfTargetCryptoBought, 
        initialInvestmentInQuote: initialInvestmentInUSDTForBuyLeg, 
        rawCommissionBuyInQuote: commissionBuyInUSDT, 
      });
    });

    setSimulatedRows(newRows);

  }, [selectedPair, inputAmountStr, purchasePriceCryptoStr, cryptoPrices, t, currentTargetCrypto, currentCur1, currentCur2]);


  const handleSaveFullSimulation = async () => {
    // if (!user) { // Auth removed
    //   toast({
    //     title: t('dashboard.orderOpportunitySimulator.toast.notLoggedInError', 'You must be logged in to save simulations/orders.'),
    //     variant: "destructive",
    //   });
    //   return;
    // }
    if (simulatedRows.length === 0 || !simulatedRows[0].isBuyRow || !selectedPair || !currentTargetCrypto) {
      toast({ title: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', 'There is no valid simulation/order data to save.'), variant: "warning" });
      return;
    }
    setIsSavingSimulation(true);
    try {
      const buyRow = simulatedRows[0];
      const simulationData: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'> = {
        par_operacion: selectedPair,
        monto_compra_usdt: buyRow.initialInvestmentInQuote || 0, 
        precio_compra: buyRow.rawPurchasePriceCrypto || 0, 
        cantidad_cripto_comprada: buyRow.rawAmountOfTargetCryptoBought || 0,
        comision_compra: buyRow.rawCommissionBuyInQuote || 0,
        ventas_simuladas: simulatedRows.slice(1).map(sellRow => ({
          precio_venta_simulado: sellRow.rawSellPriceTargetCryptoInQuote || 0,
          ingreso_bruto: sellRow.rawQuoteReceivedFromSale || 0,
          comision_venta: sellRow.rawCommissionSellInQuote || 0,
          ganancia_neta: sellRow.netProfitValue || 0,
        })),
      };
      // For non-authenticated version, we can't use user.id
      await saveSimulationToFirebase("general_user", simulationData); // Using a placeholder user ID
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
    // if (!user) { // Auth removed
    //   toast({
    //     title: t('dashboard.orderOpportunitySimulator.toast.notLoggedInError', 'You must be logged in to save simulations/orders.'),
    //     variant: "destructive",
    //   });
    //   return;
    // }
     if (simulatedRows.length === 0 || !simulatedRows[0].isBuyRow || !selectedPair || !currentTargetCrypto || sellRowIndex >= simulatedRows.length || simulatedRows[sellRowIndex].isBuyRow) {
      toast({ title: t('dashboard.orderOpportunitySimulator.toast.noDataToSave', 'There is no valid order data to save.'), variant: "warning" });
      return;
    }

    setSavingOrderId(simulatedRows[sellRowIndex].operation); 
    try {
      const buyRow = simulatedRows[0];
      const sellRow = simulatedRows[sellRowIndex];

      const orderData: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'> = {
        targetCrypto: currentTargetCrypto,
        quoteCurrency: DEFAULT_QUOTE_CURRENCY, 
        amountOfTargetCryptoBought: buyRow.rawAmountOfTargetCryptoBought || 0,
        buyPricePerUnit: buyRow.rawPurchasePriceCrypto || 0, 
        totalBuyValueInQuote: buyRow.initialInvestmentInQuote || 0,
        buyCommissionInQuote: buyRow.rawCommissionBuyInQuote || 0,
        sellPricePerUnit: sellRow.rawSellPriceTargetCryptoInQuote || 0,
        totalSellValueInQuote: sellRow.rawQuoteReceivedFromSale || 0,
        sellCommissionInQuote: sellRow.rawCommissionSellInQuote || 0,
        netProfitInQuote: sellRow.netProfitValue || 0,
        originalPair: selectedPair,
        inputAmount: parseFloat(inputAmountStr) || 0, 
        inputCurrency: String(currentCur1), 
      };

      await saveOrderToFirebase("general_user", orderData); // Using a placeholder user ID
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


  const getHeaderLabel = (key: string, cur1: string | undefined, cur2: string | undefined, targetCrypto: string | null, isSellSection: boolean) => {
    const c1Display = cur1 || '...';
    const c2Display = cur2 || '...';
    if (isSellSection && targetCrypto) {
      return t(key, key, { currency1: targetCrypto, currency2: DEFAULT_QUOTE_CURRENCY});
    }
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
                name="purchasePriceCrypto"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>
                        {t('dashboard.orderOpportunitySimulator.purchasePriceCryptoLabel', 'Price of {targetCrypto} ({quote})', { targetCrypto: currentTargetCrypto || 'Crypto', quote: DEFAULT_QUOTE_CURRENCY })}
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
                 <div className="md:col-start-2"> 
                    <FormLabel>
                        {t('dashboard.orderOpportunitySimulator.valorCriptoLabel', 'Valor Cripto')}
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
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur1Display', simulatedRows[0]?.cur1?.toString(), simulatedRows[0]?.cur2?.toString(), currentTargetCrypto, simulatedRows[0]?.isBuyRow === false)}</TableHead>
                    <TableHead>{t('dashboard.orderOpportunitySimulator.table.header.marketPriceDisplay', 'Market Price')}</TableHead>
                    <TableHead>{getHeaderLabel('dashboard.orderOpportunitySimulator.table.header.amountCur2Display', simulatedRows[0]?.cur1?.toString(), simulatedRows[0]?.cur2?.toString(), currentTargetCrypto, simulatedRows[0]?.isBuyRow === false)}</TableHead>
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

