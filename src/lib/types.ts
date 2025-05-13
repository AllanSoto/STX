
import type { CryptoSymbol } from './constants';

export interface User {
  uid: string; // Firebase User ID
  email: string | null; // Firebase User email
  displayName?: string | null; // Optional display name
  // Add other relevant fields from Firebase User object if needed
}

export interface SimulatedTrade {
  id: string;
  date: string;
  cryptoSymbol: CryptoSymbol;
  buyPrice: number;
  sellPrice: number;
  quantity: number; 
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

export interface SimulatedSaleEntry {
  precio_venta_simulado: number;
  ingreso_bruto: number;
  comision_venta: number;
  ganancia_neta: number;
}

export interface SimulationLogEntry {
  id: string; 
  userId: string; // Changed from usuario_id to consistently use userId
  fecha: any; 
  par_operacion: string; 
  monto_compra_usdt: number;
  precio_compra: number;
  cantidad_cripto_comprada: number;
  comision_compra: number;
  ventas_simuladas: SimulatedSaleEntry[];
}

export interface SavedOrder {
  id: string; 
  userId: string;
  timestamp: Date; 

  targetCrypto: string;
  quoteCurrency: string;

  amountOfTargetCryptoBought: number;
  buyPricePerUnit: number;
  totalBuyValueInQuote: number;
  buyCommissionInQuote: number;

  sellPricePerUnit: number;
  totalSellValueInQuote: number;
  sellCommissionInQuote: number;

  netProfitInQuote: number;
  originalPair: string;
  inputAmount: number;
  inputCurrency: string;
}

export type AlertDirection = 'above' | 'below';

export interface PriceAlert {
  id: string; 
  userId: string;
  symbol: CryptoSymbol;
  targetPrice: number;
  direction: AlertDirection; 
  active: boolean;
  createdAt: any; 
  updatedAt: any; 
  triggeredAt?: any; 
}

