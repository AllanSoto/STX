// src/ai/flows/analyze-crypto-trends.ts
'use server';
/**
 * @fileOverview Analyzes recent cryptocurrency price movements to indicate upward or downward trends.
 *
 * - analyzeCryptoTrend - A function that analyzes cryptocurrency trends.
 * - AnalyzeCryptoTrendInput - The input type for the analyzeCryptoTrend function.
 * - AnalyzeCryptoTrendOutput - The return type for the analyzeCryptoTrend function.
 */

import {ai, isAiOperational} from '@/ai/genkit';
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

export async function analyzeCryptoTrend(
  input: AnalyzeCryptoTrendInput
): Promise<AnalyzeCryptoTrendOutput> {
  try {
    if (!isAiOperational()) {
      console.warn(
        'AI is not operational. analyzeCryptoTrend will return a default response. Input:',
        input
      );
      return {
        trend: 'sideways',
        confidence: 0,
        reason: 'AI system is not operational. Trend analysis unavailable.',
      };
    }

    const result = await analyzeCryptoTrendFlow(input);

    // Defensive check for output structure, though Genkit flow outputSchema should handle this.
    if (
      !result || // Check if result itself is falsy
      typeof result.trend !== 'string' ||
      typeof result.confidence !== 'number' ||
      typeof result.reason !== 'string' ||
      !['upward', 'downward', 'sideways'].includes(result.trend)
    ) {
      console.error(
        'analyzeCryptoTrendFlow returned malformed or falsy output:',
        result,
        'Input:',
        input
      );
      return {
        trend: 'sideways',
        confidence: 0,
        reason:
          'AI analysis returned an unexpected data structure. Defaulting to sideways trend.',
      };
    }
    return result;

  } catch (error: unknown) {
    console.error(
      'Critical unhandled error in analyzeCryptoTrend Server Action. Input:',
      input,
      'Error:',
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'A critical server error occurred during AI trend analysis.';
    // Return a default serializable object to prevent "An unexpected response" on client
    return {
      trend: 'sideways',
      confidence: 0,
      reason: `Critical AI system error: ${errorMessage}. Defaulting to sideways trend.`,
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
      // Ensure the output matches the schema before returning
      const parsedOutput = AnalyzeCryptoTrendOutputSchema.safeParse(output);
      if (!parsedOutput.success) {
        console.error("AI prompt output failed Zod validation for analyzeCryptoTrendFlow. Output:", output, "Errors:", parsedOutput.error, "Input:", input);
        return {
          trend: 'sideways',
          confidence: 0,
          reason: `AI analysis output format error: ${parsedOutput.error.message}. Defaulting to sideways trend.`,
        };
      }
      return parsedOutput.data;
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
