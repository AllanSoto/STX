
import type { CryptoSymbol } from './constants';

export interface User {
  uid: string; 
  email: string | null; 
  displayName?: string | null; 
  createdAt?: any; // Can be Firestore Timestamp or Date, handle accordingly
}

export type UserEstado = 'activo' | 'inactivo' | 'bloqueado';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  password_hash?: string; // Optional on client
  telefono?: string | null;
  estado: UserEstado;
  fecha_creacion: string; // Will be a string from DB
  fecha_actualizacion: string; // Will be a string from DB
  id_rol: number;
  intentos_fallidos: number;
  bloqueado_hasta?: string | null; // Will be a string from DB
  username: string;
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
  userId: string; 
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
