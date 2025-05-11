export const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'SHIB'] as const;
export type CryptoSymbol = typeof CRYPTO_SYMBOLS[number];

export const DETAILED_TRADING_PAIRS = [
  // USDT as quote
  'BTC/USDT',
  'ETH/USDT',
  'BNB/USDT',
  'SOL/USDT',
  'ADA/USDT',
  'XRP/USDT',
  'DOGE/USDT',
  'SHIB/USDT',
  // USDT as base
  'USDT/BTC',
  'USDT/ETH',
  'USDT/BNB',
  // Add more pairs here if needed. This list can be fetched from Firebase in the future.
] as const;

export type DetailedTradingPair = typeof DETAILED_TRADING_PAIRS[number];


export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'zh', name: '中文' },
];

export const APP_NAME = 'SimulTradex';
export const COMMISSION_RATE = 0.001; // 0.1%
export const QUOTE_CURRENCY = 'USDT'; // Standard quote currency for pairs
export const STABLECOIN_SYMBOLS = ['USDT'] as const; // Add other stablecoins if needed
export type StableCoinSymbol = typeof STABLECOIN_SYMBOLS[number];
