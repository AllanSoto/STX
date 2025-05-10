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
import { CRYPTO_SYMBOLS, COMMISSION_RATE } from '@/lib/constants';
import type { CryptoSymbol } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const orderSimulatorSchema = z.object({
  cryptoSymbol: z.enum(CRYPTO_SYMBOLS, { errorMap: () => ({ message: 'Please select a cryptocurrency.'})}),
  buyPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: 'Must be a positive number.' }),
  sellPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: 'Must be a positive number.' }),
});

type OrderSimulatorFormValues = z.infer<typeof orderSimulatorSchema>;

export function OrderSimulator() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{ profit: number, commission: number, netProfit: number } | null>(null);

  const form = useForm<OrderSimulatorFormValues>({
    resolver: zodResolver(orderSimulatorSchema),
    defaultValues: {
      cryptoSymbol: undefined, // Let Select handle placeholder for undefined
      buyPrice: '', // Ensure input is controlled
      sellPrice: '', // Ensure input is controlled
    }
  });

  function onSubmit(values: OrderSimulatorFormValues) {
    setIsLoading(true);
    setSimulationResult(null);

    const buyPrice = parseFloat(values.buyPrice);
    const sellPrice = parseFloat(values.sellPrice);

    // Simulate some processing time
    setTimeout(() => {
      if (buyPrice >= sellPrice) {
        toast({
          title: "Simulation Error",
          description: "Sell price must be greater than buy price.",
          variant: "destructive",
        });
        setSimulationResult(null);
        setIsLoading(false);
        return;
      }

      const quantity = 1; // Assume trading 1 unit for simplicity
      const grossProfit = (sellPrice - buyPrice) * quantity;
      const totalCommission = (buyPrice * quantity * COMMISSION_RATE) + (sellPrice * quantity * COMMISSION_RATE);
      const netProfit = grossProfit - totalCommission;

      setSimulationResult({
        profit: grossProfit,
        commission: totalCommission,
        netProfit: netProfit,
      });

      toast({
        title: "Simulation Complete",
        description: `Simulated trade for ${values.cryptoSymbol} processed.`,
      });
      setIsLoading(false);
    }, 1000);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Order Simulator</CardTitle>
        <CardDescription>Simulate a buy and sell order to estimate potential profit or loss, including commission.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="cryptoSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cryptocurrency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a crypto" />
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
                    <FormLabel>Buy Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 50000" {...field} onChange={e => field.onChange(e.target.value)} />
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
                    <FormLabel>Sell Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 51000" {...field} onChange={e => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormDescription>
              A commission of {COMMISSION_RATE * 100}% will be applied to both buy and sell transactions.
            </FormDescription>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simulate Trade
            </Button>
          </form>
        </Form>

        {simulationResult && (
          <Card className="mt-6 bg-secondary/50">
            <CardHeader>
              <CardTitle className="text-lg">Simulation Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Gross Profit:</span>
                <span className="font-medium">${simulationResult.profit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Commission:</span>
                <span className="font-medium">${simulationResult.commission.toFixed(2)}</span>
              </div>
              <hr className="my-1 border-border" />
              <div className="flex justify-between">
                <span className="font-semibold">Net Profit / Loss:</span>
                <span className={`font-bold ${simulationResult.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  ${simulationResult.netProfit.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
