
export const CRYPTO_SYMBOLS = [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'SHIB', 
    'LTC', 'LINK', 'DOT', 'BCH', 'UNI', 'AVAX', 'MATIC', 'TRX'
] as const;
export type CryptoSymbol = typeof CRYPTO_SYMBOLS[number];

// Dynamically generate trading pairs from the master list of symbols
const usdtQuotePairs = CRYPTO_SYMBOLS.map(symbol => `${symbol}/USDT`);

// Define a specific list of symbols that can be quoted against USDT
const usdtBaseAllowList: CryptoSymbol[] = ['BTC', 'ETH', 'BNB', 'XRP'];
const usdtBasePairs = usdtBaseAllowList.map(symbol => `USDT/${symbol}`);

// Combine and sort the pairs for a clean dropdown list
export const DETAILED_TRADING_PAIRS = [
  ...usdtQuotePairs,
  ...usdtBasePairs,
].sort();

export type DetailedTradingPair = (typeof DETAILED_TRADING_PAIRS)[number];


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

// Mapping for WebSocket, REST API symbols/IDs, and CoinGecko IDs
export const COIN_DATA: Record<CryptoSymbol, { binanceSymbol: string; coinGeckoId: string, coinCapId: string }> = {
  BTC: { binanceSymbol: 'BTCUSDT', coinGeckoId: 'bitcoin', coinCapId: 'bitcoin' },
  ETH: { binanceSymbol: 'ETHUSDT', coinGeckoId: 'ethereum', coinCapId: 'ethereum' },
  SOL: { binanceSymbol: 'SOLUSDT', coinGeckoId: 'solana', coinCapId: 'solana' },
  BNB: { binanceSymbol: 'BNBUSDT', coinGeckoId: 'binancecoin', coinCapId: 'binance-coin' },
  XRP: { binanceSymbol: 'XRPUSDT', coinGeckoId: 'ripple', coinCapId: 'xrp' },
  ADA: { binanceSymbol: 'ADAUSDT', coinGeckoId: 'cardano', coinCapId: 'cardano' },
  DOGE: { binanceSymbol: 'DOGEUSDT', coinGeckoId: 'dogecoin', coinCapId: 'dogecoin' },
  SHIB: { binanceSymbol: 'SHIBUSDT', coinGeckoId: 'shiba-inu', coinCapId: 'shiba-inu' },
  LTC: { binanceSymbol: 'LTCUSDT', coinGeckoId: 'litecoin', coinCapId: 'litecoin' },
  LINK: { binanceSymbol: 'LINKUSDT', coinGeckoId: 'chainlink', coinCapId: 'chainlink' },
  DOT: { binanceSymbol: 'DOTUSDT', coinGeckoId: 'polkadot', coinCapId: 'polkadot' },
  BCH: { binanceSymbol: 'BCHUSDT', coinGeckoId: 'bitcoin-cash', coinCapId: 'bitcoin-cash' },
  UNI: { binanceSymbol: 'UNIUSDT', coinGeckoId: 'uniswap', coinCapId: 'uniswap' },
  AVAX: { binanceSymbol: 'AVAXUSDT', coinGeckoId: 'avalanche-2', coinCapId: 'avalanche' },
  MATIC: { binanceSymbol: 'MATICUSDT', coinGeckoId: 'matic-network', coinCapId: 'polygon' },
  TRX: { binanceSymbol: 'TRXUSDT', coinGeckoId: 'tron', coinCapId: 'tron' },
};

// For CoinCap WebSocket, which uses IDs like 'bitcoin', 'ethereum'
export const COINCAP_ASSET_IDS = Object.values(COIN_DATA).map(data => data.coinCapId);
