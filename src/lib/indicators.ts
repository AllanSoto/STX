import type { CandlestickData, Time, LineData } from 'lightweight-charts';

// Interface for RSI calculation input
interface RsiInput {
  close: number;
  time: Time;
}

/**
 * Calculates the Relative Strength Index (RSI) for a given set of financial data.
 * @param data An array of objects, each with a 'close' price and 'time'.
 * @param period The period for the RSI calculation, typically 14.
 * @returns An array of { time, value } objects for plotting.
 */
export function calculateRSI(data: RsiInput[], period: number = 14): LineData<Time>[] {
  if (data.length < period) {
    return [];
  }

  const rsiData: LineData<Time>[] = [];
  let gains = 0;
  let losses = 0;

  // Calculate the first average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses -= change; // losses are stored as positive values
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate the first RSI
  let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  
  if (isFinite(rsi)) {
      rsiData.push({ time: data[period].time, value: rsi });
  }


  // Calculate subsequent RSI values using Wilder's smoothing
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    let currentGain = 0;
    let currentLoss = 0;

    if (change > 0) {
      currentGain = change;
    } else {
      currentLoss = -change;
    }

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    
    rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));

    // Guard against NaN values if avgLoss is 0 for an extended period
    if (isFinite(rsi)) {
        rsiData.push({ time: data[i].time, value: rsi });
    }
  }

  return rsiData;
}
