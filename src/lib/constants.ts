export const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'] as const;
export type CryptoSymbol = typeof CRYPTO_SYMBOLS[number];

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
