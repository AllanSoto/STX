
// src/components/dashboard/order-simulator.tsx
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
  FormDescription,
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
import { CRYPTO_SYMBOLS, COMMISSION_RATE, QUOTE_CURRENCY } from '@/lib/constants';
import type { CryptoSymbol } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

const getOrderSimulatorSchema = (t: (key: string, fallback?: string) => string) => z.object({
  cryptoSymbol: z.enum(CRYPTO_SYMBOLS, { errorMap: () => ({ message: t('zod.order.selectCrypto', 'Please select a cryptocurrency.')})}),
  quantity: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.order.positiveNumber', 'Must be a positive number.') }),
  buyPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.order.positiveNumber', 'Must be a positive number.') }),
  sellPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('zod.order.positiveNumber', 'Must be a positive number.') }),
});

type OrderSimulatorFormValues = z.infer<ReturnType<typeof getOrderSimulatorSchema>>;

interface OrderSimulatorProps {
  cryptoPrices: Record<CryptoSymbol, number>;
}

export function OrderSimulator({ cryptoPrices }: OrderSimulatorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{ profit: number, commission: number, netProfit: number, quantity: number, cryptoSymbol: CryptoSymbol } | null>(null);
  const { translations, language } = useLanguage();
  const t = (key: string, fallback?: string, vars?: Record<string, string | number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return msg;
  };

  const orderSimulatorSchema = useMemo(() => getOrderSimulatorSchema(t), [language, t]);

  const form = useForm<OrderSimulatorFormValues>({
    resolver: zodResolver(orderSimulatorSchema),
    defaultValues: {
      cryptoSymbol: undefined,
      quantity: '', // Initialize with empty string for controlled input
      buyPrice: '', 
      sellPrice: '',
    }
  });

  const selectedCryptoSymbol = form.watch('cryptoSymbol');

  useEffect(() => {
    if (selectedCryptoSymbol && cryptoPrices[selectedCryptoSymbol]) {
      form.setValue('buyPrice', cryptoPrices[selectedCryptoSymbol].toString(), { shouldValidate: true });
      const currentSellPrice = form.getValues('sellPrice');
      if (currentSellPrice && currentSellPrice !== '') {
          const buyPriceNum = parseFloat(cryptoPrices[selectedCryptoSymbol].toString());
          const sellPriceNum = parseFloat(currentSellPrice);
          if (buyPriceNum >= sellPriceNum) {
            form.setValue('sellPrice', '');
          }
      } else if (currentSellPrice === '' && form.formState.isSubmitted) {
        // If sell price was cleared and form submitted, we might want to keep it empty or re-validate
      }
    } else if (!selectedCryptoSymbol) {
        form.setValue('buyPrice', '');
        form.setValue('sellPrice', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCryptoSymbol, cryptoPrices, form.setValue, form.getValues, form.formState.isSubmitted]);

  function onSubmit(values: OrderSimulatorFormValues) {
    setIsLoading(true);
    setSimulationResult(null);

    const buyPrice = parseFloat(values.buyPrice);
    const sellPrice = parseFloat(values.sellPrice);
    const quantity = parseFloat(values.quantity);

    setTimeout(() => {
      if (buyPrice >= sellPrice) {
        toast({
          title: t('dashboard.orderSimulator.toast.errorTitle', "Simulation Error"),
          description: t('dashboard.orderSimulator.toast.errorSellPrice', "Sell price must be greater than buy price."),
          variant: "destructive",
        });
        setSimulationResult(null);
        setIsLoading(false);
        return;
      }

      const grossProfit = (sellPrice - buyPrice) * quantity;
      const totalCommission = (buyPrice * quantity * COMMISSION_RATE) + (sellPrice * quantity * COMMISSION_RATE);
      const netProfit = grossProfit - totalCommission;

      setSimulationResult({
        profit: grossProfit,
        commission: totalCommission,
        netProfit: netProfit,
        quantity,
        cryptoSymbol: values.cryptoSymbol,
      });

      toast({
        title: t('dashboard.orderSimulator.toast.completeTitle', "Simulation Complete"),
        description: t('dashboard.orderSimulator.toast.completeDescription', "Simulated trade for {quantity} {symbol} processed.", { quantity, symbol: values.cryptoSymbol }),
      });
      setIsLoading(false);
    }, 1000);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('dashboard.orderSimulator.title', 'Order Simulator')}</CardTitle>
        <CardDescription>{t('dashboard.orderSimulator.description', 'Simulate a buy and sell order to estimate potential profit or loss. Input quantity, buy price, and sell price. Current market prices are pre-filled for buy price.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="cryptoSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dashboard.orderSimulator.cryptoLabel', 'Cryptocurrency')}</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      const newSelectedSymbol = value as CryptoSymbol;
                      if (cryptoPrices[newSelectedSymbol]) {
                        form.setValue('buyPrice', cryptoPrices[newSelectedSymbol].toString(), { shouldValidate: true });
                        const currentSellPrice = form.getValues('sellPrice');
                        if (currentSellPrice && currentSellPrice !== '') {
                            const buyPriceNum = parseFloat(cryptoPrices[newSelectedSymbol].toString());
                            const sellPriceNum = parseFloat(currentSellPrice);
                            if (buyPriceNum >= sellPriceNum) {
                                form.setValue('sellPrice', '');
                            }
                        }
                      } else {
                        form.setValue('buyPrice', '');
                      }
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.orderSimulator.selectPlaceholder', 'Select a crypto')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CRYPTO_SYMBOLS.map((symbol) => (
                        <SelectItem key={symbol} value={symbol}>
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCryptoSymbol && (
                    <FormDescription className="mt-1">
                      {t('dashboard.orderSimulator.tradingPairDesc', "Trading Pair: {symbol}/{quoteCurrency}", { symbol: selectedCryptoSymbol, quoteCurrency: QUOTE_CURRENCY })}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedCryptoSymbol 
                      ? t('dashboard.orderSimulator.quantityLabel', 'Quantity ({symbol})', { symbol: selectedCryptoSymbol })
                      : t('dashboard.orderSimulator.quantityLabelNoSymbol', 'Quantity')
                    }
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 1.5" {...field} value={field.value || ''} step="any" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="buyPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dashboard.orderSimulator.buyPriceLabel', 'Buy Price ({quoteCurrency} per unit)', { quoteCurrency: QUOTE_CURRENCY })}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 50000" {...field} value={field.value || ''} step="any" disabled={!selectedCryptoSymbol} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dashboard.orderSimulator.sellPriceLabel', 'Sell Price ({quoteCurrency} per unit)', { quoteCurrency: QUOTE_CURRENCY })}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 51000" {...field} value={field.value || ''} step="any" disabled={!selectedCryptoSymbol} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormDescription>
              {t('dashboard.orderSimulator.commissionDesc', 'A commission of {rate}% will be applied to both buy and sell transactions.', { rate: (COMMISSION_RATE * 100).toFixed(1) })}
            </FormDescription>
            <Button type="submit" className="w-full" disabled={isLoading || !selectedCryptoSymbol}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('dashboard.orderSimulator.submitButton', 'Simulate Trade')}
            </Button>
          </form>
        </Form>

        {simulationResult && (
          <Card className="mt-6 bg-secondary/50">
            <CardHeader>
              <CardTitle className="text-lg">
                {t('dashboard.orderSimulator.result.title', 'Simulation Result for {quantity} {symbol}', { quantity: simulationResult.quantity, symbol: simulationResult.cryptoSymbol })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>{t('dashboard.orderSimulator.result.grossProfit', 'Gross Profit:')}</span>
                <span className="font-medium">${simulationResult.profit.toFixed(2)} {QUOTE_CURRENCY}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('dashboard.orderSimulator.result.totalCommission', 'Total Commission:')}</span>
                <span className="font-medium">${simulationResult.commission.toFixed(2)} {QUOTE_CURRENCY}</span>
              </div>
              <hr className="my-1 border-border" />
              <div className="flex justify-between">
                <span className="font-semibold">{t('dashboard.orderSimulator.result.netProfitLoss', 'Net Profit / Loss:')}</span>
                <span className={`font-bold ${simulationResult.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  ${simulationResult.netProfit.toFixed(2)} {QUOTE_CURRENCY}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

    