import type { CryptoSymbol } from '@/lib/constants';
import { CRYPTO_SYMBOLS } from '@/lib/constants';

export interface CryptoCardData {
  symbol: CryptoSymbol;
  value: number;
  previousValue?: number; // Added for price change indication
}

export const initialCryptoData: CryptoCardData[] = CRYPTO_SYMBOLS.map(symbol => ({
  symbol,
  value: 0, // Initial value, will be updated by WebSocket
  previousValue: 0, // Initialize previousValue, will be set to first price on first update
}));
