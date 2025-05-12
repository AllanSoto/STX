// src/ai/flows/analyze-crypto-trends.ts
'use server';
/**
 * @fileOverview Analyzes recent cryptocurrency price movements to indicate upward or downward trends.
 *
 * - analyzeCryptoTrend - A function that analyzes cryptocurrency trends.
 * - AnalyzeCryptoTrendInput - The input type for the analyzeCryptoTrend function.
 * - AnalyzeCryptoTrendOutput - The return type for the analyzeCryptoTrend function.
 */

import {ai, isAiOperational} from '@/ai/genkit'; // Added isAiOperational import
import {z} from 'zod';

const AnalyzeCryptoTrendInputSchema = z.object({
  cryptoSymbol: z.string().describe('The ticker symbol of the cryptocurrency (e.g., BTC, ETH).'),
  recentPriceData: z.string().describe('A string containing recent price data for the cryptocurrency, comma-separated, most recent price last.'),
});
export type AnalyzeCryptoTrendInput = z.infer<typeof AnalyzeCryptoTrendInputSchema>;

const AnalyzeCryptoTrendOutputSchema = z.object({
  trend: z.enum(['upward', 'downward', 'sideways']).describe('The trend of the cryptocurrency price movement.'),
  confidence: z.number().min(0).max(1).describe('A confidence score (0-1) indicating the reliability of the trend analysis.'),
  reason: z.string().describe('Explanation of why the model determined the trend.'),
});
export type AnalyzeCryptoTrendOutput = z.infer<typeof AnalyzeCryptoTrendOutputSchema>;

export async function analyzeCryptoTrend(input: AnalyzeCryptoTrendInput): Promise<AnalyzeCryptoTrendOutput> {
  if (!isAiOperational()) {
    console.warn("AI is not operational. analyzeCryptoTrend will return a default response. Input:", input);
    return {
      trend: 'sideways',
      confidence: 0,
      reason: 'AI system is not operational. Trend analysis unavailable.',
    };
  }
  
  try {
    return await analyzeCryptoTrendFlow(input);
  } catch (error) {
    // This catch block is a secondary safety net if analyzeCryptoTrendFlow itself throws
    // an unexpected error (though it's designed not to).
    console.error("Unexpected error in analyzeCryptoTrend server action wrapper. Input:", input, "Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Critical server-side AI error';
    return {
      trend: 'sideways',
      confidence: 0,
      reason: `AI system error: ${errorMessage}. Defaulting to sideways trend.`,
    };
  }
}

const analyzeCryptoTrendPrompt = ai.definePrompt({
  name: 'analyzeCryptoTrendPrompt',
  input: {schema: AnalyzeCryptoTrendInputSchema},
  output: {schema: AnalyzeCryptoTrendOutputSchema},
  prompt: `You are an expert cryptocurrency market analyst.
Your task is to analyze recent price movements for a given cryptocurrency and determine its short-term trend.
Use the provided recent price data to make your assessment. The data is a comma-separated string of prices, with the most recent price last.

Cryptocurrency Symbol: {{{cryptoSymbol}}}
Recent Price Data: {{{recentPriceData}}}

Based on this data, determine if the trend is 'upward', 'downward', or 'sideways'.
Also provide a confidence score (a number between 0 and 1) for your analysis, and a concise reason for your conclusion.
Ensure your output strictly adheres to the requested JSON schema.`,
});

const analyzeCryptoTrendFlow = ai.defineFlow(
  {
    name: 'analyzeCryptoTrendFlow',
    inputSchema: AnalyzeCryptoTrendInputSchema,
    outputSchema: AnalyzeCryptoTrendOutputSchema,
  },
  async (input: AnalyzeCryptoTrendInput): Promise<AnalyzeCryptoTrendOutput> => {
    try {
      const { output } = await analyzeCryptoTrendPrompt(input);
      if (!output) {
        console.warn("AI prompt returned a falsy output for analyzeCryptoTrendFlow. Input:", input);
        return {
          trend: 'sideways',
          confidence: 0,
          reason: 'AI analysis returned no data. Defaulting to sideways trend.',
        };
      }
      return output;
    } catch (error) {
      console.error("Error during analyzeCryptoTrendPrompt execution in analyzeCryptoTrendFlow. Input:", input, "Error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI error';
      return {
        trend: 'sideways',
        confidence: 0,
        reason: `AI analysis failed: ${errorMessage}. Defaulting to sideways trend.`,
      };
    }
  }
);
