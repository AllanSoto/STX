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
  // Check if AI is operational (e.g., API key is set)
  // This check is illustrative; actual isAiOperational might be in genkit.ts or elsewhere
  // For now, we assume it will proceed if GOOGLE_API_KEY is present.
  // if (!isAiOperational()) { // Assuming isAiOperational is available or this check is handled elsewhere
  //   console.warn('AI is not operational. Returning default trend analysis.');
  //   return {
  //     trend: 'sideways',
  //     confidence: 0,
  //     reason: 'AI features are currently unavailable.',
  //   };
  // }
  return analyzeCryptoTrendFlow(input);
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
  // Optional: Adjust model or safety settings if needed, though genkit.ts has defaults
  // model: 'googleai/gemini-1.5-flash-latest', // Or specific model if needed
  // config: {
  //   safetySettings: [ // Example safety settings if required
  //     { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  //   ],
  // },
});

const analyzeCryptoTrendFlow = ai.defineFlow(
  {
    name: 'analyzeCryptoTrendFlow',
    inputSchema: AnalyzeCryptoTrendInputSchema,
    outputSchema: AnalyzeCryptoTrendOutputSchema,
  },
  async input => {
    const {output} = await analyzeCryptoTrendPrompt(input);
    if (!output) {
        console.error("AI prompt did not return an output for analyzeCryptoTrendFlow.", input);
        // This is a critical point; if output is null/undefined, the Server Action will fail.
        // It indicates a problem with the prompt execution or the model's response.
        // To prevent the "unexpected server response", we must return a valid AnalyzeCryptoTrendOutput.
        return {
            trend: 'sideways',
            confidence: 0,
            reason: 'AI analysis failed to produce a result. Defaulting to sideways trend.',
        };
    }
    return output;
  }
);
