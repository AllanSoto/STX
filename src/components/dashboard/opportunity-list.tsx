'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { CryptoPriceData, Opportunity } from '@/lib/types';
import { CRYPTO_SYMBOLS } from '@/lib/constants';
import type { CryptoSymbol } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

// Mock API call to fetch prices
async function fetchCryptoPrices(): Promise<CryptoPriceData[]> {
  // In a real app, this would be an API call to Binance or another exchange
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  return CRYPTO_SYMBOLS.map(symbol => {
    let price;
    switch (symbol) {
      case 'BTC': price = 60000 + Math.random() * 1000 - 500; break;
      case 'ETH': price = 3000 + Math.random() * 100 - 50; break;
      case 'SOL': price = 150 + Math.random() * 10 - 5; break;
      case 'BNB': price = 580 + Math.random() * 20 - 10; break;
      case 'XRP': price = 0.5 + Math.random() * 0.1 - 0.05; break;
      default: price = 0;
    }
    return { symbol, price: parseFloat(price.toFixed(2)) };
  });
}

const PROFIT_PERCENTAGES = [1, 2, 5]; // e.g., 1%, 2%, 5%

export function OpportunityList() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOpportunities() {
      setIsLoading(true);
      const prices = await fetchCryptoPrices();
      const newOpportunities: Opportunity[] = [];

      prices.forEach(crypto => {
        PROFIT_PERCENTAGES.forEach(perc => {
          const targetSellPrice = crypto.price * (1 + perc / 100);
          newOpportunities.push({
            cryptoSymbol: crypto.symbol,
            currentPrice: crypto.price,
            targetSellPrice,
            profitPercentage: perc,
            potentialProfit: targetSellPrice - crypto.price,
          });
        });
      });
      
      // Sort by potential profit DESC
      newOpportunities.sort((a,b) => (b.potentialProfit / b.currentPrice) - (a.potentialProfit / a.currentPrice));
      setOpportunities(newOpportunities);
      setIsLoading(false);
    }
    loadOpportunities();
  }, []);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Opportunity Simulator</CardTitle>
        <CardDescription>Potential trade opportunities based on current (mocked) prices and target profit percentages.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : opportunities.length === 0 ? (
          <p className="text-muted-foreground">No opportunities to display currently.</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Target Sell (+Profit)</TableHead>
                  <TableHead>Potential Gain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((op, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{op.cryptoSymbol}</TableCell>
                    <TableCell>${op.currentPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      ${op.targetSellPrice.toFixed(2)}{' '}
                      <Badge variant="outline" className="ml-1 text-primary border-primary">+{op.profitPercentage}%</Badge>
                    </TableCell>
                    <TableCell className="text-primary">${op.potentialProfit.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
