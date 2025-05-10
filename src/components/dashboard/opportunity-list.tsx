// src/components/dashboard/opportunity-list.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Opportunity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import type { CryptoCardData } from './types';

const PROFIT_PERCENTAGES = [1, 2, 5]; // e.g., 1%, 2%, 5%

interface OpportunityListProps {
  cryptoData: CryptoCardData[];
}

export function OpportunityList({ cryptoData }: OpportunityListProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function calculateOpportunities() {
      if (!cryptoData || cryptoData.length === 0 || cryptoData.every(c => c.value === 0) ) {
        setIsLoading(true);
        setOpportunities([]);
        return;
      }
      setIsLoading(false);
      const newOpportunities: Opportunity[] = [];

      cryptoData.forEach(crypto => {
        if (crypto.value > 0) { // Only consider cryptos with a valid price
          PROFIT_PERCENTAGES.forEach(perc => {
            const targetSellPrice = crypto.value * (1 + perc / 100);
            newOpportunities.push({
              cryptoSymbol: crypto.symbol,
              currentPrice: crypto.value,
              targetSellPrice,
              profitPercentage: perc,
              potentialProfit: targetSellPrice - crypto.value,
            });
          });
        }
      });
      
      // Sort by potential profit DESC (as percentage of current price)
      newOpportunities.sort((a,b) => (b.potentialProfit / b.currentPrice) - (a.potentialProfit / a.currentPrice));
      setOpportunities(newOpportunities);
    }
    calculateOpportunities();
  }, [cryptoData]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Opportunity Simulator</CardTitle>
        <CardDescription>Potential trade opportunities based on current prices and target profit percentages.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : opportunities.length === 0 ? (
          <p className="text-muted-foreground">No opportunities to display currently, or prices are still loading.</p>
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
                    <TableCell>${op.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      ${op.targetSellPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <Badge variant="outline" className="ml-1 text-primary border-primary">+{op.profitPercentage}%</Badge>
                    </TableCell>
                    <TableCell className="text-primary">${op.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
