// src/ai/flows/analyze-crypto-trends.ts
'use server';
/**
 * @fileOverview Analyzes recent cryptocurrency price movements to indicate upward or downward trends.
 *
 * - analyzeCryptoTrend - A function that analyzes cryptocurrency trends.
 * - AnalyzeCryptoTrendInput - The input type for the analyzeCryptoTrend function.
 * - AnalyzeCryptoTrendOutput - The return type for the analyzeCryptoTrend function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  return analyzeCryptoTrendFlow(input);
}

const analyzeCryptoTrendPrompt = ai.definePrompt({
  name: 'analyzeCryptoTrendPrompt',
  input: {schema: AnalyzeCryptoTrendInputSchema},
  output: {schema: AnalyzeCryptoTrendOutputSchema},
  prompt: `You are an AI assistant specializing in cryptocurrency trend analysis.

  Analyze the recent price movements of {{cryptoSymbol}} based on the following data and determine if the trend is upward, downward, or sideways.

  Recent Price Data: {{recentPriceData}}

  Consider factors such as price increases, decreases, volatility, and overall market conditions.

  Provide a confidence score (0-1) indicating the reliability of your trend analysis.
  Explain your reasoning for the determined trend.

  Ensure that the output is formatted according to the AnalyzeCryptoTrendOutputSchema.
  `,
   config: {
    // Adding safety settings to potentially mitigate some service issues if they are content-related,
    // though 503 is usually a service availability issue.
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
    try {
      const result = await analyzeCryptoTrendPrompt(input);
      if (!result || !result.output) {
        console.error(`analyzeCryptoTrendPrompt for ${input.cryptoSymbol} returned no output or undefined output. Result:`, result);
        return {
          trend: 'sideways',
          confidence: 0.1,
          reason: `AI analysis for ${input.cryptoSymbol} failed to produce a valid output.`,
        };
      }
      // Validate the output against the schema before returning
      const parsedOutput = AnalyzeCryptoTrendOutputSchema.safeParse(result.output);
      if (!parsedOutput.success) {
        console.error(`AI output for ${input.cryptoSymbol} did not match schema. Errors:`, parsedOutput.error.flatten());
        return {
          trend: 'sideways',
          confidence: 0.1,
          reason: `AI output for ${input.cryptoSymbol} was malformed.`,
        };
      }
      return parsedOutput.data;
    } catch (error) {
      console.error(`Error in analyzeCryptoTrendFlow for ${input.cryptoSymbol}:`, error);
      // Return a default/error state that matches the schema
      return {
        trend: 'sideways',
        confidence: 0.1,
        reason: `AI analysis failed for ${input.cryptoSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

