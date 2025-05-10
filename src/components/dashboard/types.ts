import type { CryptoSymbol } from '@/lib/constants';
import { CRYPTO_SYMBOLS } from '@/lib/constants';
import type { TrendAnalysis } from '@/lib/types';

export interface CryptoCardData {
  symbol: CryptoSymbol;
  value: number;
  trendAnalysis: TrendAnalysis | null;
}

export const initialCryptoData: CryptoCardData[] = CRYPTO_SYMBOLS.map(symbol => ({
  symbol,
  value: 0,
  trendAnalysis: null,
}));

