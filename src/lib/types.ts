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

export interface SimulatedSaleEntry {
  precio_venta_simulado: number;
  ingreso_bruto: number;
  comision_venta: number;
  ganancia_neta: number;
}

export interface SimulationLogEntry {
  id: string; // Document ID from Firestore
  usuario_id: string;
  fecha: any; // Firestore Timestamp, will be typed more accurately if using Firebase SDK types directly
  par_operacion: string; // e.g., USDT/BTC
  monto_compra_usdt: number;
  precio_compra: number;
  cantidad_cripto_comprada: number;
  comision_compra: number;
  ventas_simuladas: SimulatedSaleEntry[];
}

export interface SavedOrder {
  id: string; // Document ID from Firestore
  userId: string;
  timestamp: Date; // Changed from any to Date

  targetCrypto: string;
  quoteCurrency: string;

  // Buy leg
  amountOfTargetCryptoBought: number;
  buyPricePerUnit: number;
  totalBuyValueInQuote: number;
  buyCommissionInQuote: number;

  // Sell leg
  sellPricePerUnit: number;
  totalSellValueInQuote: number;
  sellCommissionInQuote: number;

  netProfitInQuote: number;
  originalPair: string;
  inputAmount: number;
  inputCurrency: string;
}
