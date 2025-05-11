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
  recentPriceData: z.string().describe('A string containing recent price data for the cryptocurrency.'),
});
export type AnalyzeCryptoTrendInput = z.infer<typeof AnalyzeCryptoTrendInputSchema>;

const AnalyzeCryptoTrendOutputSchema = z.object({
  trend: z.enum(['upward', 'downward', 'sideways']).describe('The trend of the cryptocurrency price movement.'),
  confidence: z.number().min(0).max(1).describe('A confidence score (0-1) indicating the reliability of the trend analysis.'),
  reason: z.string().describe('Explanation of why the model determined the trend.'),
});
export type AnalyzeCryptoTrendOutput = z.infer<typeof AnalyzeCryptoTrendOutputSchema>;

export async function analyzeCryptoTrend(input: AnalyzeCryptoTrendInput): Promise<AnalyzeCryptoTrendOutput> {
  try {
    const result = await analyzeCryptoTrendFlow(input);
    // Defensive check to ensure the result is a valid AnalyzeCryptoTrendOutput object
    if (
      typeof result === 'object' &&
      result !== null &&
      'trend' in result &&
      typeof result.trend === 'string' &&
      ['upward', 'downward', 'sideways'].includes(result.trend) &&
      'confidence' in result &&
      typeof result.confidence === 'number' &&
      'reason' in result &&
      typeof result.reason === 'string'
    ) {
      return result as AnalyzeCryptoTrendOutput;
    } else {
      console.error(
        `analyzeCryptoTrendFlow returned an unexpected shape for ${input.cryptoSymbol}:`,
        result
      );
      return {
        trend: 'sideways',
        confidence: 0,
        reason: `Internal error: AI flow for ${input.cryptoSymbol} returned an unexpected data shape. Check server logs.`,
      };
    }
  } catch (error: any) {
    console.error(`Critical error in analyzeCryptoTrend wrapper for ${input.cryptoSymbol}:`, error);
    const failureReason = error instanceof Error ? error.name : 'UnknownError';
    return {
      trend: 'sideways',
      confidence: 0,
      reason: `Analysis for ${input.cryptoSymbol} failed due to ${failureReason}. Check server logs for details.`,
    };
  }
}

const analyzeCryptoTrendPrompt = ai.definePrompt({
  name: 'analyzeCryptoTrendPrompt',
  input: {schema: AnalyzeCryptoTrendInputSchema},
  output: {schema: AnalyzeCryptoTrendOutputSchema},
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are an AI assistant specializing in cryptocurrency trend analysis.

  Analyze the recent price movements of {{cryptoSymbol}} based on the following data and determine if the trend is upward, downward, or sideways.

  Recent Price Data: {{recentPriceData}}

  Consider factors such as price increases, decreases, volatility, and overall market conditions.

  Provide a confidence score (0-1) indicating the reliability of your trend analysis.
  Explain your reasoning for the determined trend.

  Ensure that the output is formatted according to the AnalyzeCryptoTrendOutputSchema.
  `,
   config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
});

const analyzeCryptoTrendFlow = ai.defineFlow(
  {
    name: 'analyzeCryptoTrendFlow',
    inputSchema: AnalyzeCryptoTrendInputSchema,
    outputSchema: AnalyzeCryptoTrendOutputSchema,
  },
  async (input): Promise<AnalyzeCryptoTrendOutput> => {
    if (!isAiOperational()) {
      console.warn(`AI is not operational. Returning default for ${input.cryptoSymbol}. This may be due to a missing GOOGLE_API_KEY or plugin initialization failure.`);
      return {
        trend: 'sideways',
        confidence: 0,
        reason: `AI service is not operational for ${input.cryptoSymbol}. Check server logs for GOOGLE_API_KEY and plugin status.`,
      };
    }

    try {
      const result = await analyzeCryptoTrendPrompt(input);
      if (!result || !result.output) {
        console.error(`analyzeCryptoTrendPrompt for ${input.cryptoSymbol} returned no output or undefined output. Result:`, result);
        return {
          trend: 'sideways',
          confidence: 0,
          reason: `AI analysis for ${input.cryptoSymbol} returned no output.`,
        };
      }
      
      const parsedOutput = AnalyzeCryptoTrendOutputSchema.safeParse(result.output);
      if (!parsedOutput.success) {
        console.error(`AI output for ${input.cryptoSymbol} did not match schema. Errors:`, parsedOutput.error.flatten());
        return {
          trend: 'sideways',
          confidence: 0,
          reason: `AI output for ${input.cryptoSymbol} was malformed. Check server logs. Details: ${parsedOutput.error.message}`,
        };
      }
      return parsedOutput.data;
    } catch (error) {
      console.error(`Error during AI flow execution for ${input.cryptoSymbol}:`, error);
      const failureType = error instanceof Error ? error.name : 'GenkitFlowError';
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        trend: 'sideways',
        confidence: 0,
        reason: `AI flow for ${input.cryptoSymbol} encountered an error: ${failureType}. Message: ${errorMessage}. Check server logs.`,
      };
    }
  }
);
