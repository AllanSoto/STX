import type { CryptoSymbol } from './constants';

export interface User {
  id: string;
  email: string;
  password?: string; // Added for mock password storage
  binanceApiKey?: string;
  binanceApiSecret?: string; // Should be handled with extreme care
}

export interface SimulatedTrade {
  id: string;
  date: string;
  cryptoSymbol: CryptoSymbol;
  buyPrice: number;
  sellPrice: number;
  quantity: number; // Added quantity to simulated trade
  commission: number;
  netProfitLoss: number;
}

export interface CryptoPriceData {
  symbol: CryptoSymbol;
  price: number;
}

export interface TrendAnalysis {
  trend: 'upward' | 'downward' | 'sideways';
  confidence: number;
  reason: string;
}

export interface Opportunity {
  cryptoSymbol: CryptoSymbol;
  currentPrice: number;
  targetSellPrice: number;
  profitPercentage: number;
  potentialProfit: number;
}

