
import type { CryptoSymbol } from './constants';

export interface User {
  id: string;
  email: string;
  password?: string; // For mock password storage
  // Removed binanceApiKey and binanceApiSecret
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
  usuario_id: string;
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

export interface PortfolioSnapshot {
  id: string; 
  date: Date; 
  valueUSDT: number;
  timestamp: any; 
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
