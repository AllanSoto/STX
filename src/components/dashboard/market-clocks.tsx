'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Market {
  nameKey: string;
  location: string;
  openUtcHour: number;
  openUtcMinute: number;
  closeUtcHour: number;
  closeUtcMinute: number;
}

// Storing hours in UTC to avoid timezone issues. DST is not handled for simplicity.
const markets: Market[] = [
  { nameKey: 'market.newYork', location: 'New York', openUtcHour: 13, openUtcMinute: 30, closeUtcHour: 20, closeUtcMinute: 0 },
  { nameKey: 'market.london', location: 'London', openUtcHour: 8, openUtcMinute: 0, closeUtcHour: 16, closeUtcMinute: 30 },
  { nameKey: 'market.tokyo', location: 'Tokyo', openUtcHour: 0, openUtcMinute: 0, closeUtcHour: 6, closeUtcMinute: 0 },
  { nameKey: 'market.hongKong', location: 'Hong Kong', openUtcHour: 1, openUtcMinute: 30, closeUtcHour: 8, closeUtcMinute: 0 },
  { nameKey: 'market.frankfurt', location: 'Frankfurt', openUtcHour: 7, openUtcMinute: 0, closeUtcHour: 15, closeUtcMinute: 30 },
  { nameKey: 'market.sydney', location: 'Sydney', openUtcHour: 23, openUtcMinute: 0, closeUtcHour: 5, closeUtcMinute: 0 }, // Spans across UTC midnight
];

const pad = (num: number) => num.toString().padStart(2, '0');

function getTimeUntil(targetHour: number, targetMinute: number, now: Date) {
  const targetTime = new Date(now);
  targetTime.setUTCHours(targetHour, targetMinute, 0, 0);

  if (targetTime.getTime() < now.getTime()) {
    targetTime.setUTCDate(targetTime.getUTCDate() + 1);
  }

  const diff = targetTime.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function MarketClock({ market, t }: { market: Market, t: (key: string, fallback: string) => string }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nowUtcHour = currentTime.getUTCHours();
  const nowUtcMinute = currentTime.getUTCMinutes();
  
  let isOpen = false;

  const openTime = market.openUtcHour + market.openUtcMinute / 60;
  const closeTime = market.closeUtcHour + market.closeUtcMinute / 60;
  const nowTime = nowUtcHour + nowUtcMinute / 60;
  
  if (openTime < closeTime) { // Market doesn't span midnight
    isOpen = nowTime >= openTime && nowTime < closeTime;
  } else { // Market spans midnight (e.g., Sydney)
    isOpen = nowTime >= openTime || nowTime < closeTime;
  }

  const statusText = isOpen ? t('market.status.open', 'Open') : t('market.status.closed', 'Closed');
  const nextEventText = isOpen ? t('market.status.closesIn', 'Closes in') : t('market.status.opensIn', 'Opens in');
  
  const targetHour = isOpen ? market.closeUtcHour : market.openUtcHour;
  const targetMinute = isOpen ? market.closeUtcMinute : market.openUtcMinute;

  const timeUntil = getTimeUntil(targetHour, targetMinute, currentTime);

  const openTimeDisplay = `${pad(market.openUtcHour)}:${pad(market.openUtcMinute)} UTC`;
  const closeTimeDisplay = `${pad(market.closeUtcHour)}:${pad(market.closeUtcMinute)} UTC`;

  return (
    <div className="flex flex-col p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="flex justify-between items-start">
            <div className='flex items-center gap-2'>
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">{t(market.nameKey, market.location)}</h3>
            </div>
            <Badge variant={isOpen ? 'default' : 'secondary'} className={cn(isOpen && 'bg-green-500 hover:bg-green-600')}>
                {statusText}
            </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Clock className="h-4 w-4" />
            <span>{openTimeDisplay} - {closeTimeDisplay}</span>
        </div>
        <div className="mt-4 text-center flex-grow flex flex-col justify-center">
            <p className="text-sm text-muted-foreground">{nextEventText}</p>
            <p className="text-2xl font-mono font-semibold tracking-wider">
                {timeUntil}
            </p>
        </div>
    </div>
  );
}


export function MarketClocks() {
  const { t, hydrated } = useLanguage();

  if (!hydrated) {
    return (
        <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4"><Skeleton className="h-8 w-72" /></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full" />
                ))}
            </div>
        </section>
    );
  }

  return (
    <section className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">{t('market.title', 'Market Opening Hours')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map(market => (
                <MarketClock key={market.nameKey} market={market} t={t} />
            ))}
        </div>
    </section>
  );
}
