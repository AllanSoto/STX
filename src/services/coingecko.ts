// src/services/coingecko.ts
'use server';

import type { CryptoSymbol } from '@/lib/constants';
import { COIN_DATA } from '@/lib/constants';

const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';

/**
 * Fetches historical price data for a given cryptocurrency from CoinGecko.
 * @param cryptoSymbol The symbol of the cryptocurrency (e.g., BTC, ETH).
 * @param days The number of days of historical data to fetch (e.g., 7 for last week).
 * @returns A promise that resolves to a comma-separated string of recent prices, or an empty string on error.
 */
export async function fetchCoinGeckoHistoricalPrices(
  cryptoSymbol: CryptoSymbol,
  days: number = 7
): Promise<string> {
  const coinData = COIN_DATA[cryptoSymbol];
  if (!coinData || !coinData.coinGeckoId) {
    console.error(`CoinGecko ID not found for symbol: ${cryptoSymbol}`);
    return '';
  }

  const coinId = coinData.coinGeckoId;
  const url = `${COINGECKO_API_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Error fetching historical data from CoinGecko for ${coinId} (Status: ${response.status}): ${errorData}`);
      return '';
    }

    const data = await response.json();

    if (data && data.prices && Array.isArray(data.prices)) {
      // CoinGecko returns prices as [timestamp, price]
      // We need only the prices, and the AI flow expects most recent price last.
      // CoinGecko data is typically ordered oldest to newest.
      const prices = data.prices.map((priceEntry: [number, number]) => 
        priceEntry[1].toFixed(Math.max(2, (priceEntry[1] < 1 ? 5 : 2))) // Format price
      );
      return prices.join(',');
    } else {
      console.error(`Unexpected data format from CoinGecko for ${coinId}:`, data);
      return '';
    }
  } catch (error) {
    console.error(`Network or other error fetching historical data from CoinGecko for ${coinId}:`, error);
    return '';
  }
}
