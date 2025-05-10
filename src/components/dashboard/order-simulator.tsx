'use client';

import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CRYPTO_SYMBOLS, COMMISSION_RATE } from '@/lib/constants';
import type { CryptoSymbol } from '@/lib/constants';
import type { SimulatedTrade } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const orderSimulatorSchema = z.object({
  cryptoSymbol: z.enum(CRYPTO_SYMBOLS, { required_error: 'Please select a cryptocurrency.' }),
  buyPrice: z.coerce.number().positive({ message: 'Buy price must be positive.' }),
  sellPrice: z.coerce.number().positive({ message: 'Sell price must be positive.' }),
});

type OrderSimulatorFormValues = z.infer<typeof orderSimulatorSchema>;

interface OrderResult {
  commission: number;
  netProfitLoss: number;
  profitPercentage: number;
}

export function OrderSimulator() {
  const [result, setResult] = useState<OrderResult | null>(null);
  const [savedSimulations, setSavedSimulations] = useState<SimulatedTrade[]>([]);
  const { toast } = useToast();

  const form = useForm<OrderSimulatorFormValues>({
    resolver: zodResolver(orderSimulatorSchema),
  });

  function onSubmit(values: OrderSimulatorFormValues) {
    const buyAmount = 1; // Assume trading 1 unit for simplicity
    const totalBuyValue = values.buyPrice * buyAmount;
    const totalSellValue = values.sellPrice * buyAmount;

    const buyCommission = totalBuyValue * COMMISSION_RATE;
    const sellCommission = totalSellValue * COMMISSION_RATE;
    const totalCommission = buyCommission + sellCommission;

    const netProfitLoss = (totalSellValue - totalBuyValue) - totalCommission;
    const profitPercentage = (netProfitLoss / totalBuyValue) * 100;

    setResult({
      commission: totalCommission,
      netProfitLoss,
      profitPercentage,
    });

    const newSimulation: SimulatedTrade = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      cryptoSymbol: values.cryptoSymbol,
      buyPrice: values.buyPrice,
      sellPrice: values.sellPrice,
      commission: totalCommission,
      netProfitLoss,
    };
    setSavedSimulations(prev => [newSimulation, ...prev.slice(0, 4)]); // Keep last 5
    
    toast({
      title: "Trade Simulated",
      description: `${values.cryptoSymbol} trade details calculated.`,
      variant: netProfitLoss >= 0 ? "default" : "destructive",
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Order Simulator</CardTitle>
          <CardDescription>Simulate a trade to see potential profit or loss.</CardDescription>
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
              <FormField
                control={form.control}
                name="buyPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 50000" {...field} step="any" />
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
                      <Input type="number" placeholder="e.g., 51000" {...field} step="any" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Simulate Trade</Button>
            </form>
          </Form>
          {result && (
            <div className="mt-6 space-y-2 p-4 border rounded-md bg-muted/50">
              <h3 className="font-semibold text-lg">Simulation Result:</h3>
              <p>Total Commission: <span className="font-medium">${result.commission.toFixed(2)}</span></p>
              <p>Net Profit/Loss:
                <span className={`font-medium ${result.netProfitLoss >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  ${result.netProfitLoss.toFixed(2)} ({result.profitPercentage.toFixed(2)}%)
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Simulations</CardTitle>
          <CardDescription>Your last 5 simulated trades.</CardDescription>
        </CardHeader>
        <CardContent>
          {savedSimulations.length === 0 ? (
            <p className="text-muted-foreground">No simulations saved yet.</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crypto</TableHead>
                    <TableHead>P/L ($)</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedSimulations.map((sim) => (
                    <TableRow key={sim.id}>
                      <TableCell>{sim.cryptoSymbol}</TableCell>
                      <TableCell className={sim.netProfitLoss >= 0 ? 'text-primary' : 'text-destructive'}>
                        {sim.netProfitLoss.toFixed(2)}
                      </TableCell>
                      <TableCell>{new Date(sim.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
